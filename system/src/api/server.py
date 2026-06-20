"""FastAPI server — exposes the advisory system as a REST API.

Endpoints mirror the workbench server and add the multi-agent
trigger endpoint that the WM dashboard can call.
"""

from __future__ import annotations

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from src.config import settings
from src.graph.orchestrator import advisory_graph
from src.graph.state import AdvisoryState
from src.graph.tools.graphrag import health as graphrag_health

app = FastAPI(
    title="SwissHack26 Advisory System",
    version="0.1.0",
    description="Multi-agent wealth advisory system powered by LangGraph",
)


class TriggerRequest(BaseModel):
    customer_id: str
    trigger_type: str = "wm_request"
    # One of: "update_cio" | "update_user" | "wm_request" | "periodic_news"


class HitlDecisionRequest(BaseModel):
    thread_id: str
    decision: str  # "apply" | "reject"


class ApiResponse(BaseModel):
    ok: bool
    detail: str | None = None


@app.get("/api/system/health")
async def system_health():
    gr = await graphrag_health()
    return {
        "status": "ok",
        "workbench_api": settings.workbench_api_url,
        "llm_configured": bool(settings.llm_api_key),
        "mcp_configured": bool(settings.six_mcp_server_url),
        "graphrag": gr,
    }


@app.post("/api/system/trigger")
async def trigger_advisory(req: TriggerRequest):
    """Run the full advisory pipeline for a given client."""
    initial_state: AdvisoryState = {
        "customer_id": req.customer_id,
        "trigger_type": req.trigger_type,
    }
    try:
        result = await advisory_graph.ainvoke(initial_state)
        return {"ok": True, "state": result}
    except NotImplementedError as exc:
        raise HTTPException(status_code=501, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/system/hitl")
async def hitl_decision(req: HitlDecisionRequest):
    """Receive WM decision after HITL review."""
    return {"ok": True, "detail": f"Decision '{req.decision}' recorded for thread {req.thread_id}"}