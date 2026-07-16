import pytest
from unittest.mock import patch
from backend.agents.synthesis import run_synthesis
from backend.orchestration.pipeline import create_initial_state
from backend.data.models import PaperMeta, FieldRecord

@patch('backend.clients.claude_client.ClaudeClient.complete')
def test_synthesis_agent_flow(mock_complete):
    """
    Test synthesis agent with mocked LLM summary generation.
    """
    # Mock LLM summary response
    mock_complete.return_value = "This paper introduces the Transformer model [Source: Method]. It is evaluated on the translation task [Source: Dataset]."
    
    state = create_initial_state("attention mechanisms")
    state["papers"] = [
        PaperMeta(
            id="test-paper-1",
            title="Attention is All You Need",
            authors=["Ashish Vaswani"],
            year=2017,
            venue="NeurIPS",
            abstract="We propose the Transformer...",
            pdf_url="http://example.com/test.pdf",
            source="arxiv"
        )
    ]
    state["extracted_fields"] = [
        FieldRecord(
            paper_id="test-paper-1",
            method="Transformer",
            dataset="translation task",
            key_metric="Not specified",
            limitation="Not specified",
            year=2017,
            verification_status="verified",
            verification_notes="Verified",
            abstract_only=False
        )
    ]
    
    updated_state = run_synthesis(state)
    
    assert updated_state["agent_status"]["synthesis"] == "done"
    assert len(updated_state["summaries"]) == 1
    
    summary = updated_state["summaries"][0]
    assert summary.paper_id == "test-paper-1"
    assert "Transformer model" in summary.summary_text
    assert len(summary.attributions) == 2
    assert summary.attributions[0]["source"] == "Method"
    assert summary.attributions[1]["source"] == "Dataset"
    
    # Check comparison table structure
    assert len(updated_state["comparison_table"]) == 1
    row = updated_state["comparison_table"][0]
    assert row["id"] == "test-paper-1"
    assert row["method"] == "Transformer"
    assert row["dataset"] == "translation task"
    assert row["verification_status"] == "verified"
