"""Agent: Get client DNA.

Fetches the full client profile: risk appetite, portfolio,
communication style, preferences — everything the advisory
system needs to personalise its output.
"""

from __future__ import annotations

from src.config import settings
from src.graph.state import AdvisoryState


async def get_client_dna(state: AdvisoryState) -> dict:
    import httpx

    customer_id = state.get("customer_id", "")
    async with httpx.AsyncClient(base_url=settings.workbench_api_url) as client:
        resp = await client.get(f"/api/customers/{customer_id}")
        resp.raise_for_status()
        detail = resp.json()

    customer = detail["customer"]
    return {
        "client_dna": {
            "id": customer["id"],
            "full_name": customer["full_name"],
            "persona": customer.get("persona"),
            "profile_description": customer.get("profile_description"),
            "communication_style": customer.get("communication_style"),
            "risk_profile": customer["risk_profile"],
            "mandate": customer["mandate"],
            "total_value": detail["total_value"],
            "holdings": detail.get("holdings", []),
            "drift": detail.get("drift", {}),
            "comments": detail.get("comments", [])[:5],
        },
    }