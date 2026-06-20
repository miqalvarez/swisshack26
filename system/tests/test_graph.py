"""Tests for the LangGraph advisory orchestrator."""

from __future__ import annotations

import pytest


def test_graph_compiles():
    """Verify the graph compiles and has the expected nodes."""
    from src.graph.orchestrator import advisory_graph

    node_names = set(advisory_graph.nodes.keys())
    expected = {
        "get_client_dna",
        "get_cio_plan",
        "get_current_plan",
        "fetch_news",
        "check_actions",
        "create_plan",
        "explain_plan",
        "evaluate_plan",
    }
    assert expected.issubset(node_names), f"Missing nodes: {expected - node_names}"


def test_conditional_edges_no_actions():
    """When actions_needed is False, the graph should route to END."""
    from src.graph.orchestrator import should_continue_after_check

    state = {"actions_needed": False}
    assert should_continue_after_check(state) == "end"


def test_conditional_edges_actions_needed():
    """When actions_needed is True, route to create_plan."""
    from src.graph.orchestrator import should_continue_after_check

    state = {"actions_needed": True}
    assert should_continue_after_check(state) == "create_plan"


def test_hitl_reject():
    """When WM rejects, the graph should end."""
    from src.graph.orchestrator import should_continue_after_hitl

    state = {"wm_decision": "reject"}
    assert should_continue_after_hitl(state) == "end"


def test_hitl_apply():
    """When WM applies, evaluate plan quality."""
    from src.graph.orchestrator import should_continue_after_hitl

    state = {"wm_decision": "apply"}
    assert should_continue_after_hitl(state) == "evaluate"


def test_state_schema():
    """Verify the state has all expected keys."""
    from src.graph.state import AdvisoryState

    expected_keys = {
        "trigger_type",
        "customer_id",
        "client_dna",
        "cio_plan",
        "current_plan",
        "news_context",
        "actions_needed",
        "actions_reasoning",
        "suggestion",
        "explanation",
        "client_message",
        "wm_decision",
        "quality_score",
        "quality_notes",
        "messages",
    }
    state_keys = set(AdvisoryState.__annotations__.keys())
    assert expected_keys.issubset(state_keys), f"Missing keys: {expected_keys - state_keys}"