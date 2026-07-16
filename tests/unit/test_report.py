import os
import pytest
from backend.agents.report import run_report
from backend.orchestration.pipeline import create_initial_state
from backend.data.models import PaperMeta, GapClaim, Summary

def test_report_agent_flow():
    """
    Tests that the Report Agent successfully outputs DOCX and PDF documents.
    """
    state = create_initial_state("attention mechanisms")
    state["summaries"] = [
        Summary(
            paper_id="test-paper-1",
            title="Attention is All You Need",
            summary_text="This paper introduces the Transformer model [Source: Method]. It is evaluated on translation [Source: Dataset].",
            attributions=[{"sentence": "This paper...", "source": "Method"}]
        )
    ]
    state["comparison_table"] = [{
        "id": "test-paper-1",
        "title": "Attention is All You Need",
        "authors": ["Ashish Vaswani"],
        "year": 2017,
        "venue": "NeurIPS",
        "method": "Transformer",
        "dataset": "WMT 2014",
        "key_metric": "BLEU of 28.4",
        "limitation": "Quadratic memory scaling",
        "verification_status": "verified",
        "abstract_only": False
    }]
    state["gap_claims"] = [
        GapClaim(
            gap_id="GAP-01",
            topic_label="Efficient Attention",
            description="Topic showing low citation density.",
            citation_density=0.5,
            papers_in_cluster=["test-paper-1"],
            subgraph_snapshot={"nodes": [], "links": []},
            suggested_directions=["Study linear attention mechanisms."]
        )
    ]
    
    updated_state = run_report(state)
    
    assert updated_state["agent_status"]["report"] == "done"
    assert "report_draft" in updated_state
    draft = updated_state["report_draft"]
    assert "text" in draft
    assert "docx_path" in draft
    assert "pdf_path" in draft
    
    # Assert physical files exist
    assert os.path.exists(draft["docx_path"])
    assert os.path.exists(draft["pdf_path"])
    
    # Clean up files after test
    try:
        os.remove(draft["docx_path"])
        os.remove(draft["pdf_path"])
    except Exception:
        pass
