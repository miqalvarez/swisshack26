"""Agent: Fetch news by GraphRAG.

Queries the Microsoft GraphRAG instance for relevant news
matching the client's portfolio and profile, then enriches
the results with structured market data from the news endpoint.
"""

from __future__ import annotations

from src.config import settings
from src.graph.state import AdvisoryState
from src.graph.tools.graphrag import query_graphrag


async def fetch_news(state: AdvisoryState) -> dict:
    import httpx

    client_dna = state.get("client_dna", {})
    current_plan = state.get("current_plan", {})
    customer_id = state.get("customer_id", "")

    # Build a query from portfolio holdings and client profile
    holdings = current_plan.get("holdings", [])
    holding_names = [h["name"] for h in holdings[:10]]
    query = " ".join(holding_names) or "market events wealth management"

    # 1. Query GraphRAG for semantic news context
    graphrag_results = await query_graphrag(query)

    # 2. Fetch structured news from the workbench API
    async with httpx.AsyncClient(base_url=settings.workbench_api_url) as client:
        resp = await client.get("/api/dashboard")
        resp.raise_for_status()
        dashboard = resp.json()

    relevant_news = [
        n for n in dashboard.get("news", [])
        if n.get("customer_id") == customer_id
    ]

    return {
        "news_context": relevant_news,
        "messages": state.get("messages", []) + [
            {"role": "system", "content": f"GraphRAG context: {graphrag_results[:2000]}"},
            {"role": "system", "content": f"Structured news items: {len(relevant_news)}"},
        ],
    }