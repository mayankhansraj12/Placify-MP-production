"""
RAG service using ChromaDB (local, free) + sentence-transformers (local, free).
No API keys needed. Embeds and queries a curated knowledge base for
interview questions, prep resources, company profiles, and resume tips.
"""
import os
import json
import logging
from pathlib import Path

logger = logging.getLogger("placify.rag")

# ── Paths ─────────────────────────────────────────────────────────
_BASE_DIR = Path(__file__).resolve().parent.parent
_KB_DIR = _BASE_DIR / "data" / "knowledge"
_VECTOR_DIR = _BASE_DIR / "data" / "vectorstore"

# ── Lazy-loaded singletons ────────────────────────────────────────
_embed_model = None
_chroma_client = None
_initialized = False


def _get_embed_model():
    """Load the embedding model (80MB, runs on CPU)."""
    global _embed_model
    if _embed_model is None:
        try:
            from sentence_transformers import SentenceTransformer
            _embed_model = SentenceTransformer("all-MiniLM-L6-v2")
            logger.info("Embedding model loaded: all-MiniLM-L6-v2")
        except ImportError:
            logger.warning("sentence-transformers not installed, RAG disabled")
            return None
        except Exception as e:
            logger.warning("Embedding model load failed: %s", e)
            return None
    return _embed_model


def _get_chroma():
    """Get or create the ChromaDB persistent client."""
    global _chroma_client
    if _chroma_client is None:
        try:
            import chromadb
            _VECTOR_DIR.mkdir(parents=True, exist_ok=True)
            _chroma_client = chromadb.PersistentClient(path=str(_VECTOR_DIR))
            logger.info("ChromaDB initialized at %s", _VECTOR_DIR)
        except ImportError:
            logger.warning("chromadb not installed, RAG disabled")
            return None
        except Exception as e:
            logger.warning("ChromaDB init failed: %s", e)
            return None
    return _chroma_client


# ── Index Building ────────────────────────────────────────────────

def build_index(collection_name: str, documents: list[dict], text_key: str) -> int:
    """
    One-time: Embed documents and store in ChromaDB.
    Returns number of documents indexed, or 0 on failure.
    """
    model = _get_embed_model()
    client = _get_chroma()
    if not model or not client:
        return 0

    # Delete existing collection if any (for rebuild)
    try:
        client.delete_collection(collection_name)
    except Exception:
        pass

    collection = client.create_collection(
        name=collection_name,
        metadata={"hnsw:space": "cosine"}
    )

    texts = [doc[text_key] for doc in documents]
    embeddings = model.encode(texts).tolist()

    # Prepare metadata (flatten lists to strings for ChromaDB)
    metadatas = []
    for doc in documents:
        meta = {}
        for k, v in doc.items():
            if k == text_key:
                continue
            if isinstance(v, (list, dict)):
                meta[k] = json.dumps(v)
            else:
                meta[k] = str(v)
        metadatas.append(meta)

    # ChromaDB has a batch limit, insert in chunks of 100
    batch_size = 100
    for i in range(0, len(documents), batch_size):
        end = min(i + batch_size, len(documents))
        collection.add(
            ids=[f"{collection_name}_{j}" for j in range(i, end)],
            embeddings=embeddings[i:end],
            documents=texts[i:end],
            metadatas=metadatas[i:end]
        )

    logger.info("Indexed %d documents into '%s'", len(documents), collection_name)
    return len(documents)


def build_all_indexes() -> dict:
    """Build all knowledge base indexes from JSON files. Returns counts."""
    results = {}

    index_configs = [
        ("interview_questions", "interview_questions.json", "question"),
        ("prep_resources", "prep_resources.json", "description"),
        ("company_profiles", "company_profiles.json", "tips"),
        ("resume_tips", "resume_tips.json", "tip"),
    ]

    for col_name, filename, text_key in index_configs:
        filepath = _KB_DIR / filename
        if not filepath.exists():
            logger.warning("KB file not found: %s", filepath)
            results[col_name] = 0
            continue

        with open(filepath, "r", encoding="utf-8") as f:
            documents = json.load(f)

        results[col_name] = build_index(col_name, documents, text_key)

    return results


# ── Query Functions ───────────────────────────────────────────────

def _query(collection_name: str, query_text: str, n_results: int = 5) -> list[dict]:
    """Low-level query against a ChromaDB collection."""
    model = _get_embed_model()
    client = _get_chroma()
    if not model or not client:
        return []

    try:
        collection = client.get_collection(collection_name)
    except Exception:
        logger.debug("Collection '%s' not found", collection_name)
        return []

    q_embedding = model.encode([query_text]).tolist()
    results = collection.query(
        query_embeddings=q_embedding,
        n_results=min(n_results, collection.count() or 1)
    )

    if not results["documents"] or not results["documents"][0]:
        return []

    return [
        {
            "text": doc,
            "metadata": meta,
            "score": round(1 - dist, 3)  # cosine similarity (1 = perfect match)
        }
        for doc, meta, dist in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0]
        )
    ]


# ── Specialized Query Functions ───────────────────────────────────

def get_interview_questions(predicted_role: str, weak_skills: list[str],
                            n: int = 8) -> list[dict]:
    """Get interview questions matched to user's role + weak areas."""
    query_text = f"Interview questions for {predicted_role} focusing on {', '.join(weak_skills)}"
    results = _query("interview_questions", query_text, n_results=n)

    # Parse JSON-encoded list fields in metadata
    for r in results:
        for key in ("role", "skills"):
            if key in r["metadata"] and isinstance(r["metadata"][key], str):
                try:
                    r["metadata"][key] = json.loads(r["metadata"][key])
                except json.JSONDecodeError:
                    pass
    return results


def get_prep_resources(skill_name: str, current_score: float,
                       target_role: str, n: int = 5) -> list[dict]:
    """Get learning resources matched to a specific skill gap."""
    level = "beginner" if current_score < 40 else "intermediate" if current_score < 70 else "advanced"
    query_text = f"Learn {skill_name} for {target_role}, {level} level student needs to improve"
    results = _query("prep_resources", query_text, n_results=n)

    for r in results:
        if "skills" in r["metadata"] and isinstance(r["metadata"]["skills"], str):
            try:
                r["metadata"]["skills"] = json.loads(r["metadata"]["skills"])
            except json.JSONDecodeError:
                pass
    return results


def get_ats_tips(resume_text: str, predicted_role: str, n: int = 5) -> list[dict]:
    """Get ATS improvement tips relevant to this resume."""
    # Use a summary of the resume as the query
    query_text = f"ATS resume tips for {predicted_role}: {resume_text[:300]}"
    return _query("resume_tips", query_text, n_results=n)


def get_company_insights(tier: str, role: str, n: int = 6) -> list[dict]:
    """Get company profiles matching tier and role."""
    query_text = f"Companies hiring {role} at {tier} tier, interview process and preparation"
    results = _query("company_profiles", query_text, n_results=n)

    for r in results:
        if "roles_hiring" in r["metadata"] and isinstance(r["metadata"]["roles_hiring"], str):
            try:
                r["metadata"]["roles_hiring"] = json.loads(r["metadata"]["roles_hiring"])
            except json.JSONDecodeError:
                pass
    return results


def is_available() -> bool:
    """Check if RAG system is ready (dependencies installed + index built)."""
    if os.getenv("ENABLE_RAG", "true").lower() != "true":
        return False

    model = _get_embed_model()
    client = _get_chroma()
    if not model or not client:
        return False

    # Check if at least one collection exists
    try:
        collections = client.list_collections()
        return len(collections) > 0
    except Exception:
        return False
