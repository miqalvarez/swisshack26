"""Microsoft GraphRAG client.

Connects to a local GraphRAG instance for semantic news retrieval
and knowledge-graph queries. The instance runs via Docker Compose
(see docker-compose.yml).
"""

from __future__ import annotations

from src.config import settings


async def query_graphrag(query: str, top_k: int = 10) -> list[dict]:
    """Query the local GraphRAG instance for relevant context.

    Falls back to an empty result set if the instance is not running.
    """
    import httpx

    url = f"{settings.graphrag_api_url.rstrip('/')}/query"
    payload = {"query": query, "top_k": top_k}

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            return resp.json().get("result", [])
    except (httpx.ConnectError, httpx.TimeoutException) as exc:
        import logging

        logging.getLogger(__name__).warning(
            "GraphRAG not available at %s: %s. Returning empty results.",
            settings.graphrag_api_url,
            exc,
        )
        return []


async def index_documents(documents: list[dict]) -> dict:
    """Index documents into the GraphRAG instance."""
    import httpx

    url = f"{settings.graphrag_api_url.rstrip('/')}/index"
    payload = {"documents": documents}

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(url, json=payload)
        resp.raise_for_status()
        return resp.json()


async def health() -> dict:
    """Check GraphRAG instance health."""
    import httpx

    url = f"{settings.graphrag_api_url.rstrip('/')}/health"

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            return resp.json()
    except (httpx.ConnectError, httpx.TimeoutException):
        return {"status": "unavailable"}