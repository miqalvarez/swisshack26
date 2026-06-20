"""LangGraph state definition for the wealth advisory multi-agent system.

Each circle in graph.png maps to a key in this state.
"""

from __future__ import annotations

from typing import TypedDict


class AdvisoryState(TypedDict, total=False):
    # ── Triggers ────────────────────────────────────────────────────
    trigger_type: str
    # One of: "update_cio" | "update_user" | "wm_request" | "periodic_news"

    customer_id: str

    # ── Agent outputs (filled sequentially by the graph) ───────────
    # 1. Get client DNA
    client_dna: dict
    # 2. Get CIO plan
    cio_plan: dict
    # 3. Get current investment plan
    current_plan: dict
    # 4. Fetch news by GraphRAG
    news_context: list[dict]
    # 5. Check if actions needed
    actions_needed: bool
    actions_reasoning: str
    # 6. Create action plan / suggestion
    suggestion: dict
    # 7. Explain action plan
    explanation: str
    client_message: str
    # 8. Wealth Manager HITL decision
    wm_decision: str
    # 9. Evaluate plan quality
    quality_score: float
    quality_notes: str

    # ── Accumulated messages (LangGraph convention) ────────────────
    messages: list[dict]