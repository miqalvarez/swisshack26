"""Agent: Get CIO plan.

Retrieves the CIO mandate for the client — investment universe,
rebalancing policy, and risk limits.
"""

from __future__ import annotations

from src.config import settings
from src.graph.state import AdvisoryState


async def get_cio_plan(state: AdvisoryState) -> dict:
    import httpx

    customer_id = state.get("customer_id", "")
    async with httpx.AsyncClient(base_url=settings.workbench_api_url) as client:
        resp = await client.get(f"/api/customers/{customer_id}")
        resp.raise_for_status()
        detail = resp.json()

    c = detail["customer"]
    return {
        "cio_plan": {
            "mandate": c["mandate"],
            "mandate_description": c.get("mandate_description"),
            "investment_universe": c.get("investment_universe"),
            "rebalancing_policy": c.get("rebalancing_policy"),
            "risk_limits": c.get("risk_limits"),
        },
    }