"""
Placify AI — Mock Interview Chat Routes (F6)
RAG-powered question selection + LLM interviewer for interactive practice.
Sessions are persisted in SQLite so they survive server restarts.
"""

import json
import logging
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

try:
    from ..auth import get_current_user
    from ..database import get_db
except ImportError:
    from auth import get_current_user
    from database import get_db

try:
    from services import llm_service
except ImportError:
    llm_service = None

try:
    from services import rag_service
except ImportError:
    rag_service = None

router = APIRouter(prefix="/api/interview", tags=["interview"])
logger = logging.getLogger("placify.interview")


# ── Database Setup ───────────────────────────────────────────────────────────

def _ensure_interview_tables():
    """Create interview tables if they don't exist."""
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS interview_sessions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            role TEXT NOT NULL,
            difficulty TEXT NOT NULL,
            questions TEXT NOT NULL,
            current_index INTEGER DEFAULT 0,
            answers TEXT DEFAULT '[]',
            evaluations TEXT DEFAULT '[]',
            status TEXT DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_interview_sessions_user_id ON interview_sessions(user_id)")
    conn.commit()
    conn.close()


# Initialize tables on import
try:
    _ensure_interview_tables()
except Exception:
    pass  # DB might not be ready yet; will retry on first request


# ── Session DB helpers ───────────────────────────────────────────────────────

def _save_session(session: dict) -> None:
    """Persist a session dict to SQLite."""
    conn = get_db()
    conn.execute("""
        INSERT OR REPLACE INTO interview_sessions
            (id, user_id, role, difficulty, questions, current_index, answers, evaluations, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        session["id"],
        session["user_id"],
        session["role"],
        session["difficulty"],
        json.dumps(session["questions"]),
        session["current_index"],
        json.dumps(session["answers"]),
        json.dumps(session["evaluations"]),
        session["status"],
    ))
    conn.commit()
    conn.close()


def _load_session(session_id: str) -> Optional[dict]:
    """Load a session from SQLite. Returns None if not found."""
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM interview_sessions WHERE id = ?", (session_id,)
    ).fetchone()
    conn.close()
    if not row:
        return None
    return {
        "id": row["id"],
        "user_id": row["user_id"],
        "role": row["role"],
        "difficulty": row["difficulty"],
        "questions": json.loads(row["questions"]),
        "current_index": row["current_index"],
        "answers": json.loads(row["answers"]),
        "evaluations": json.loads(row["evaluations"]),
        "status": row["status"],
    }


# ── Pydantic Models ─────────────────────────────────────────────────────────

class StartRequest(BaseModel):
    role: str = Field(default="Software Developer", min_length=2, max_length=80)
    difficulty: str = Field(default="medium", pattern="^(easy|medium|hard)$")
    focus_skills: list[str] = Field(default_factory=list, max_length=10)


class AnswerRequest(BaseModel):
    session_id: str
    answer: str = Field(min_length=1, max_length=5000)


class NextRequest(BaseModel):
    session_id: str


# ── Helpers ──────────────────────────────────────────────────────────────────

def _pick_questions(role: str, difficulty: str, focus_skills: list[str], count: int = 5) -> list[dict]:
    """Use RAG to select role-appropriate questions, with static fallback."""
    questions = []

    if rag_service:
        try:
            query = f"{role} {difficulty} {' '.join(focus_skills)}"
            results = rag_service.get_interview_questions(role, focus_skills or [role], n=count * 2)
            for r in results:
                meta = r.get("metadata", r) if isinstance(r, dict) else {}
                q = {
                    "question": meta.get("question", r.get("question", "")),
                    "difficulty": meta.get("difficulty", difficulty),
                    "tip": meta.get("tip", ""),
                    "skills": meta.get("skills", []),
                }
                if q["question"] and q not in questions:
                    questions.append(q)
                if len(questions) >= count:
                    break
        except Exception as e:
            logger.debug("rag_question_fetch_error: %s", str(e)[:100])

    # Static fallback
    if len(questions) < count:
        fallback = [
            {"question": "Tell me about yourself and why you're interested in this role.",
             "difficulty": "easy", "tip": "Keep it 2 minutes. Past → Present → Future format.", "skills": []},
            {"question": "Describe a challenging project you worked on. What was your role?",
             "difficulty": "medium", "tip": "Use STAR method. Quantify the impact.", "skills": []},
            {"question": "How would you design a URL shortening service?",
             "difficulty": "hard", "tip": "Cover: hashing, DB choice, caching, read-heavy optimization.", "skills": ["dsa_score"]},
            {"question": "What is your biggest technical weakness and how are you improving?",
             "difficulty": "easy", "tip": "Be genuine. Show self-awareness and growth mindset.", "skills": []},
            {"question": "Explain the difference between REST and GraphQL APIs.",
             "difficulty": "medium", "tip": "Cover trade-offs: over-fetching, schema typing, caching.", "skills": ["web_dev_score"]},
        ]
        for fb in fallback:
            if len(questions) < count and fb not in questions:
                questions.append(fb)

    return questions[:count]


async def _evaluate_answer(question: dict, answer: str, role: str) -> dict:
    """Use LLM to evaluate the student's answer against the expected approach."""
    if not llm_service or not llm_service.is_available():
        return {
            "score": 5,
            "feedback": "AI evaluation is not available. Review your answer against the hint provided.",
            "strengths": [],
            "improvements": [],
        }

    try:
        result = await llm_service.generate_json(
            prompt=f"""You are a senior {role} interviewer evaluating a candidate's answer.

Question: {question['question']}
Expected approach / key points: {question.get('tip', 'N/A')}
Candidate's answer: {answer[:2000]}

Rate the answer and return JSON:
{{
  "score": <1-10 integer>,
  "feedback": "<2-3 sentence constructive evaluation using concise Markdown when helpful>",
  "strengths": ["<what they did well; Markdown is allowed>", ...],
  "improvements": ["<what they missed or could improve; Markdown is allowed>", ...]
}}

Be encouraging but honest. Reference specific parts of their answer. Use Markdown principles in string values, but return valid JSON only with no code fences.""",
            system=f"You are a senior {role} interviewer at a top tech company. Be constructive and specific."
        )
        if result and "score" in result:
            return result
    except Exception as e:
        logger.debug("evaluate_error: %s", str(e)[:100])

    return {"score": 5, "feedback": "Could not evaluate. Please try again.", "strengths": [], "improvements": []}


async def _generate_followup(question: dict, answer: str, role: str) -> Optional[str]:
    """Generate a follow-up question based on the answer."""
    if not llm_service or not llm_service.is_available():
        return None

    try:
        followup = await llm_service.generate(
            prompt=f"""Based on this interview exchange, generate ONE short follow-up question.

Original question: {question['question']}
Candidate's answer: {answer[:1500]}

The follow-up should probe deeper into something they mentioned or test a gap.
Return ONLY the follow-up question, nothing else. Keep it under 30 words.""",
            system=f"Senior {role} interviewer. Ask probing follow-ups."
        )
        return followup.strip() if followup else None
    except Exception:
        return None


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/start")
async def start_interview(req: StartRequest, current_user: dict = Depends(get_current_user)):
    """Start a new mock interview session."""
    session_id = str(uuid.uuid4())
    questions = _pick_questions(req.role, req.difficulty, req.focus_skills)

    session = {
        "id": session_id,
        "user_id": current_user["id"],
        "role": req.role,
        "difficulty": req.difficulty,
        "questions": questions,
        "current_index": 0,
        "answers": [],
        "evaluations": [],
        "status": "active",
    }
    _save_session(session)

    logger.info("interview_start session=%s user=%s role=%s questions=%d",
                session_id, current_user["id"], req.role, len(questions))

    return {
        "session_id": session_id,
        "total_questions": len(questions),
        "role": req.role,
        "difficulty": req.difficulty,
        "current_question": questions[0] if questions else None,
        "question_number": 1,
    }


@router.post("/answer")
async def submit_answer(req: AnswerRequest, current_user: dict = Depends(get_current_user)):
    """Submit an answer and get AI evaluation."""
    session = _load_session(req.session_id)
    if not session or session["user_id"] != current_user["id"]:
        raise HTTPException(404, "Session not found")
    if session["status"] != "active":
        raise HTTPException(400, "Interview session has ended")

    idx = session["current_index"]
    if idx >= len(session["questions"]):
        raise HTTPException(400, "All questions have been answered")

    question = session["questions"][idx]
    evaluation = await _evaluate_answer(question, req.answer, session["role"])
    followup = await _generate_followup(question, req.answer, session["role"])

    session["answers"].append(req.answer)
    session["evaluations"].append(evaluation)
    session["current_index"] += 1

    is_complete = session["current_index"] >= len(session["questions"])
    if is_complete:
        session["status"] = "complete"

    _save_session(session)

    return {
        "evaluation": evaluation,
        "followup_question": followup,
        "is_complete": is_complete,
        "question_number": idx + 1,
        "total_questions": len(session["questions"]),
    }


@router.post("/next")
async def next_question(req: NextRequest, current_user: dict = Depends(get_current_user)):
    """Get the next question in the session."""
    session = _load_session(req.session_id)
    if not session or session["user_id"] != current_user["id"]:
        raise HTTPException(404, "Session not found")

    idx = session["current_index"]
    if idx >= len(session["questions"]):
        return {"is_complete": True, "current_question": None}

    return {
        "current_question": session["questions"][idx],
        "question_number": idx + 1,
        "total_questions": len(session["questions"]),
        "is_complete": False,
    }


@router.get("/summary/{session_id}")
async def get_summary(session_id: str, current_user: dict = Depends(get_current_user)):
    """Get the full interview summary with scores."""
    session = _load_session(session_id)
    if not session or session["user_id"] != current_user["id"]:
        raise HTTPException(404, "Session not found")

    scores = [e.get("score", 0) for e in session["evaluations"]]
    avg_score = round(sum(scores) / len(scores), 1) if scores else 0

    # Generate overall summary with LLM
    overall_feedback = None
    if llm_service and llm_service.is_available() and session["evaluations"]:
        try:
            summary_text = "\n".join(
                f"Q{i+1} ({session['questions'][i]['difficulty']}): scored {e.get('score', '?')}/10"
                for i, e in enumerate(session["evaluations"])
            )
            overall_feedback = await llm_service.generate(
                prompt=f"""Summarize this mock interview performance for a {session['role']} role:

{summary_text}
Average score: {avg_score}/10

Write Markdown with:
- **Overall:** 1 sentence
- **Top strength:** 1 sentence
- **Improve next:** 1 sentence
Keep it under 100 words. Be encouraging. Do not use code fences or raw HTML.""",
                system="Placement mentor giving post-interview feedback."
            )
        except Exception:
            pass

    return {
        "session_id": session_id,
        "role": session["role"],
        "total_questions": len(session["questions"]),
        "answered": len(session["answers"]),
        "average_score": avg_score,
        "evaluations": [
            {
                "question": session["questions"][i]["question"],
                "difficulty": session["questions"][i]["difficulty"],
                **e,
            }
            for i, e in enumerate(session["evaluations"])
        ],
        "overall_feedback": overall_feedback,
        "status": session["status"],
    }


@router.get("/status")
def interview_status():
    """Check if mock interview is available."""
    has_llm = bool(llm_service and llm_service.is_available())
    has_rag = bool(rag_service)
    return {
        "available": True,  # Works with fallbacks even without LLM/RAG
        "ai_evaluation": has_llm,
        "smart_questions": has_rag,
        "message": "Full AI interview" if (has_llm and has_rag)
                   else "Basic interview (configure API keys for AI evaluation)"
    }
