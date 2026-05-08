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
from datetime import datetime
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

router = APIRouter(prefix="/api/coach", tags=["coach"])
logger = logging.getLogger("placify.coach")


# ═══════════════════════════════════════════════════════════════════════════
# Database setup — persistent memory + goals
# ═══════════════════════════════════════════════════════════════════════════

def _ensure_coach_tables():
    """Create coach tables if they don't exist."""
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS coach_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS coach_goals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            goal TEXT NOT NULL,
            status TEXT DEFAULT 'active',
            target_date TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            completed_at TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_coach_messages_user_id ON coach_messages(user_id)")
    conn.commit()
    conn.close()


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
    conn = get_db()
    row = conn.execute(
        "SELECT results, created_at FROM analyses WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
        (user_id,)
    ).fetchone()
    conn.close()

    if not row:
        return "No analysis found. The student hasn't uploaded a resume yet."

    try:
        results = json.loads(row["results"])
        summary_parts = [
            f"Analysis from: {row['created_at']}",
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
    except (json.JSONDecodeError, KeyError):
        return "Analysis found but could not parse results."


def _tool_get_analysis_history(user_id: str) -> str:
    """Get all past analyses to show progress."""
    conn = get_db()
    rows = conn.execute(
        "SELECT results, created_at FROM analyses WHERE user_id = ? ORDER BY created_at DESC LIMIT 10",
        (user_id,)
    ).fetchall()
    conn.close()

    if not rows:
        return "No analysis history. The student hasn't done any analyses yet."

    summaries = []
    for i, row in enumerate(rows):
        try:
            r = json.loads(row["results"])
            summaries.append(
                f"#{i+1} ({row['created_at']}): "
                f"Role={r.get('predicted_role','?')}, "
                f"Readiness={r.get('industry_readiness',0)}%, "
                f"Resume={r.get('resume_strength',0)}%"
            )
        except (json.JSONDecodeError, KeyError):
            summaries.append(f"#{i+1} ({row['created_at']}): [parse error]")

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
    conn = get_db()
    _ensure_coach_tables()
    conn.execute(
        "INSERT INTO coach_goals (user_id, goal, target_date) VALUES (?, ?, ?)",
        (user_id, goal, target_date or None)
    )
    conn.commit()
    conn.close()
    return f"Goal set: '{goal}'" + (f" (target: {target_date})" if target_date else "")


def _tool_get_goals(user_id: str) -> str:
    """Get active goals."""
    conn = get_db()
    _ensure_coach_tables()
    rows = conn.execute(
        "SELECT id, goal, target_date, created_at FROM coach_goals WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC",
        (user_id,)
    ).fetchall()
    conn.close()

    if not rows:
        return "No active goals set yet."

    lines = [f"Active goals ({len(rows)}):"]
    for row in rows:
        line = f"  [{row['id']}] {row['goal']}"
        if row["target_date"]:
            line += f" (by {row['target_date']})"
        lines.append(line)
    return "\n".join(lines)


def _tool_complete_goal(user_id: str, goal_id: str) -> str:
    """Mark a goal as completed."""
    conn = get_db()
    _ensure_coach_tables()
    conn.execute(
        "UPDATE coach_goals SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
        (goal_id, user_id)
    )
    conn.commit()
    conn.close()
    return f"Goal #{goal_id} marked as completed! 🎉"


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
    conn = get_db()
    rows = conn.execute(
        "SELECT role, content FROM coach_messages WHERE user_id = ? ORDER BY created_at DESC LIMIT 12",
        (user_id,)
    ).fetchall()
    history = [{"role": r["role"], "content": r["content"]} for r in reversed(rows)]

    # Run agent loop
    reply = await _agent_loop(user_id, req.message, history)

    # Save to DB
    conn = get_db()
    conn.execute("INSERT INTO coach_messages (user_id, role, content) VALUES (?, 'user', ?)", (user_id, req.message))
    conn.execute("INSERT INTO coach_messages (user_id, role, content) VALUES (?, 'coach', ?)", (user_id, reply))
    conn.commit()
    conn.close()

    # Generate suggestions
    suggestions = await _generate_suggestions(req.message, reply)

    logger.info("coach_chat user=%s history=%d", user_id, len(history) + 2)
    return {"reply": reply, "suggestions": suggestions}


@router.get("/history")
async def get_history(current_user: dict = Depends(get_current_user)):
    """Get persistent conversation history."""
    user_id = str(current_user["id"])
    _ensure_coach_tables()
    conn = get_db()
    rows = conn.execute(
        "SELECT role, content, created_at FROM coach_messages WHERE user_id = ? ORDER BY created_at ASC LIMIT 50",
        (user_id,)
    ).fetchall()
    conn.close()
    return {"messages": [{"role": r["role"], "text": r["content"], "time": r["created_at"]} for r in rows]}


@router.delete("/history")
async def clear_history(current_user: dict = Depends(get_current_user)):
    """Clear conversation history from DB."""
    user_id = str(current_user["id"])
    conn = get_db()
    conn.execute("DELETE FROM coach_messages WHERE user_id = ?", (user_id,))
    conn.commit()
    conn.close()
    return {"message": "Conversation history cleared"}


@router.get("/goals")
async def list_goals(current_user: dict = Depends(get_current_user)):
    """Get the user's goals."""
    user_id = str(current_user["id"])
    _ensure_coach_tables()
    conn = get_db()
    rows = conn.execute(
        "SELECT id, goal, status, target_date, created_at, completed_at FROM coach_goals WHERE user_id = ? ORDER BY created_at DESC",
        (user_id,)
    ).fetchall()
    conn.close()
    return {"goals": [dict(r) for r in rows]}


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
