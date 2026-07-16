import pytest
from unittest.mock import patch, MagicMock
from backend.agents.extraction import run_extraction, verify_grounding
from backend.orchestration.pipeline import create_initial_state
from backend.data.models import PaperMeta

def test_verify_grounding_success():
    """
    Checks that verify_grounding successfully verifies correct quotes.
    """
    extracted = {
        "method": "Transformer",
        "method_quote": "We propose a new model called Transformer",
        "dataset": "Wikitext-103",
        "dataset_quote": "on the Wikitext-103 dataset",
        "key_metric": "BLEU of 28.4",
        "key_metric_quote": "achieves BLEU of 28.4",
        "limitation": "quadratic scaling",
        "limitation_quote": "due to the quadratic scaling cost"
    }
    text = "We propose a new model called Transformer on the Wikitext-103 dataset which achieves BLEU of 28.4 due to the quadratic scaling cost."
    status, notes = verify_grounding(extracted, text)
    assert status == "verified"
    assert "verified" in notes

def test_verify_grounding_failure():
    """
    Checks that verify_grounding correctly flags mismatched quotes.
    """
    extracted = {
        "method": "Transformer",
        "method_quote": "Not in the text at all"
    }
    text = "We propose a new model called Transformer."
    status, notes = verify_grounding(extracted, text)
    assert status == "failed"
    assert "verification failed" in notes

@patch('backend.agents.extraction.requests.get')
@patch('backend.agents.extraction.fitz.open')
@patch('backend.clients.claude_client.ClaudeClient.complete')
def test_extraction_agent_flow(mock_complete, mock_fitz_open, mock_get):
    """
    Test extraction agent end-to-end with mocked PDF download, parsing, and LLM responses.
    """
    # 1. Setup Mocks
    # Mock HTTP response
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.content = b"%PDF-1.4 dummy contents"
    mock_get.return_value = mock_resp
    
    # Mock PDF document extraction
    mock_page = MagicMock()
    mock_page.get_text.return_value = "We propose the Transformer model on the translation task."
    mock_doc = MagicMock()
    mock_doc.__len__.return_value = 1
    mock_doc.__getitem__.return_value = mock_page
    mock_fitz_open.return_value = mock_doc
    
    # Mock Claude response
    mock_complete.return_value = """
    {
      "method": "Transformer",
      "method_quote": "We propose the Transformer",
      "dataset": "translation task",
      "dataset_quote": "on the translation task",
      "key_metric": "Not specified",
      "key_metric_quote": "",
      "limitation": "Not specified",
      "limitation_quote": ""
    }
    """
    
    # 2. Execute
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
    
    updated_state = run_extraction(state)
    
    # 3. Assertions
    assert updated_state["agent_status"]["extraction"] == "done"
    assert len(updated_state["extracted_fields"]) == 1
    record = updated_state["extracted_fields"][0]
    assert record.paper_id == "test-paper-1"
    assert record.method == "Transformer"
    assert record.dataset == "translation task"
    assert record.verification_status == "verified"
    assert record.abstract_only is False
