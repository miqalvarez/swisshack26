"""LangGraph orchestrator — wires all agents into the advisory workflow.

Graph (from graph.png):
  START → Get client DNA → Get CIO plan → Get current invest. plan
       → Fetch news by GraphRAG
       → Check if actions needed ──→ (no) ──→ END
       → Create action plan suggestion
       → Explain action plan
       → Wealth Manager (HITL) ──→ (reject) ──→ END
       → Evaluate plan quality ──→ END
"""

from __future__ import annotations

from langgraph.graph import END, StateGraph
from langgraph.graph.state import CompiledStateGraph

from src.graph.state import AdvisoryState
from src.graph.agents.client_dna import get_client_dna
from src.graph.agents.cio_plan import get_cio_plan
from src.graph.agents.invest_plan import get_current_plan
from src.graph.agents.news_fetch import fetch_news
from src.graph.agents.check_actions import check_actions
from src.graph.agents.create_plan import create_plan
from src.graph.agents.explain_plan import explain_plan
from src.graph.agents.evaluate_plan import evaluate_plan


def should_continue_after_check(state: AdvisoryState) -> str:
    if not state.get("actions_needed", False):
        return "end"
    return "create_plan"


def should_continue_after_hitl(state: AdvisoryState) -> str:
    decision = state.get("wm_decision", "pending")
    if decision == "reject":
        return "end"
    return "evaluate"


def build_graph() -> CompiledStateGraph:
    graph = StateGraph(AdvisoryState)

    # ── Add agent nodes ────────────────────────────────────────────
    graph.add_node("get_client_dna", get_client_dna)
    graph.add_node("get_cio_plan", get_cio_plan)
    graph.add_node("get_current_plan", get_current_plan)
    graph.add_node("fetch_news", fetch_news)
    graph.add_node("check_actions", check_actions)
    graph.add_node("create_plan", create_plan)
    graph.add_node("explain_plan", explain_plan)
    graph.add_node("evaluate_plan", evaluate_plan)

    # ── Define edges ───────────────────────────────────────────────
    # Sequential: START → DNA → CIO → Plan → News → Check
    graph.set_entry_point("get_client_dna")
    graph.add_edge("get_client_dna", "get_cio_plan")
    graph.add_edge("get_cio_plan", "get_current_plan")
    graph.add_edge("get_current_plan", "fetch_news")
    graph.add_edge("fetch_news", "check_actions")

    # Conditional: if no actions needed → END, else → create plan
    graph.add_conditional_edges(
        "check_actions",
        should_continue_after_check,
        {"create_plan": "create_plan", "end": END},
    )

    graph.add_edge("create_plan", "explain_plan")
    # explain_plan → END (WM reviews asynchronously via HITL)
    graph.add_edge("explain_plan", END)

    # After WM HITL decision → evaluate or END
    # ( HITL is handled via the API; the graph resumes from evaluate_plan )
    graph.add_conditional_edges(
        "evaluate_plan",
        lambda _: END,
    )

    return graph.compile()


# ── Compiled graph singleton ───────────────────────────────────────
advisory_graph = build_graph()