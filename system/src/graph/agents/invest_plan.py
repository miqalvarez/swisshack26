"""Agent: Get current investment plan.

Fetches the client's current portfolio (holdings + drift status)
so the system can compare it against the CIO mandate.
"""

from __future__ import annotations

from src.config import settings
from src.graph.state import AdvisoryState


async def get_current_plan(state: AdvisoryState) -> dict:
    import httpx

    customer_id = state.get("customer_id", "")
    async with httpx.AsyncClient(base_url=settings.workbench_api_url) as client:
        resp = await client.get(f"/api/customers/{customer_id}")
        resp.raise_for_status()
        detail = resp.json()

    return {
        "current_plan": {
            "holdings": detail.get("holdings", []),
            "drift": detail.get("drift", {}),
            "total_value": detail.get("total_value", 0),
            "pending_suggestions": detail.get("pending_suggestions", 0),
        },
    }