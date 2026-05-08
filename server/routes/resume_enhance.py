"""
Placify AI — Resume Enhancement Routes (F7)
LLM-powered bullet point rewriting and resume improvement suggestions.
"""

import json
import logging

from fastapi import APIRouter, Depends, Form, HTTPException

try:
    from ..auth import get_current_user
except ImportError:
    from auth import get_current_user

# LLM service
try:
    from services import llm_service
except ImportError:
    llm_service = None

router = APIRouter(prefix="/api/resume", tags=["resume"])
logger = logging.getLogger("placify.resume_enhance")


@router.post("/enhance")
async def enhance_resume(
    resume_text: str = Form(...),
    target_role: str = Form(...),
    current_user: dict = Depends(get_current_user),
):
    """
    F7: Analyze resume bullet points and suggest improvements.
    Returns a list of before/after suggestions with explanations.
    """
    if not llm_service or not llm_service.is_available():
        raise HTTPException(
            status_code=503,
            detail="Resume enhancement requires an AI provider. Please configure a Gemini, Groq, or Azure OpenAI API key."
        )

    if not resume_text or len(resume_text.strip()) < 100:
        raise HTTPException(status_code=400, detail="Resume text is too short for meaningful analysis.")
    if len(target_role.strip()) < 2 or len(target_role) > 80:
        raise HTTPException(status_code=400, detail="Target role must be between 2 and 80 characters.")

    if len(resume_text) > 5000:
        resume_text = resume_text[:5000]

    try:
        result = await llm_service.generate_json(
            prompt=f"""Analyze this resume and suggest improvements for a {target_role} position.

Resume text:
{resume_text}

Return a JSON object with:
- "overall_score": integer 1-100 rating of the resume for this role
- "summary": a 2-sentence Markdown overall assessment using **bold** for key strengths or risks
- "suggestions": a list of 4-8 objects, each with:
  - "original": the exact line or bullet point from the resume being improved
  - "issue": what's wrong with it (be specific; concise Markdown is allowed)
  - "improved": a rewritten version with quantified impact and strong action verbs; concise Markdown is allowed
  - "category": one of "impact", "keywords", "structure", "clarity", "missing"

Focus on:
1. Adding quantified impact (numbers, percentages, scale)
2. Using strong action verbs (Architected, Spearheaded, Optimized)
3. Including role-specific keywords for {target_role}
4. Improving clarity and conciseness
5. Identifying missing sections or information

Reference SPECIFIC content from the resume. Do NOT give generic advice.
Use Markdown principles inside text values where useful: **bold** key terms and short bullets. Return valid JSON only; no code fences or raw HTML.""",
            system=f"You are an expert resume writer specializing in {target_role} roles at top tech companies. Use the STAR method. Quantify everything."
        )

        if not result:
            raise HTTPException(
                status_code=503,
                detail="AI provider did not return a response. Please try again."
            )

        logger.info("resume_enhance user_id=%s role=%s suggestions=%d",
                    current_user["id"], target_role,
                    len(result.get("suggestions", [])))

        return {
            "overall_score": result.get("overall_score", 0),
            "summary": result.get("summary", ""),
            "suggestions": result.get("suggestions", []),
            "target_role": target_role,
        }

    except HTTPException:
        raise
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="AI returned invalid response format. Please try again.")
    except Exception as e:
        logger.exception("resume_enhance_error user_id=%s", current_user["id"])
        raise HTTPException(status_code=500, detail=f"Enhancement failed: {str(e)[:100]}")


@router.get("/enhance/status")
def enhance_status():
    """Check if resume enhancement is available (LLM configured)."""
    available = bool(llm_service and llm_service.is_available())
    return {
        "available": available,
        "message": "AI-powered resume enhancement is ready." if available
                   else "No AI provider configured. Set a GEMINI_API_KEY or GROQ_API_KEY to enable."
    }
