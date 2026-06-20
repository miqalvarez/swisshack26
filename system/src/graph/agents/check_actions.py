"""Agent: Check if actions needed.

Uses the LLM to determine whether the current events and portfolio
drift require an advisory action, or whether the situation is stable
and no intervention is needed.
"""

from __future__ import annotations

from src.config import get_llm
from src.graph.state import AdvisoryState


CHECK_ACTIONS_PROMPT = """You are a wealth advisory decision agent.
Given the client profile, CIO mandate, current portfolio, and relevant news,
decide whether an advisory action (suggestion) is needed.

Client DNA: {client_dna}
CIO Plan: {cio_plan}
Current Plan: {current_plan}
News Context: {news_context}

Respond with a JSON object:
{{
  "actions_needed": true/false,
  "reasoning": "brief explanation"
}}"""


async def check_actions(state: AdvisoryState) -> dict:
    llm = get_llm()
    prompt = CHECK_ACTIONS_PROMPT.format(
        client_dna=state.get("client_dna", {}),
        cio_plan=state.get("cio_plan", {}),
        current_plan=state.get("current_plan", {}),
        news_context=state.get("news_context", []),
    )

    response = await llm.ainvoke(prompt)
    content = response.content

    import json
    try:
        result = json.loads(content)
    except json.JSONDecodeError:
        result = {"actions_needed": False, "reasoning": "Could not parse LLM response"}

    return {
        "actions_needed": result.get("actions_needed", False),
        "actions_reasoning": result.get("reasoning", ""),
        "messages": state.get("messages", []) + [
            {"role": "assistant", "content": f"Actions needed: {result}"},
        ],
    }