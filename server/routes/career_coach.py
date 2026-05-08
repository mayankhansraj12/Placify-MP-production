"""
Placify AI — Career Coach Agent (F8 v2)
A proper tool-calling agent with:
- Database-backed conversation memory (persists across restarts)
- Tool use: the LLM decides when to query analyses, search resources, set goals
- Access to the user's full placement history
- Goal tracking with progress
"""

import json
import logging
import re
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

try:
    from ..auth import get_current_user
    from ..database import get_collection, to_iso, utcnow
except ImportError:
    from auth import get_current_user
    from database import get_collection, to_iso, utcnow

try:
    from services import llm_service
except ImportError:
    llm_service = None

try:
    from services import rag_service
except ImportError:
    rag_service = None

router = APIRouter(prefix="/api/coach", tags=["coach"])
logger = logging.getLogger("placify.coach")


# ═══════════════════════════════════════════════════════════════════════════
# Database setup — persistent memory + goals
# ═══════════════════════════════════════════════════════════════════════════

def _ensure_coach_tables():
    """MongoDB indexes are created during application startup."""
    return None


def _ensure_dict(value):
    if isinstance(value, str):
        return json.loads(value)
    return value or {}


# Initialize tables on import
try:
    _ensure_coach_tables()
except Exception:
    pass  # DB might not be ready yet; will retry on first request


# ═══════════════════════════════════════════════════════════════════════════
# Agent Tools — functions the LLM can call
# ═══════════════════════════════════════════════════════════════════════════

TOOLS = {
    "get_latest_analysis": "Retrieve the student's most recent placement analysis results",
    "get_analysis_history": "Get a summary of all past analyses showing progress over time",
    "search_resources": "Search the knowledge base for learning resources on a topic",
    "search_companies": "Search for company interview details and preparation tips",
    "search_questions": "Find practice interview questions for a specific role or skill",
    "set_goal": "Set a new preparation goal for the student",
    "get_goals": "List the student's current active goals",
    "complete_goal": "Mark a goal as completed",
}

TOOL_DESCRIPTIONS = "\n".join(f"- {name}: {desc}" for name, desc in TOOLS.items())


def _tool_get_latest_analysis(user_id: str) -> str:
    """Fetch the user's most recent analysis from the DB."""
    row = get_collection("analyses").find_one({"user_id": user_id}, sort=[("created_at", -1)])

    if not row:
        return "No analysis found. The student hasn't uploaded a resume yet."

    try:
        results = _ensure_dict(row.get("results", {}))
        summary_parts = [
            f"Analysis from: {to_iso(row.get('created_at'))}",
            f"Predicted role: {results.get('predicted_role', 'N/A')}",
            f"Predicted tier: {results.get('predicted_tier', 'N/A')}",
            f"Industry readiness: {results.get('industry_readiness', 0)}%",
            f"Resume strength: {results.get('resume_strength', 0)}%",
            f"FAANG probability: {results.get('faang_probability', 0)}%",
        ]

        # Skill gaps
        for gap in results.get("skill_gaps", []):
            summary_parts.append(
                f"  {gap['skill']}: {gap['current_score']}/{gap['target_score']} ({gap['status']})"
            )

        # Salary
        sal = results.get("salary_range", {})
        if sal:
            summary_parts.append(f"Expected salary: {sal.get('expected', 0)} LPA")

        return "\n".join(summary_parts)
    except (json.JSONDecodeError, KeyError, TypeError):
        return "Analysis found but could not parse results."


def _tool_get_analysis_history(user_id: str) -> str:
    """Get all past analyses to show progress."""
    rows = list(
        get_collection("analyses")
        .find({"user_id": user_id})
        .sort("created_at", -1)
        .limit(10)
    )

    if not rows:
        return "No analysis history. The student hasn't done any analyses yet."

    summaries = []
    for i, row in enumerate(rows):
        try:
            r = _ensure_dict(row.get("results", {}))
            summaries.append(
                f"#{i+1} ({to_iso(row.get('created_at'))}): "
                f"Role={r.get('predicted_role','?')}, "
                f"Readiness={r.get('industry_readiness',0)}%, "
                f"Resume={r.get('resume_strength',0)}%"
            )
        except (json.JSONDecodeError, KeyError, TypeError):
            summaries.append(f"#{i+1} ({to_iso(row.get('created_at'))}): [parse error]")

    return f"Found {len(rows)} analyses:\n" + "\n".join(summaries)


def _tool_search_resources(query: str) -> str:
    """Search RAG for learning resources."""
    if not rag_service:
        return "Resource search unavailable (RAG not initialized)."
    try:
        results = rag_service.get_prep_resources(query, 0, query, n=4)
        if not results:
            return f"No resources found for '{query}'."
        lines = []
        for r in results:
            m = r.get("metadata", r) if isinstance(r, dict) else {}
            lines.append(
                f"- {m.get('title', '?')} ({m.get('level', '?')}, {m.get('duration', '?')}): {m.get('url', '')}"
            )
        return "Resources found:\n" + "\n".join(lines)
    except Exception as e:
        return f"Resource search error: {str(e)[:100]}"


def _tool_search_companies(query: str) -> str:
    """Search RAG for company info."""
    if not rag_service:
        return "Company search unavailable."
    try:
        results = rag_service.get_company_insights("", query, n=3)
        if not results:
            return f"No company info found for '{query}'."
        lines = []
        for r in results:
            m = r.get("metadata", r) if isinstance(r, dict) else {}
            lines.append(
                f"- {m.get('company', '?')} ({m.get('tier', '?')}): "
                f"Rounds: {m.get('interview_rounds', '?')[:80]}. "
                f"Tips: {m.get('tips', '?')[:100]}"
            )
        return "Company info:\n" + "\n".join(lines)
    except Exception as e:
        return f"Company search error: {str(e)[:100]}"


def _tool_search_questions(query: str) -> str:
    """Search RAG for interview questions."""
    if not rag_service:
        return "Question search unavailable."
    try:
        results = rag_service.get_interview_questions(query, [query], n=4)
        if not results:
            return f"No questions found for '{query}'."
        lines = []
        for r in results:
            m = r.get("metadata", r) if isinstance(r, dict) else {}
            lines.append(
                f"- [{m.get('difficulty', '?')}] {m.get('question', '?')}\n"
                f"  Tip: {m.get('tip', '')[:100]}"
            )
        return "Practice questions:\n" + "\n".join(lines)
    except Exception as e:
        return f"Question search error: {str(e)[:100]}"


def _tool_set_goal(user_id: str, goal: str, target_date: str = "") -> str:
    """Set a new goal for the student."""
    _ensure_coach_tables()
    goal_id = str(uuid.uuid4())
    get_collection("coach_goals").insert_one({
        "_id": goal_id,
        "id": goal_id,
        "user_id": user_id,
        "goal": goal,
        "status": "active",
        "target_date": target_date or None,
        "created_at": utcnow(),
        "completed_at": None,
    })
    return f"Goal set: '{goal}'" + (f" (target: {target_date})" if target_date else "")


def _tool_get_goals(user_id: str) -> str:
    """Get active goals."""
    _ensure_coach_tables()
    rows = list(
        get_collection("coach_goals")
        .find({"user_id": user_id, "status": "active"})
        .sort("created_at", -1)
    )

    if not rows:
        return "No active goals set yet."

    lines = [f"Active goals ({len(rows)}):"]
    for row in rows:
        line = f"  [{row.get('id') or row['_id']}] {row['goal']}"
        if row.get("target_date"):
            line += f" (by {row['target_date']})"
        lines.append(line)
    return "\n".join(lines)


def _tool_complete_goal(user_id: str, goal_id: str) -> str:
    """Mark a goal as completed."""
    _ensure_coach_tables()
    get_collection("coach_goals").update_one(
        {"_id": goal_id, "user_id": user_id},
        {"$set": {"status": "completed", "completed_at": utcnow()}}
    )
    return f"Goal #{goal_id} marked as completed!"


def _execute_tool(tool_name: str, user_id: str, args: str) -> str:
    """Execute a tool and return the result."""
    if tool_name == "get_latest_analysis":
        return _tool_get_latest_analysis(user_id)
    elif tool_name == "get_analysis_history":
        return _tool_get_analysis_history(user_id)
    elif tool_name == "search_resources":
        return _tool_search_resources(args)
    elif tool_name == "search_companies":
        return _tool_search_companies(args)
    elif tool_name == "search_questions":
        return _tool_search_questions(args)
    elif tool_name == "set_goal":
        return _tool_set_goal(user_id, args)
    elif tool_name == "get_goals":
        return _tool_get_goals(user_id)
    elif tool_name == "complete_goal":
        return _tool_complete_goal(user_id, args)
    else:
        return f"Unknown tool: {tool_name}"


# ═══════════════════════════════════════════════════════════════════════════
# Agent Loop — ReAct pattern (Reason → Act → Observe → Respond)
# ═══════════════════════════════════════════════════════════════════════════

SYSTEM_PROMPT = f"""You are Placify AI Coach — a placement preparation agent for Indian engineering students.

You have access to these tools:
{TOOL_DESCRIPTIONS}

## How to use tools
When you need information, output a tool call in this EXACT format:
TOOL_CALL: tool_name | argument

Examples:
TOOL_CALL: get_latest_analysis |
TOOL_CALL: search_resources | python data structures
TOOL_CALL: set_goal | Complete 50 LeetCode problems by end of month
TOOL_CALL: search_companies | Google

You can make UP TO 2 tool calls per response. After each tool call, you'll receive the result and can use it in your answer.

## Personality
- Warm, supportive senior who's been through placements
- Specific and practical, never generic
- Reference actual data from tools, not guesses
- Keep responses concise (under 150 words)
- Always end with a specific next step the student can do TODAY
- Format final student-facing answers as Markdown: use **bold** for important terms, short bullet lists for steps, and no raw HTML or code fences unless sharing code.

## Important Rules
- ALWAYS use get_latest_analysis when a student asks about their profile/scores/readiness
- Use search_resources when recommending learning materials
- Use set_goal when a student mentions wanting to achieve something
- If the student hasn't done an analysis yet, suggest they upload a resume first"""


async def _agent_loop(user_id: str, message: str, history: list[dict]) -> str:
    """Execute the ReAct agent loop with tool calling."""
    if not llm_service or not llm_service.is_available():
        raise HTTPException(503, "Career coach requires an AI provider.")

    # Build conversation context from DB history
    recent = history[-8:]
    conv_text = "\n".join(f"{'Student' if m['role']=='user' else 'Coach'}: {m['content']}" for m in recent)

    prompt = f"""Conversation history:
{conv_text}

Student's new message: {message}

Respond helpfully. Use tools if you need data. Format tool calls as TOOL_CALL: name | args"""

    # Step 1: Initial LLM call (may contain tool calls)
    response = await llm_service.generate(prompt=prompt, system=SYSTEM_PROMPT)
    if not response:
        raise HTTPException(503, "Could not generate response.")

    # Step 2: Check for tool calls and execute them (up to 2 rounds)
    tool_results = []
    for _ in range(2):
        tool_matches = re.findall(r'TOOL_CALL:\s*(\w+)\s*\|\s*(.*?)(?:\n|$)', response)
        if not tool_matches:
            break

        for tool_name, tool_args in tool_matches:
            tool_name = tool_name.strip()
            tool_args = tool_args.strip()
            if tool_name in TOOLS:
                result = _execute_tool(tool_name, user_id, tool_args)
                tool_results.append(f"[Tool: {tool_name}] → {result}")
                logger.info("agent_tool user=%s tool=%s", user_id, tool_name)

        if not tool_results:
            break

        # Step 3: Feed tool results back to LLM for final answer
        followup = f"""{prompt}

Your previous response: {response}

Tool results:
{chr(10).join(tool_results)}

Now write your FINAL response to the student using the tool results above.
Do NOT include any TOOL_CALL lines. Just respond naturally using the data."""

        response = await llm_service.generate(prompt=followup, system=SYSTEM_PROMPT)
        if not response:
            break
        tool_results.clear()  # Don't re-process

    # Clean any remaining tool call lines from the response
    clean = re.sub(r'TOOL_CALL:.*?(?:\n|$)', '', response).strip()
    return clean if clean else response


# ═══════════════════════════════════════════════════════════════════════════
# API Endpoints
# ═══════════════════════════════════════════════════════════════════════════

class ChatMessage(BaseModel):
    message: str = Field(min_length=1, max_length=2000)


@router.post("/chat")
async def coach_chat(req: ChatMessage, current_user: dict = Depends(get_current_user)):
    """Send a message to the career coach agent."""
    user_id = str(current_user["id"])
    _ensure_coach_tables()

    # Load history from DB
    rows = list(
        get_collection("coach_messages")
        .find({"user_id": user_id})
        .sort("created_at", -1)
        .limit(12)
    )
    history = [{"role": r["role"], "content": r["content"]} for r in reversed(rows)]

    # Run agent loop
    reply = await _agent_loop(user_id, req.message, history)

    # Save to DB
    messages = get_collection("coach_messages")
    now = utcnow()
    messages.insert_many([
        {
            "_id": str(uuid.uuid4()),
            "user_id": user_id,
            "role": "user",
            "content": req.message,
            "created_at": now,
        },
        {
            "_id": str(uuid.uuid4()),
            "user_id": user_id,
            "role": "coach",
            "content": reply,
            "created_at": utcnow(),
        },
    ])

    # Generate suggestions
    suggestions = await _generate_suggestions(req.message, reply)

    logger.info("coach_chat user=%s history=%d", user_id, len(history) + 2)
    return {"reply": reply, "suggestions": suggestions}


@router.get("/history")
async def get_history(current_user: dict = Depends(get_current_user)):
    """Get persistent conversation history."""
    user_id = str(current_user["id"])
    _ensure_coach_tables()
    rows = list(
        get_collection("coach_messages")
        .find({"user_id": user_id})
        .sort("created_at", 1)
        .limit(50)
    )
    return {"messages": [{"role": r["role"], "text": r["content"], "time": to_iso(r.get("created_at"))} for r in rows]}


@router.delete("/history")
async def clear_history(current_user: dict = Depends(get_current_user)):
    """Clear conversation history from DB."""
    user_id = str(current_user["id"])
    get_collection("coach_messages").delete_many({"user_id": user_id})
    return {"message": "Conversation history cleared"}


@router.get("/goals")
async def list_goals(current_user: dict = Depends(get_current_user)):
    """Get the user's goals."""
    user_id = str(current_user["id"])
    _ensure_coach_tables()
    rows = list(
        get_collection("coach_goals")
        .find({"user_id": user_id})
        .sort("created_at", -1)
    )
    goals = []
    for row in rows:
        goals.append({
            "id": row.get("id") or str(row["_id"]),
            "goal": row.get("goal"),
            "status": row.get("status", "active"),
            "target_date": row.get("target_date"),
            "created_at": to_iso(row.get("created_at")),
            "completed_at": to_iso(row.get("completed_at")),
        })
    return {"goals": goals}


@router.get("/status")
def coach_status():
    """Check if career coach is available."""
    available = bool(llm_service and llm_service.is_available())
    return {
        "available": available,
        "features": {
            "tool_calling": available,
            "db_memory": True,
            "goal_tracking": True,
            "rag_grounded": bool(rag_service),
            "analysis_access": True,
        },
        "message": "AI Career Coach Agent is ready." if available
                   else "Configure a GEMINI_API_KEY or GROQ_API_KEY to enable."
    }


async def _generate_suggestions(message: str, reply: str) -> list[str]:
    """Generate follow-up suggestion chips."""
    if not llm_service or not llm_service.is_available():
        return ["What are my weak areas?", "Help me build a study plan", "Set a goal for me"]
    try:
        result = await llm_service.generate_json(
            prompt=f"""Student: {message[:150]}\nCoach: {reply[:200]}\n\nGenerate 3 short follow-up questions (under 12 words each).\nReturn JSON: {{"suggestions": ["q1", "q2", "q3"]}}""",
            system="Generate natural follow-up questions."
        )
        if result and "suggestions" in result:
            return result["suggestions"][:3]
    except Exception:
        pass
    return ["Tell me more", "What should I focus on?", "Show my progress"]
