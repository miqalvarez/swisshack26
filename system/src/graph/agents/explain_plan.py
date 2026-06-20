"""Agent: Explain action plan.

Takes the suggestion and generates a human-readable explanation
plus a client-facing message, tailored to the client's
communication style.
"""

from __future__ import annotations

from src.config import get_llm
from src.graph.state import AdvisoryState


EXPLAIN_PLAN_PROMPT = """You are a wealth advisory communication agent.
Given the suggestion, produce:

1. A clear WM-facing explanation of the action plan.
2. A client-facing message in the client's communication style.

Client communication style: {communication_style}
Suggestion: {suggestion}

Respond with JSON:
{{
  "explanation": "WM-facing explanation",
  "client_message": "Client-facing message in their style"
}}"""


async def explain_plan(state: AdvisoryState) -> dict:
    llm = get_llm()
    communication_style = (
        state.get("client_dna", {}).get("communication_style", "formal-data")
    )

    prompt = EXPLAIN_PLAN_PROMPT.format(
        communication_style=communication_style,
        suggestion=state.get("suggestion", {}),
    )

    response = await llm.ainvoke(prompt)
    content = response.content

    import json
    try:
        result = json.loads(content)
    except json.JSONDecodeError:
        result = {
            "explanation": content,
            "client_message": state.get("client_message", ""),
        }

    return {
        "explanation": result.get("explanation", ""),
        "client_message": result.get("client_message", state.get("client_message", "")),
        "messages": state.get("messages", [])
        + [{"role": "assistant", "content": f"Plan explained: {result.get('explanation', '')[:200]}"}],
    }