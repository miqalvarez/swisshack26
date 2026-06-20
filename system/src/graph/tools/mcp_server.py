"""SIX MCP Server client — instrumented but not yet connected.

The MCP (Model Context Protocol) server provides structured
access to SIX proprietary data: CIO mandates, market data,
client portfolio details, and more.

When access is available, configure the URL and API key in .env
and the client will be operational.
"""

from __future__ import annotations

from src.config import settings


async def mcp_query(method: str, params: dict | None = None) -> dict:
    """Send a JSON-RPC request to the SIX MCP Server.

    Currently raises NotImplementedError because the MCP server
    is not yet accessible. When credentials are provided via
    .env, this function will route requests through it.
    """
    if not settings.six_mcp_server_url:
        raise NotImplementedError(
            "SIX MCP Server not configured. Set SIX_MCP_SERVER_URL "
            "and SIX_MCP_SERVER_API_KEY in .env when access is granted."
        )

    import httpx

    url = settings.six_mcp_server_url.rstrip("/") + "/mcp"
    headers = {
        "Authorization": f"Bearer {settings.six_mcp_server_api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "jsonrpc": "2.0",
        "method": method,
        "params": params or {},
        "id": 1,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(url, headers=headers, json=payload)
        resp.raise_for_status()
        return resp.json()


# ── Convenience wrappers for the MCP tools we expect ──────────────

async def mcp_get_cio_mandate(customer_id: str) -> dict:
    return await mcp_query("cio_mandate", {"customer_id": customer_id})


async def mcp_get_portfolio(customer_id: str) -> dict:
    return await mcp_query("portfolio", {"customer_id": customer_id})


async def mcp_get_client_profile(customer_id: str) -> dict:
    return await mcp_query("client_profile", {"customer_id": customer_id})


async def mcp_get_market_data(query: str) -> dict:
    return await mcp_query("market_data", {"query": query})