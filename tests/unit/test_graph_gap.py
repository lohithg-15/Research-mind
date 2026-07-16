import pytest
from unittest.mock import patch
from backend.agents.graph_gap import run_graph_gap
from backend.orchestration.pipeline import create_initial_state
from backend.data.models import PaperMeta

def create_mock_papers(count: int) -> list[PaperMeta]:
    """
    Creates a list of mock PaperMeta objects.
    """
    papers = []
    for i in range(count):
        # We group papers into different topics in their titles/abstracts to help the keyword fallback
        if i % 3 == 0:
            title = f"Attention mechanism study {i}"
            abstract = "This paper details attention mechanisms and transformer models for deep learning."
        elif i % 3 == 1:
            title = f"Optimization algorithm study {i}"
            abstract = "This research focuses on optimization and gradient descent algorithms."
        else:
            title = f"CNN Image classification study {i}"
            abstract = "An analysis of CNN architectures for image classification tasks."
            
        papers.append(PaperMeta(
            id=f"paper-{i}",
            title=title,
            authors=[f"Author A{i}", f"Author B{i}"],
            year=2020 + (i % 5),
            venue="arXiv" if i % 2 == 0 else "NeurIPS",
            abstract=abstract,
            pdf_url=None,
            full_text_available=False,
            citation_count=i * 2,  # Different citation counts
            citations=[f"paper-{(i+1)%count}"],
            source="arxiv"
        ))
    return papers

def test_graph_gap_agent_insufficient_data():
    """
    Checks that the agent skips gap detection if the corpus has fewer than 15 papers.
    """
    state = create_initial_state("attention mechanisms")
    state["papers"] = create_mock_papers(10)  # 10 papers (< 15)
    
    updated_state = run_graph_gap(state)
    
    assert updated_state["agent_status"]["graph_gap"] == "done"
    assert len(updated_state["gap_claims"]) == 0
    assert updated_state["graph_ref"] is None

@patch('backend.clients.claude_client.ClaudeClient.complete')
def test_graph_gap_agent_flow_fallback(mock_complete):
    """
    Test graph/gap agent flow when LLM call fails, checking keyword clustering and NetworkX graph construction.
    """
    # Cause Claude to raise an exception to trigger the fallback clustering
    mock_complete.side_effect = Exception("Claude unavailable")
    
    state = create_initial_state("attention mechanisms")
    state["papers"] = create_mock_papers(20)  # 20 papers (>= 15)
    
    updated_state = run_graph_gap(state)
    
    assert updated_state["agent_status"]["graph_gap"] == "done"
    assert len(updated_state["gap_claims"]) > 0
    assert updated_state["graph_ref"] is not None
    
    # Verify graph ref has nodes and edges
    graph_data = updated_state["graph_ref"]
    assert "nodes" in graph_data
    assert "edges" in graph_data  # NetworkX node_link_data uses 'edges'
    assert len(graph_data["nodes"]) > 20  # papers + authors + topics
    
    # Check that gap claims contain subgraph snapshots
    gap = updated_state["gap_claims"][0]
    assert gap.gap_id.startswith("GAP-")
    assert gap.subgraph_snapshot is not None
    assert "nodes" in gap.subgraph_snapshot
    assert "edges" in gap.subgraph_snapshot
