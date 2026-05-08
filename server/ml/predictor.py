"""
Placify AI - Prediction Engine
Loads trained models and generates comprehensive placement predictions.
Enhanced with RAG (interview questions, company profiles, prep resources)
and LLM (personalized recommendations) — all with rule-based fallbacks.
"""

import hashlib
import json
import logging
import os

import joblib
import numpy as np

logger = logging.getLogger("placify.predictor")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "models")
MODEL_FILES = [
    "role_model.joblib",
    "tier_model.joblib",
    "salary_model.joblib",
    "scaler.joblib",
    "role_encoder.joblib",
    "tier_encoder.joblib",
    "feature_cols.joblib",
]

role_model = None
tier_model = None
salary_model = None
scaler = None
role_encoder = None
tier_encoder = None
feature_cols = None
model_metadata = {"loaded": False, "checksums": {}, "version": "unknown"}


def _sha256(path: str) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(8192), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_models():
    """Load all trained models into memory."""
    global role_model, tier_model, salary_model, scaler, role_encoder, tier_encoder, feature_cols, model_metadata
    role_model = joblib.load(os.path.join(MODEL_DIR, "role_model.joblib"))
    tier_model = joblib.load(os.path.join(MODEL_DIR, "tier_model.joblib"))
    salary_model = joblib.load(os.path.join(MODEL_DIR, "salary_model.joblib"))
    scaler = joblib.load(os.path.join(MODEL_DIR, "scaler.joblib"))
    role_encoder = joblib.load(os.path.join(MODEL_DIR, "role_encoder.joblib"))
    tier_encoder = joblib.load(os.path.join(MODEL_DIR, "tier_encoder.joblib"))
    feature_cols = joblib.load(os.path.join(MODEL_DIR, "feature_cols.joblib"))
    checksums = {}
    for filename in MODEL_FILES:
        full_path = os.path.join(MODEL_DIR, filename)
        if not os.path.exists(full_path):
            raise FileNotFoundError(f"Required model artifact missing: {filename}")
        checksums[filename] = _sha256(full_path)

    metadata_path = os.path.join(MODEL_DIR, "metadata.joblib")
    model_version = "unknown"
    if os.path.exists(metadata_path):
        metadata = joblib.load(metadata_path)
        model_version = str(metadata.get("version", "unknown"))

    model_metadata = {"loaded": True, "checksums": checksums, "version": model_version}
    print("[ok] All ML models loaded successfully.")


CTC_BREAKDOWN_RULES = {
    "Startup": {"base_pct": 0.70, "hra_pct": 0.15, "bonus_pct": 0.05, "stock_pct": 0.03, "allowance_pct": 0.05, "insurance_pct": 0.02},
    "Service-Based": {"base_pct": 0.65, "hra_pct": 0.18, "bonus_pct": 0.05, "stock_pct": 0.02, "allowance_pct": 0.07, "insurance_pct": 0.03},
    "Product-Based": {"base_pct": 0.60, "hra_pct": 0.15, "bonus_pct": 0.10, "stock_pct": 0.08, "allowance_pct": 0.04, "insurance_pct": 0.03},
    "Fintech": {"base_pct": 0.55, "hra_pct": 0.14, "bonus_pct": 0.12, "stock_pct": 0.12, "allowance_pct": 0.04, "insurance_pct": 0.03},
    "Top-Tier": {"base_pct": 0.50, "hra_pct": 0.12, "bonus_pct": 0.15, "stock_pct": 0.18, "allowance_pct": 0.03, "insurance_pct": 0.02},
}

COMPANY_SUGGESTIONS = {
    "Startup": ["Zerodha", "Cred", "Meesho", "Groww", "Slice", "Jupiter"],
    "Service-Based": ["TCS", "Infosys", "Wipro", "Cognizant", "HCL", "Tech Mahindra"],
    "Product-Based": ["Adobe", "Atlassian", "Salesforce", "Intuit", "VMware", "SAP Labs"],
    "Fintech": ["Razorpay", "PhonePe", "Paytm", "Stripe", "Goldman Sachs", "JP Morgan"],
    "Top-Tier": ["Google", "Amazon", "Microsoft", "Meta", "Apple", "Netflix"],
}

INTERVIEW_TIPS = {
    "Software Developer": [
        "Master OOP concepts and SOLID principles",
        "Practice system design for mid-level rounds",
        "Be ready to write clean, production-quality code in interviews",
        "Prepare for behavioral questions using the STAR method",
    ],
    "Frontend Developer": [
        "Deep dive into React/Vue lifecycle and state management",
        "Master CSS Grid, Flexbox, and responsive design patterns",
        "Prepare for UI/UX design discussions and accessibility",
        "Practice building components from scratch in live coding rounds",
    ],
    "Backend Developer": [
        "Master database design, indexing, and query optimization",
        "Understand microservices, REST APIs, and message queues",
        "Practice concurrency and multithreading questions",
        "Be prepared for scalability and performance discussions",
    ],
    "Full-Stack Developer": [
        "Know both frontend frameworks and backend architectures deeply",
        "Practice building full CRUD applications in timed settings",
        "Understand CI/CD pipelines and deployment strategies",
        "Be ready to discuss trade-offs between different architectures",
    ],
    "ML Engineer": [
        "Understand ML algorithms at a mathematical level (gradient descent, backprop)",
        "Prepare for model design and feature engineering questions",
        "Practice implementing ML models from scratch (no libraries)",
        "Be ready to discuss productionizing ML pipelines (MLOps)",
    ],
    "Data Analyst": [
        "Master SQL, including complex joins, window functions, and CTEs",
        "Prepare for case study and business problem-solving rounds",
        "Know statistical concepts such as hypothesis testing, A/B testing, and regression",
        "Practice data visualization and storytelling with data",
    ],
    "Data Scientist": [
        "Build a deep understanding of statistical modeling and ML theory",
        "Prepare for take-home assignments with real datasets",
        "Master the Python data stack: pandas, scikit-learn, and matplotlib",
        "Be ready to explain model choices and trade-offs clearly",
    ],
    "DevOps Engineer": [
        "Master Docker, Kubernetes, and container orchestration",
        "Know CI/CD tools such as Jenkins, GitHub Actions, and GitLab CI",
        "Understand infrastructure as code with Terraform and Ansible",
        "Prepare for troubleshooting and incident response scenarios",
    ],
}


def compute_ctc_breakdown(total_ctc_lpa: float, tier: str) -> dict:
    """Compute detailed CTC breakdown based on company tier."""
    rules = CTC_BREAKDOWN_RULES.get(tier, CTC_BREAKDOWN_RULES["Service-Based"])
    total = total_ctc_lpa

    return {
        "total_ctc": round(total, 2),
        "base_salary": round(total * rules["base_pct"], 2),
        "hra": round(total * rules["hra_pct"], 2),
        "performance_bonus": round(total * rules["bonus_pct"], 2),
        "stocks_esops": round(total * rules["stock_pct"], 2),
        "special_allowances": round(total * rules["allowance_pct"], 2),
        "insurance_benefits": round(total * rules["insurance_pct"], 2),
        "monthly_in_hand": round((total * rules["base_pct"] + total * rules["hra_pct"] + total * rules["allowance_pct"]) / 12, 2),
    }


def compute_skill_gaps(features: dict) -> list:
    """Analyze skill gaps and generate recommendations."""
    skill_map = {
        "Python": ("python_score", 70),
        "Java": ("java_score", 60),
        "C++": ("cpp_score", 50),
        "JavaScript": ("javascript_score", 60),
        "Machine Learning": ("ml_skills", 60),
        "Web Development": ("web_dev_score", 60),
        "DSA": ("dsa_score", 65),
        "Cloud/DevOps": ("cloud_score", 50),
        "Data Analytics": ("data_analytics_score", 55),
        "Databases": ("database_score", 55),
    }

    recommendations_db = {
        "Python": "Complete Python for Data Science on Coursera. Practice on HackerRank Python track.",
        "Java": "Take the Java MOOC by the University of Helsinki. Build a Spring Boot REST API project.",
        "C++": "Solve 100+ competitive programming problems in C++ on Codeforces.",
        "JavaScript": "Build 3 projects with React or Node.js. Complete the JavaScript.info tutorial.",
        "Machine Learning": "Complete Andrew Ng's ML Specialization. Implement 5 ML models from scratch.",
        "Web Development": "Build a full-stack portfolio project. Learn a modern framework such as React or Next.js.",
        "DSA": "Solve 300+ LeetCode problems. Focus on trees, graphs, DP, and sliding window patterns.",
        "Cloud/DevOps": "Get AWS Cloud Practitioner certified. Deploy 2 projects on AWS or GCP.",
        "Data Analytics": "Complete the Google Data Analytics Certificate. Build 3 data visualization dashboards.",
        "Databases": "Master SQL through SQLZoo and LeetCode SQL. Learn MongoDB basics.",
    }

    gaps = []
    for skill_name, (feat_key, threshold) in skill_map.items():
        current = features.get(feat_key, 0)
        gap = threshold - current
        status = "strong" if current >= threshold else ("moderate" if gap <= 20 else "weak")
        gaps.append(
            {
                "skill": skill_name,
                "current_score": round(current, 1),
                "target_score": threshold,
                "gap": round(max(0, gap), 1),
                "status": status,
                "recommendation": recommendations_db.get(skill_name, "") if status != "strong" else "Keep practicing to maintain your edge!",
            }
        )

    gaps.sort(key=lambda item: item["current_score"])
    return gaps


def get_quick_actions(skill_gaps: list, features: dict) -> list:
    """Get the top immediate actions to improve placement chances."""
    actions = []

    weak_skills = [gap for gap in skill_gaps if gap["status"] == "weak"]
    if weak_skills:
        worst = weak_skills[0]
        actions.append(
            f"Urgently improve {worst['skill']} (currently {worst['current_score']}/100). {worst['recommendation']}"
        )

    if features.get("coding_problems_solved", 0) < 200:
        actions.append("Solve at least 200 coding problems on LeetCode or HackerRank to clear technical rounds.")
    elif features.get("coding_problems_solved", 0) < 400:
        actions.append("Push your coding problem count to 400+ or start targeting hard-level problems.")

    if features.get("projects", 0) < 3:
        actions.append("Build at least 3 substantial projects to showcase on your resume and GitHub.")

    if features.get("certifications", 0) < 2:
        actions.append("Get at least 2 industry certifications from AWS, Google, Microsoft, or Coursera.")

    if features.get("internships", 0) < 1:
        actions.append("Try to secure at least one internship. It significantly boosts placement chances.")

    if features.get("aptitude_score", 0) < 60:
        actions.append("Practice aptitude regularly on IndiaBix or PrepInsta for screening rounds.")

    return actions[:3]


def get_rag_interview_prep(predicted_role: str, skill_gaps: list) -> dict:
    """
    F3: Get interview prep using RAG (curated question bank).
    Falls back to static INTERVIEW_TIPS if RAG is unavailable.
    """
    try:
        from services.rag_service import get_interview_questions, is_available
        if is_available():
            weak_skills = [g["skill"] for g in skill_gaps if g["status"] != "strong"]
            if not weak_skills:
                weak_skills = [g["skill"] for g in skill_gaps[:3]]

            rag_results = get_interview_questions(predicted_role, weak_skills, n=8)
            if rag_results:
                questions = []
                for r in rag_results:
                    questions.append({
                        "question": r["text"],
                        "difficulty": r["metadata"].get("difficulty", "medium"),
                        "hint": r["metadata"].get("tip", ""),
                        "relevance_score": r.get("score", 0),
                    })

                # Also keep the static tips as general advice
                static_tips = INTERVIEW_TIPS.get(predicted_role, INTERVIEW_TIPS["Software Developer"])

                logger.info("interview_prep source=rag questions=%d", len(questions))
                return {
                    "tips": static_tips,
                    "questions": questions,
                    "source": "rag"
                }
    except Exception as e:
        logger.debug("rag_interview_fallback error=%s", str(e)[:100])

    # Fallback: static tips, no questions
    return {
        "tips": INTERVIEW_TIPS.get(predicted_role, INTERVIEW_TIPS["Software Developer"]),
        "questions": [],
        "source": "static"
    }


def get_rag_company_insights(predicted_tier: str, predicted_role: str) -> dict:
    """
    F9: Get company suggestions using RAG (curated company profiles).
    Falls back to static COMPANY_SUGGESTIONS if RAG is unavailable.
    """
    try:
        from services.rag_service import get_company_insights, is_available
        if is_available():
            rag_results = get_company_insights(predicted_tier, predicted_role, n=6)
            if rag_results:
                companies = []
                details = []
                for r in rag_results:
                    meta = r["metadata"]
                    company_name = meta.get("company", "Unknown")
                    companies.append(company_name)
                    details.append({
                        "company": company_name,
                        "tier": meta.get("tier", predicted_tier),
                        "avg_ctc_lpa": meta.get("avg_ctc_lpa", "N/A"),
                        "interview_rounds": meta.get("interview_rounds", ""),
                        "focus_areas": meta.get("focus_areas", ""),
                        "tips": r["text"],
                    })

                logger.info("company_insights source=rag companies=%d", len(companies))
                return {
                    "companies": companies,
                    "details": details,
                    "source": "rag"
                }
    except Exception as e:
        logger.debug("rag_company_fallback error=%s", str(e)[:100])

    # Fallback: static company names, no details
    return {
        "companies": COMPANY_SUGGESTIONS.get(predicted_tier, []),
        "details": [],
        "source": "static"
    }


def enrich_skill_gaps_with_rag(skill_gaps: list, predicted_role: str) -> list:
    """
    F2: Enrich skill gap recommendations with RAG-matched prep resources.
    Falls back to existing static recommendations if RAG is unavailable.
    """
    try:
        from services.rag_service import get_prep_resources, is_available
        if is_available():
            enriched = False
            for gap in skill_gaps:
                if gap["status"] == "strong":
                    continue

                resources = get_prep_resources(
                    skill_name=gap["skill"],
                    current_score=gap["current_score"],
                    target_role=predicted_role,
                    n=3
                )
                if resources:
                    gap["matched_resources"] = [
                        {
                            "title": r["metadata"].get("title", ""),
                            "url": r["metadata"].get("url", ""),
                            "duration": r["metadata"].get("duration", ""),
                            "level": r["metadata"].get("level", ""),
                            "type": r["metadata"].get("type", ""),
                        }
                        for r in resources
                    ]
                    enriched = True

            if enriched:
                logger.info("skill_gaps source=rag enriched=true")
    except Exception as e:
        logger.debug("rag_skill_enrichment_fallback error=%s", str(e)[:100])

    return skill_gaps


def predict(features: dict) -> dict:
    """Generate a comprehensive prediction for a parsed profile."""
    if role_model is None:
        load_models()

    feature_vector = np.asarray([features.get(col, 0) for col in feature_cols], dtype=float).reshape(1, -1)
    feature_vector_scaled = scaler.transform(feature_vector)

    role_probs = role_model.predict_proba(feature_vector_scaled)[0]
    role_idx = np.argmax(role_probs)
    predicted_role = role_encoder.inverse_transform([role_idx])[0]
    role_confidence = float(role_probs[role_idx])

    top3_indices = np.argsort(role_probs)[::-1][:3]
    top3_roles = [
        {"role": role_encoder.inverse_transform([idx])[0], "probability": round(float(role_probs[idx]) * 100, 1)}
        for idx in top3_indices
    ]

    tier_probs = tier_model.predict_proba(feature_vector_scaled)[0]
    tier_idx = np.argmax(tier_probs)
    predicted_tier = tier_encoder.inverse_transform([tier_idx])[0]
    tier_confidence = float(tier_probs[tier_idx])

    faang_idx = list(tier_encoder.classes_).index("Top-Tier") if "Top-Tier" in tier_encoder.classes_ else -1
    faang_probability = round(float(tier_probs[faang_idx]) * 100, 1) if faang_idx >= 0 else 0

    problems = features.get("coding_problems_solved", 0)
    dsa = features.get("dsa_score", 0)
    if problems >= 500 and dsa >= 80:
        predicted_tier = "Top-Tier"
        tier_confidence = max(tier_confidence, 0.85)
        faang_probability = max(faang_probability, min(99.0, 80.0 + (problems - 500) * 0.08))
    elif problems >= 300 and dsa >= 65 and predicted_tier in ["Startup", "Service-Based"]:
        predicted_tier = "Product-Based"
        tier_confidence = max(tier_confidence, 0.75)

    tier_distribution = {
        tier_encoder.inverse_transform([idx])[0]: round(float(tier_probs[idx]) * 100, 1)
        for idx in range(len(tier_probs))
    }

    tier_salary_bounds = {
        "Startup": (2.5, 8.0),
        "Service-Based": (3.0, 7.0),
        "Product-Based": (8.0, 25.0),
        "Fintech": (10.0, 35.0),
        "Top-Tier": (20.0, 60.0),
    }

    predicted_salary = float(salary_model.predict(feature_vector_scaled)[0])
    lo, hi = tier_salary_bounds.get(predicted_tier, (3.0, 7.0))
    # Seed RNG from feature vector hash so identical inputs always produce
    # the same salary prediction — eliminates non-determinism (audit B-05).
    _rng_seed = int(hashlib.md5(feature_vector.tobytes()).hexdigest(), 16) % (2 ** 31)
    _rng = np.random.RandomState(_rng_seed)
    if predicted_salary < lo:
        predicted_salary = lo + abs(_rng.normal(0, 1.5))
    elif predicted_salary > hi:
        predicted_salary = hi - abs(_rng.normal(0, 3.5))
    predicted_salary = min(hi, max(lo, predicted_salary))

    salary_low = round(predicted_salary * 0.85, 2)
    salary_high = round(predicted_salary * 1.20, 2)
    ctc_breakdown = compute_ctc_breakdown(predicted_salary, predicted_tier)

    domain_scores = {
        "Development": round(
            np.mean(
                [
                    features.get("python_score", 0),
                    features.get("java_score", 0),
                    features.get("javascript_score", 0),
                    features.get("web_dev_score", 0),
                ]
            ),
            1,
        ),
        "Machine Learning": round(np.mean([features.get("ml_skills", 0), features.get("python_score", 0) * 0.5]), 1),
        "DSA & Problem Solving": round(
            np.mean([features.get("dsa_score", 0), min(features.get("coding_problems_solved", 0) / 10, 100)]),
            1,
        ),
        "Data Analytics": round(np.mean([features.get("data_analytics_score", 0), features.get("database_score", 0)]), 1),
        "Cloud & DevOps": round(features.get("cloud_score", 0), 1),
        "Communication": round(features.get("communication_score", 3) * 20, 1),
    }

    skill_values = [features.get(col, 0) for col in feature_cols[:10]]
    avg_skills = np.mean(skill_values)
    project_factor = min(features.get("projects", 0) / 8, 1.0) * 15
    cert_factor = min(features.get("certifications", 0) / 5, 1.0) * 10
    intern_factor = min(features.get("internships", 0) / 3, 1.0) * 15
    resume_strength = min(100, round(avg_skills * 0.6 + project_factor + cert_factor + intern_factor))

    industry_readiness = min(
        100,
        round(
            avg_skills * 0.35
            + min(features.get("coding_problems_solved", 0) / 5.0, 100) * 0.20
            + features.get("aptitude_score", 0) * 0.10
            + features.get("communication_score", 3) * 20 * 0.10
            + features.get("cgpa", 6) * 10 * 0.10
            + intern_factor * 0.15
        ),
    )

    overall = (avg_skills + features.get("aptitude_score", 0)) / 2
    peer_percentile = min(
        99,
        max(1, round(50 + (overall - 50) * 0.8 + (features.get("coding_problems_solved", 0) - 300) * 0.02)),
    )

    advanced_tech = features.get("advanced_tech_count", 0)
    if advanced_tech >= 2:
        resume_strength = min(100, resume_strength + 15)
        industry_readiness = min(100, industry_readiness + 7)
    elif advanced_tech == 1:
        resume_strength = min(100, resume_strength + 5)

    skill_gaps = compute_skill_gaps(features)
    quick_actions = get_quick_actions(skill_gaps, features)
    overall_confidence = round((role_confidence * 0.5 + tier_confidence * 0.5) * 100, 1)

    # ── RAG-enhanced interview prep (F3) ─────────────────────────
    interview_data = get_rag_interview_prep(predicted_role, skill_gaps)

    # ── RAG-enhanced company suggestions (F9) ────────────────────
    companies_data = get_rag_company_insights(predicted_tier, predicted_role)

    # ── RAG-enhanced skill recommendations (F2) ──────────────────
    skill_gaps = enrich_skill_gaps_with_rag(skill_gaps, predicted_role)

    return {
        "predicted_role": predicted_role,
        "role_confidence": round(role_confidence * 100, 1),
        "top_roles": top3_roles,
        "predicted_tier": predicted_tier,
        "tier_confidence": round(tier_confidence * 100, 1),
        "tier_distribution": tier_distribution,
        "faang_probability": faang_probability,
        "salary_range": {
            "low": salary_low,
            "expected": round(predicted_salary, 2),
            "high": salary_high,
        },
        "ctc_breakdown": ctc_breakdown,
        "overall_confidence": overall_confidence,
        "domain_scores": domain_scores,
        "resume_strength": resume_strength,
        "industry_readiness": industry_readiness,
        "peer_percentile": peer_percentile,
        "ats_score": features.get("ats_score", 0),
        "ats_feedback": features.get("ats_feedback", []),
        "skill_gaps": skill_gaps,
        "quick_actions": quick_actions,
        "target_companies": companies_data["companies"],
        "interview_tips": interview_data["tips"],
        "interview_questions": interview_data.get("questions", []),
        "company_details": companies_data.get("details", []),
        "ai_enhanced": interview_data.get("source") == "rag" or companies_data.get("source") == "rag",
    }


def get_model_metadata() -> dict:
    return model_metadata
