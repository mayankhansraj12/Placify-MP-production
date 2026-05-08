"""
Placify AI - Resume Parser
Extracts text from PDF resumes and derives skill scores using NLTK.
"""

import asyncio
import io
import re

import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from nltk.tokenize import wordpunct_tokenize
from PyPDF2 import PdfReader

NLTK_RESOURCES = {
    "wordnet": "corpora/wordnet",
    "stopwords": "corpora/stopwords",
}
NLTK_READY = False

FALLBACK_STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has",
    "he", "in", "is", "it", "its", "of", "on", "or", "that", "the", "to",
    "was", "were", "will", "with",
}

SKILL_KEYWORDS = {
    "python_score": {
        "high": ["python", "django", "flask", "fastapi", "pandas", "numpy", "scipy", "matplotlib", "seaborn", "pytorch", "tensorflow", "keras", "scikit-learn", "jupyter"],
        "medium": ["pip", "virtualenv", "conda", "pycharm", "python3"],
    },
    "java_score": {
        "high": ["java", "spring", "spring boot", "hibernate", "maven", "gradle", "jpa", "junit", "servlet", "jdk"],
        "medium": ["tomcat", "jdbc", "java8", "java11", "java17"],
    },
    "cpp_score": {
        "high": ["c++", "cpp", "stl", "competitive programming", "data structure"],
        "medium": ["c language", "pointer", "memory management", "oop"],
    },
    "javascript_score": {
        "high": ["javascript", "typescript", "react", "reactjs", "react.js", "angular", "vue", "vuejs", "node.js", "nodejs", "express", "next.js", "nextjs"],
        "medium": ["jquery", "dom", "ajax", "webpack", "babel", "npm", "yarn", "es6"],
    },
    "ml_skills": {
        "high": ["machine learning", "deep learning", "neural network", "nlp", "natural language processing", "computer vision", "reinforcement learning", "cnn", "rnn", "lstm", "transformer", "gpt", "bert", "generative ai", "llm"],
        "medium": ["classification", "regression", "clustering", "supervised learning", "unsupervised learning", "feature engineering", "model training"],
    },
    "web_dev_score": {
        "high": ["html", "css", "react", "angular", "vue", "frontend", "front-end", "backend", "back-end", "full-stack", "fullstack", "responsive design", "restful api", "rest api", "graphql"],
        "medium": ["bootstrap", "tailwind", "sass", "less", "figma", "ui", "ux", "web development"],
    },
    "dsa_score": {
        "high": ["data structures", "algorithm", "leetcode", "hackerrank", "codeforces", "codechef", "competitive programming", "dynamic programming", "binary search", "graph algorithm"],
        "medium": ["array", "linked list", "tree", "sorting", "searching", "recursion", "stack", "queue", "heap", "hash map"],
    },
    "cloud_score": {
        "high": ["aws", "azure", "gcp", "google cloud", "docker", "kubernetes", "k8s", "terraform", "ansible", "jenkins", "ci", "cd", "devops"],
        "medium": ["cloud computing", "microservices", "serverless", "lambda", "ec2", "s3", "linux", "nginx"],
    },
    "data_analytics_score": {
        "high": ["data analysis", "data analytics", "data visualization", "tableau", "power bi", "excel", "sql", "bigquery", "etl", "data warehouse"],
        "medium": ["statistics", "hypothesis testing", "reporting", "dashboard", "business intelligence"],
    },
    "database_score": {
        "high": ["mysql", "postgresql", "mongodb", "redis", "firebase", "database", "sql server", "oracle", "cassandra", "dynamodb"],
        "medium": ["nosql", "database design", "normalization", "indexing", "query optimization", "stored procedure"],
    },
}

SKILL_ALIASES = {
    "ml": "machine learning",
    "ai": "artificial intelligence",
    "nlp": "natural language processing",
    "cv": "computer vision",
    "dl": "deep learning",
    "js": "javascript",
    "ts": "typescript",
    "node": "nodejs",
    "k8s": "kubernetes",
    "ci/cd": "ci cd",
}


def ensure_nltk_resources():
    """Best-effort load/download for optional NLTK corpora."""
    global NLTK_READY
    if NLTK_READY:
        return

    for package, resource_path in NLTK_RESOURCES.items():
        try:
            nltk.data.find(resource_path)
        except (LookupError, OSError):
            try:
                nltk.download(package, quiet=True, raise_on_error=False)
            except Exception:
                pass

    NLTK_READY = True


def get_stop_words() -> set[str]:
    try:
        ensure_nltk_resources()
        return set(stopwords.words("english"))
    except Exception:
        return FALLBACK_STOPWORDS


def safe_lemmatize(lemmatizer: WordNetLemmatizer, token: str) -> str:
    try:
        return lemmatizer.lemmatize(token)
    except Exception:
        return token


def _pypdf2_extract(file_content: bytes) -> str:
    """Extract text from PDF bytes using PyPDF2."""
    try:
        reader = PdfReader(io.BytesIO(file_content))
        pages = []
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                pages.append(page_text)
        return "\n".join(pages).strip()
    except Exception as exc:
        raise ValueError(f"Failed to parse PDF: {str(exc)}") from exc


async def extract_text_from_pdf(file_content: bytes) -> str:
    """Extract text from PDF bytes. Falls back to Gemini Vision for scanned PDFs (F5)."""
    # Step 1: Try PyPDF2 first (fast, free, no API)
    try:
        text = _pypdf2_extract(file_content)
        if len(text.strip()) >= 50:
            return text
    except ValueError:
        pass  # PyPDF2 failed entirely, try vision below

    # Step 2: PyPDF2 returned too little text — try Gemini Vision (free tier)
    try:
        from services import llm_service
        vision_text = await llm_service.extract_with_vision(file_content)
        if vision_text and len(vision_text.strip()) >= 50:
            import logging
            logging.getLogger("placify.resume").info(
                "vision_extract_used chars=%d (PyPDF2 failed)", len(vision_text)
            )
            return vision_text
    except Exception as e:
        import logging
        logging.getLogger("placify.resume").debug("vision_fallback_failed: %s", str(e)[:100])

    # Step 3: Both failed
    raise ValueError(
        "Could not extract text from this PDF. "
        "It may be a scanned document. Try uploading a text-based PDF."
    )


def count_keyword_matches(text: str, tokens: list[str], lemmatizer: WordNetLemmatizer, keyword: str) -> int:
    """Count matches for both plain and punctuated keywords."""
    normalized_keyword = keyword.lower().strip()
    if re.search(r"[^a-z0-9\s]", normalized_keyword) or " " in normalized_keyword:
        pattern = rf"(?<![a-z0-9]){re.escape(normalized_keyword)}(?![a-z0-9])"
        return len(re.findall(pattern, text))

    return tokens.count(safe_lemmatize(lemmatizer, normalized_keyword))


def normalize_aliases(text: str) -> str:
    normalized = f" {text.lower()} "
    for alias, expanded in SKILL_ALIASES.items():
        normalized = re.sub(rf"(?<![a-z0-9]){re.escape(alias)}(?![a-z0-9])", f" {expanded} ", normalized)
    return re.sub(r"\s+", " ", normalized).strip()


def compute_skill_scores(resume_text: str) -> dict:
    """Compute skill scores using tokenization plus regex matching."""
    text_lower = resume_text.lower()
    normalized_text = re.sub(r"[^\w\s+#./-]+", " ", text_lower)
    normalized_text = re.sub(r"\s+", " ", normalized_text).strip()
    normalized_text = normalize_aliases(normalized_text)

    raw_tokens = wordpunct_tokenize(normalized_text)
    lemmatizer = WordNetLemmatizer()
    stop_words = get_stop_words()
    lemmatized_tokens = [
        safe_lemmatize(lemmatizer, token)
        for token in raw_tokens
        if re.search(r"[a-z0-9]", token) and token not in stop_words
    ]

    scores = {}

    for skill_key, keywords in SKILL_KEYWORDS.items():
        score = 0
        high_matches = 0
        medium_matches = 0

        for keyword in keywords.get("high", []):
            count = count_keyword_matches(normalized_text, lemmatized_tokens, lemmatizer, keyword)
            if count > 0:
                high_matches += 1
                score += min(count * 8, 25)

        for keyword in keywords.get("medium", []):
            count = count_keyword_matches(normalized_text, lemmatized_tokens, lemmatizer, keyword)
            if count > 0:
                medium_matches += 1
                score += min(count * 4, 12)

        max_possible = len(keywords.get("high", [])) * 15 + len(keywords.get("medium", [])) * 8
        normalized = min(100, (score / max_possible) * 100 * 1.8) if max_possible else 0

        total_keywords = len(keywords.get("high", [])) + len(keywords.get("medium", []))
        total_matches = high_matches + medium_matches
        if total_keywords > 0:
            normalized = min(100, normalized + (total_matches / total_keywords) * 20)

        scores[skill_key] = round(normalized, 1)

    return scores


def extract_experience_features(resume_text: str) -> dict:
    """Extract experience features using NLP context rules."""
    text_lower = resume_text.lower()

    project_patterns = [r"project", r"developed", r"built", r"created", r"implemented"]
    project_count = sum(len(re.findall(pattern, text_lower)) for pattern in project_patterns)
    projects = min(15, project_count // 2)

    intern_patterns = [r"intern", r"internship", r"trainee", r"apprentice"]
    intern_count = sum(len(re.findall(pattern, text_lower)) for pattern in intern_patterns)
    internships = min(5, intern_count)

    cert_patterns = [r"certif", r"certified", r"certification", r"certificate", r"coursera", r"udemy", r"edx", r"nptel"]
    cert_count = sum(len(re.findall(pattern, text_lower)) for pattern in cert_patterns)
    certifications = min(10, cert_count)

    hack_patterns = [r"hackathon", r"hackerearth", r"competitive", r"competition", r"contest"]
    hack_count = sum(len(re.findall(pattern, text_lower)) for pattern in hack_patterns)
    hackathons = min(10, hack_count)

    cgpa_match = re.search(r"(?:cgpa|gpa|percentage)[:\s]*(\d+\.?\d*)", text_lower)
    cgpa = 7.0
    if cgpa_match:
        val = float(cgpa_match.group(1))
        if val <= 10:
            cgpa = val
        elif val <= 100:
            cgpa = val / 10

    return {
        "projects": projects,
        "internships": internships,
        "certifications": certifications,
        "hackathons": hackathons,
        "cgpa": round(cgpa, 2),
    }


def calculate_ats_score(text: str) -> dict:
    """Evaluate resume structure using simple ATS heuristics."""
    text_lower = text.lower()
    score = 100
    feedback = []

    word_count = len(text.split())
    if word_count < 200:
        score -= 20
        feedback.append("[warn] Too short (under 200 words). Add more details about your projects and impact.")
    elif word_count > 1000:
        score -= 15
        feedback.append("[warn] Too long (over 1000 words). ATS systems prefer concise, one-page formats.")
    else:
        feedback.append("[ok] Resume length is in a healthy range.")

    sections = [
        ("education", "Education"),
        ("experience", "Experience"),
        ("project", "Projects"),
        ("skill", "Skills"),
    ]
    for key, name in sections:
        if key not in text_lower:
            score -= 10
            feedback.append(f"[missing] Add a clear '{name}' section header.")
        else:
            feedback.append(f"[ok] Found '{name}' section.")

    has_linkedin = "linkedin.com" in text_lower
    has_github = "github.com" in text_lower
    has_email = bool(re.search(r"[a-z0-9.\-+_]+@[a-z0-9.\-+_]+\.[a-z]+", text_lower))
    has_phone = bool(re.search(r"(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3,5}\)?[-.\s]?){2,3}\d{3,5}", text_lower))

    if not has_email:
        score -= 10
        feedback.append("[missing] No email address detected.")
    if not has_phone:
        score -= 5
        feedback.append("[missing] No phone number detected.")
    if not has_linkedin:
        score -= 10
        feedback.append("[warn] Add a LinkedIn URL so recruiters can verify your profile.")
    if not has_github:
        score -= 5
        feedback.append("[warn] Add a GitHub URL if you are applying for technical roles.")
    if has_email and has_phone and has_linkedin and has_github:
        feedback.append("[ok] Contact and profile links look strong.")

    action_verbs = ["developed", "designed", "built", "created", "managed", "led", "architected", "spearheaded", "optimized", "implemented"]
    verb_count = sum(1 for verb in action_verbs if verb in text_lower)
    if verb_count < 3:
        score -= 10
        feedback.append("[warn] Use stronger action verbs such as 'Architected', 'Spearheaded', or 'Optimized'.")
    else:
        feedback.append("[ok] Strong use of action verbs.")

    return {"score": max(0, score), "feedback": feedback}


def count_advanced_tech(text: str) -> int:
    advanced_keywords = ["kubernetes", "docker", "aws", "gcp", "azure", "redis", "kafka", "microservices", "graphql", "ci/cd", "jenkins", "terraform"]
    text_lower = text.lower()
    return sum(1 for keyword in advanced_keywords if keyword in text_lower)


async def parse_resume(file_content: bytes) -> dict:
    """Parse a resume PDF and return extracted model features."""
    text = await extract_text_from_pdf(file_content)

    if len(text.strip()) < 50:
        raise ValueError("Could not extract sufficient text from the PDF.")

    skill_scores = compute_skill_scores(text)
    experience = extract_experience_features(text)
    ats = calculate_ats_score(text)
    advanced_tech = count_advanced_tech(text)

    return {
        "resume_text_length": len(text),
        "ats_score": ats["score"],
        "ats_feedback": ats["feedback"],
        "advanced_tech_count": advanced_tech,
        "_raw_text": text,  # Passed through for LLM analysis (F1), excluded from ML features
        **skill_scores,
        **experience,
    }
