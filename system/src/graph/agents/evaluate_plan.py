"""Agent: Evaluate plan quality.

After the WM has accepted/rejected the suggestion, this agent
evaluates the quality of the final plan to provide a score
and improvement notes.
"""

from __future__ import annotations

from src.config import get_llm
from src.graph.state import AdvisoryState


EVALUATE_PLAN_PROMPT = """You are a quality evaluator for wealth advisory suggestions.
Score the following suggestion on a scale of 0-10 and provide notes.

Client DNA: {client_dna}
CIO Plan: {cio_plan}
Suggestion: {suggestion}
WM decision: {wm_decision}

Respond with JSON:
{{
  "quality_score": 0.0,
  "quality_notes": "explanation"
}}"""


async def evaluate_plan(state: AdvisoryState) -> dict:
    llm = get_llm()

    prompt = EVALUATE_PLAN_PROMPT.format(
        client_dna=state.get("client_dna", {}),
        cio_plan=state.get("cio_plan", {}),
        suggestion=state.get("suggestion", {}),
        wm_decision=state.get("wm_decision", "pending"),
    )

    response = await llm.ainvoke(prompt)
    content = response.content

    import json
    try:
        result = json.loads(content)
    except json.JSONDecodeError:
        result = {"quality_score": 0.0, "quality_notes": "Could not parse evaluation"}

    return {
        "quality_score": result.get("quality_score", 0.0),
        "quality_notes": result.get("quality_notes", ""),
    }