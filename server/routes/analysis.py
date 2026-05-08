"""
Placify AI - Analysis routes.

Handles resume upload, prediction, AI-enriched feedback, and MongoDB-backed
analysis history.
"""

import json
import logging
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

try:
    from ..auth import get_current_user
    from ..database import get_collection, to_iso, utcnow
    from ..ml.predictor import predict
    from ..utils.resume_parser import parse_resume
except ImportError:
    from auth import get_current_user
    from database import get_collection, to_iso, utcnow
    from ml.predictor import predict
    from utils.resume_parser import parse_resume

router = APIRouter(prefix="/api/analysis", tags=["analysis"])
logger = logging.getLogger("placify.analysis")

try:
    from services import llm_service
except ImportError:
    llm_service = None

MAX_FILE_SIZE = 5 * 1024 * 1024


@router.post("")
async def create_analysis(
    resume: UploadFile = File(...),
    aptitude_score: float = Form(...),
    communication_score: float = Form(...),
    coding_problems_solved: int = Form(...),
    current_user: dict = Depends(get_current_user),
):
    """Upload resume and generate placement prediction."""
    if not resume.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    content = await resume.read()
    if resume.content_type not in {None, "application/pdf", "application/x-pdf"}:
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")
    if not content.startswith(b"%PDF"):
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid PDF")
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size must be under 5MB")
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    if not (0 <= aptitude_score <= 100):
        raise HTTPException(status_code=400, detail="Aptitude score must be between 0 and 100")
    if not (1 <= communication_score <= 5):
        raise HTTPException(status_code=400, detail="Communication score must be between 1 and 5")
    if not (0 <= coding_problems_solved <= 5000):
        raise HTTPException(status_code=400, detail="Coding problems solved must be between 0 and 5000")

    try:
        resume_features = await parse_resume(content)
    except ValueError as e:
        logger.warning("resume_parse_validation_error user_id=%s detail=%s", current_user["id"], str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        logger.exception("resume_parse_unexpected_error user_id=%s", current_user["id"])
        raise HTTPException(status_code=500, detail="Failed to process the resume. Please try a different file.")

    features = {
        **resume_features,
        "aptitude_score": aptitude_score,
        "communication_score": communication_score,
        "coding_problems_solved": coding_problems_solved,
    }

    try:
        results = predict(features)
    except Exception:
        logger.exception("prediction_error user_id=%s", current_user["id"])
        raise HTTPException(status_code=500, detail="Prediction failed. Please try again later.")

    if llm_service and llm_service.is_available():
        try:
            enhanced_ats = await _generate_ats_feedback(
                resume_text=resume_features.get("_raw_text", ""),
                predicted_role=results.get("predicted_role", ""),
                current_ats=results.get("ats_feedback", []),
            )
            if enhanced_ats:
                results["ats_feedback_enhanced"] = enhanced_ats
                results["ats_enhanced"] = True
                logger.info("ats_feedback source=llm user_id=%s", current_user["id"])
        except Exception as e:
            logger.debug("ats_llm_skipped error=%s", str(e)[:100])

    if llm_service and llm_service.is_available():
        try:
            narrative = await _generate_results_narrative(results)
            if narrative:
                results["ai_narrative"] = narrative
                results["ai_enhanced"] = True
                logger.info("narrative source=llm user_id=%s", current_user["id"])
        except Exception as e:
            logger.debug("narrative_llm_skipped error=%s", str(e)[:100])

    if llm_service and llm_service.is_available():
        try:
            results["skill_gaps"] = await _generate_skill_plans(
                skill_gaps=results.get("skill_gaps", []),
                predicted_role=results.get("predicted_role", "Software Developer"),
            )
        except Exception as e:
            logger.debug("skill_plans_llm_skipped error=%s", str(e)[:100])

    analyses_collection = get_collection("analyses")
    my_readiness = results.get("industry_readiness", 0)
    total_users = analyses_collection.count_documents({})
    below_users = analyses_collection.count_documents({"industry_readiness": {"$lt": my_readiness}})
    results["peer_percentile"] = int((below_users / (total_users + 1)) * 100) if total_users > 0 else 99

    results.pop("_raw_text", None)

    analysis_id = str(uuid.uuid4())
    input_data = {
        "resume_filename": resume.filename,
        "aptitude_score": aptitude_score,
        "communication_score": communication_score,
        "coding_problems_solved": coding_problems_solved,
        "extracted_features": {k: v for k, v in features.items() if k != "_raw_text"},
    }

    analyses_collection.insert_one({
        "_id": analysis_id,
        "id": analysis_id,
        "user_id": current_user["id"],
        "created_at": utcnow(),
        "resume_filename": resume.filename,
        "input_data": input_data,
        "results": results,
        "predicted_role": results.get("predicted_role"),
        "predicted_tier": results.get("predicted_tier"),
        "industry_readiness": results.get("industry_readiness"),
        "overall_confidence": results.get("overall_confidence"),
        "salary_expected": results.get("salary_range", {}).get("expected"),
    })

    logger.info("analysis_created analysis_id=%s user_id=%s", analysis_id, current_user["id"])
    return {"id": analysis_id, "input_data": input_data, "results": results}


@router.get("/history")
def get_history(current_user: dict = Depends(get_current_user)):
    """Get all past analyses for the current user."""
    rows = list(
        get_collection("analyses")
        .find({"user_id": current_user["id"]})
        .sort("created_at", -1)
    )
    logger.info("analysis_history_read user_id=%s count=%s", current_user["id"], len(rows))

    analyses = []
    for row in rows:
        results = _ensure_dict(row.get("results", {}))
        analyses.append({
            "id": row.get("id") or str(row["_id"]),
            "created_at": to_iso(row.get("created_at")),
            "resume_filename": row.get("resume_filename"),
            "predicted_role": row.get("predicted_role") or results.get("predicted_role", "N/A"),
            "predicted_tier": row.get("predicted_tier") or results.get("predicted_tier", "N/A"),
            "salary_expected": row.get("salary_expected") or results.get("salary_range", {}).get("expected", 0),
            "overall_confidence": row.get("overall_confidence") or results.get("overall_confidence", 0),
            "industry_readiness": row.get("industry_readiness") or results.get("industry_readiness", 0),
            "resume_strength": results.get("resume_strength", 0),
        })

    return {"analyses": analyses}


@router.get("/{analysis_id}")
def get_analysis(analysis_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single analysis by ID."""
    row = get_collection("analyses").find_one({"_id": analysis_id, "user_id": current_user["id"]})
    if not row:
        raise HTTPException(status_code=404, detail="Analysis not found")

    logger.info("analysis_read analysis_id=%s user_id=%s", analysis_id, current_user["id"])
    return {
        "id": row.get("id") or str(row["_id"]),
        "created_at": to_iso(row.get("created_at")),
        "resume_filename": row.get("resume_filename"),
        "input_data": _ensure_dict(row.get("input_data", {})),
        "results": _ensure_dict(row.get("results", {})),
    }


def _ensure_dict(value):
    if isinstance(value, str):
        return json.loads(value)
    return value or {}


async def _generate_ats_feedback(resume_text: str, predicted_role: str, current_ats: list) -> list | None:
    """Use LLM to generate deep, contextual ATS resume feedback."""
    if not resume_text or len(resume_text.strip()) < 100:
        return None
    if not llm_service or not llm_service.is_available():
        return None

    try:
        result = await llm_service.generate_json(
            prompt=f"""Analyze this resume for ATS compatibility targeting the role: "{predicted_role}".

Resume text:
{resume_text[:3500]}

Return a JSON object with:
- "suggestions": a list of 4-6 objects, each with:
  - "type": one of "strength", "improvement", "missing", "tip"
  - "message": a specific, actionable suggestion referencing actual content from the resume. Use concise Markdown for emphasis and short lists when useful.
  - "priority": "high", "medium", or "low"

Focus on: keyword optimization, impact quantification, section structure, and role-specific terminology.
Do NOT give generic advice. Reference specific lines or sections from this resume.
Use Markdown principles inside text values where helpful: **bold** key terms, use short bullets, and never wrap the response in code fences.""",
            system="You are an expert ATS resume reviewer at a Fortune 500 company. Be specific and actionable.",
        )
        if result and "suggestions" in result:
            return result["suggestions"]
    except Exception as e:
        logger.debug("ats_llm_error: %s", str(e)[:100])

    return None


async def _generate_results_narrative(results: dict) -> str | None:
    """Use LLM to generate a human-readable career readiness summary."""
    if not llm_service or not llm_service.is_available():
        return None

    try:
        weak_skills = [g["skill"] for g in results.get("skill_gaps", []) if g.get("status") == "weak"]
        strong_skills = [g["skill"] for g in results.get("skill_gaps", []) if g.get("status") == "strong"]
        domain_scores = results.get("domain_scores", {})
        top_domains = sorted(domain_scores.items(), key=lambda x: -x[1])[:3]

        return await llm_service.generate(
            prompt=f"""Write a Markdown career readiness summary for an engineering student:

- Best-fit role: {results.get('predicted_role', 'N/A')} ({results.get('role_confidence', 0)}% confidence)
- Target company tier: {results.get('predicted_tier', 'N/A')}
- Expected salary: INR {results.get('salary_range', {}).get('expected', 0)} LPA
- Industry readiness: {results.get('industry_readiness', 0)}%
- Resume strength: {results.get('resume_strength', 0)}%
- Strongest domains: {', '.join(f'{d[0]} ({d[1]}/100)' for d in top_domains)}
- Strong skills: {', '.join(strong_skills) or 'None identified'}
- Weak skills needing work: {', '.join(weak_skills) or 'None - well-rounded'}
- FAANG probability: {results.get('faang_probability', 0)}%

Use this Markdown structure:
### Snapshot
Highlight strengths and what they're doing well.

### Priority Gaps
Identify the 1-2 most important gaps to address.

### This Week
Give 2 concrete, specific next steps as bullet points.

Tone: Encouraging mentor, not corporate. Keep it under 260 words. Do not use code fences or raw HTML.""",
            system="You are a placement advisor at an Indian engineering college. Be warm, specific, and practical.",
        )
    except Exception as e:
        logger.debug("narrative_llm_error: %s", str(e)[:100])

    return None


async def _generate_skill_plans(skill_gaps: list, predicted_role: str) -> list:
    """Use LLM to generate personalized study plans for weak/moderate skills."""
    if not llm_service or not llm_service.is_available():
        return skill_gaps

    weak_gaps = [g for g in skill_gaps if g.get("status") in ("weak", "moderate")][:3]
    if not weak_gaps:
        return skill_gaps

    for gap in weak_gaps:
        try:
            resource_text = ""
            if gap.get("matched_resources"):
                resources = gap["matched_resources"][:3]
                resource_text = "\nAvailable resources:\n" + "\n".join(
                    f"- {r['title']} ({r.get('duration', 'self-paced')}, {r.get('level', '')}) - {r.get('url', '')}"
                    for r in resources
                )

            plan = await llm_service.generate(
                prompt=f"""Create a concise 2-week study plan for a student targeting {predicted_role}.
Skill: {gap['skill']}
Current score: {gap['current_score']}/100 (target: {gap['target_score']})
Status: {gap['status']}
{resource_text}

Provide a practical 2-week plan in 4-5 Markdown bullet points.
Each bullet: "Week X, Days Y-Z: [specific task]".
Use ONLY the resources listed above if available. Be specific, not generic.
Keep the total response under 140 words. Do not use code fences or raw HTML.""",
                system="You are a placement prep coach for Indian engineering students. Be specific and actionable.",
            )
            if plan and plan.strip():
                gap["study_plan"] = plan.strip()
                logger.debug("study_plan generated for %s", gap["skill"])
        except Exception as e:
            logger.debug("study_plan_error skill=%s error=%s", gap["skill"], str(e)[:100])

    return skill_gaps
