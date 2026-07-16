import pytest
from backend.agents.planner import run_planner
from backend.orchestration.pipeline import create_initial_state

def test_planner_basic():
    """
    Test that the Planner Agent correctly processes a valid query, decomposes it,
    and updates the state status to 'done'.
    """
    state = create_initial_state("transformers in NLP")
    updated_state = run_planner(state)
    
    assert updated_state["agent_status"]["planner"] == "done"
    assert len(updated_state["sub_queries"]) >= 2
    for sq in updated_state["sub_queries"]:
        assert isinstance(sq, str)
        assert len(sq.strip()) > 0

def test_planner_empty_query():
    """
    Test that the Planner Agent raises ValueError and sets status to 'error' for empty queries.
    """
    state = create_initial_state("")
    with pytest.raises(ValueError):
        run_planner(state)
    
    assert state["agent_status"]["planner"] == "error"

def test_planner_whitespace_query():
    """
    Test that the Planner Agent raises ValueError for queries containing only whitespace.
    """
    state = create_initial_state("    ")
    with pytest.raises(ValueError):
        run_planner(state)
    
    assert state["agent_status"]["planner"] == "error"
