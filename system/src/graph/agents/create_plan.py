"""Agent: Create action plan / suggestion.

Generates a specific suggestion: what holding to replace, with what,
and why — plus a tailored client message in the client's
communication style.
"""

from __future__ import annotations

from src.config import get_llm
from src.graph.state import AdvisoryState


CREATE_PLAN_PROMPT = """You are a wealth advisory suggestion agent.
Based on the client profile, portfolio, and news context, create a
concrete action suggestion.

Client DNA: {client_dna}
CIO Plan: {cio_plan}
Current Plan: {current_plan}
News Context: {news_context}
Actions Reasoning: {actions_reasoning}

The client's communication style is: {communication_style}
- formal-data: formal, data-driven, references risk metrics
- warm-personal: warm, personal, conversational
- values-narrative: narrative, purpose-driven, focuses on values alignment
- executive-brief: concise, direct, bottom-line oriented

Respond with a JSON object:
{{
  "recommendation_action": "e.g. Swap within sleeve",
  "recommendation_description": "what to do",
  "why_title": "short title for the reason",
  "why_description": "why it fits",
  "potential_impact_description": "impact explanation",
  "exposure": 0.0,
  "old_holding_name": "name of holding to replace",
  "new_holding_name": "name of replacement",
  "new_holding_description": "description",
  "new_holding_amount": 0,
  "new_holding_type": "stock|bond|fund|cash|other",
  "client_message": "tailored message to the client in their communication style"
}}"""


async def create_plan(state: AdvisoryState) -> dict:
    llm = get_llm()
    communication_style = (
        state.get("client_dna", {}).get("communication_style", "formal-data")
    )

    prompt = CREATE_PLAN_PROMPT.format(
        client_dna=state.get("client_dna", {}),
        cio_plan=state.get("cio_plan", {}),
        current_plan=state.get("current_plan", {}),
        news_context=state.get("news_context", []),
        actions_reasoning=state.get("actions_reasoning", ""),
        communication_style=communication_style,
    )

    response = await llm.ainvoke(prompt)
    content = response.content

    import json
    try:
        suggestion = json.loads(content)
    except json.JSONDecodeError:
        suggestion = {
            "recommendation_action": "No action",
            "recommendation_description": "Could not parse LLM response",
            "why_title": None,
            "why_description": None,
            "potential_impact_description": "",
            "exposure": 0,
            "old_holding_name": None,
            "new_holding_name": "N/A",
            "new_holding_description": "",
            "new_holding_amount": 0,
            "new_holding_type": "other",
            "client_message": "",
        }

    return {
        "suggestion": suggestion,
        "client_message": suggestion.get("client_message", ""),
        "messages": state.get("messages", [])
        + [{"role": "assistant", "content": f"Suggestion created: {suggestion.get('recommendation_action', 'N/A')}"}],
    }