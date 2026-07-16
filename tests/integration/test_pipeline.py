import pytest
from unittest.mock import patch, MagicMock
from backend.orchestration.pipeline import app, create_initial_state

@patch('backend.agents.search.search_arxiv')
@patch('backend.agents.search.search_semantic_scholar')
@patch('backend.agents.extraction.requests.get')
@patch('backend.agents.extraction.fitz.open')
@patch('backend.clients.claude_client.ClaudeClient.complete')
def test_full_pipeline_mocked(mock_complete, mock_fitz_open, mock_get, mock_s2, mock_arxiv):
    """
    Test the entire 6-agent LangGraph pipeline end-to-end using mocked outputs.
    """
    # 1. Setup search results mock (need >= 15 papers to trigger gap detection)
    mock_papers = []
    for i in range(20):
        mock_papers.append({
            "id": f"paper-id-{i}",
            "title": f"Mock Title of Paper {i}",
            "authors": [f"Author {i}A", f"Author {i}B"],
            "year": 2020 + (i % 5),
            "venue": "arXiv" if i % 2 == 0 else "NeurIPS",
            "abstract": "This is a mock paper abstract detailing transformers and attention mechanisms.",
            "pdf_url": f"http://example.com/pdf-{i}.pdf",
            "full_text_available": True,
            "citation_count": i * 5,
            "citations": [f"paper-id-{(i+1)%20}"],
            "doi": f"10.1234/mock-doi-{i}",
            "arxiv_id": f"arxiv-{i}",
            "source": "merged"
        })
    mock_arxiv.return_value = mock_papers[:10]
    mock_s2.return_value = mock_papers[10:]
    
    # 2. Mock HTTP PDF download
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.content = b"%PDF-1.4 mock pdf data"
    mock_get.return_value = mock_resp
    
    # 3. Mock PyMuPDF
    mock_page = MagicMock()
    mock_page.get_text.return_value = "Mocked full text content showing transformer architectures and key metric perplexity of 12.0 on dataset WikiText."
    mock_doc = MagicMock()
    mock_doc.__len__.return_value = 1
    mock_doc.__getitem__.return_value = mock_page
    mock_fitz_open.return_value = mock_doc
    
    # 4. Mock Claude Client complete depending on prompt contents
    def mock_claude_complete(prompt, system=None, max_tokens=1500, temperature=0.0):
        prompt_lower = prompt.lower()
        if "decompose" in prompt_lower:
            return '["attention mechanisms in deep learning", "transformers scaling laws"]'
        elif "extract" in prompt_lower:
            return """
            {
              "method": "Transformer",
              "method_quote": "transformer architectures",
              "dataset": "WikiText",
              "dataset_quote": "on dataset WikiText",
              "key_metric": "perplexity of 12.0",
              "key_metric_quote": "perplexity of 12.0",
              "limitation": "Not specified",
              "limitation_quote": ""
            }
            """
        elif "summarize" in prompt_lower:
            return "This paper proposes a transformer architecture [Source: Method]. It evaluates it on the WikiText dataset [Source: Dataset]. It achieves a perplexity of 12.0 [Source: Key Metric]."
        elif "group" in prompt_lower:
            # Topic clustering
            return """
            [
              {
                "topic_label": "Transformer Efficiency",
                "description": "Papers detailing efficient transformer models.",
                "paper_ids": ["paper-id-0", "paper-id-1", "paper-id-2", "paper-id-3", "paper-id-4", "paper-id-5", "paper-id-6", "paper-id-7", "paper-id-8", "paper-id-9"]
              },
              {
                "topic_label": "Attention Scaling",
                "description": "Papers discussing scaling properties of attention.",
                "paper_ids": ["paper-id-10", "paper-id-11", "paper-id-12", "paper-id-13", "paper-id-14", "paper-id-15", "paper-id-16", "paper-id-17", "paper-id-18", "paper-id-19"]
              }
            ]
            """
        return "Generic mock response"
        
    mock_complete.side_effect = mock_claude_complete
    
    # 5. Invoke pipeline
    initial_state = create_initial_state("attention mechanisms")
    final_state = app.invoke(initial_state)
    
    # 6. Assert pipeline outputs are valid and populated
    assert final_state["sub_queries"] == ["attention mechanisms in deep learning", "transformers scaling laws"]
    assert len(final_state["papers"]) > 0
    assert len(final_state["extracted_fields"]) == 20
    assert len(final_state["summaries"]) == 20
    assert len(final_state["gap_claims"]) > 0
    assert "text" in final_state["report_draft"]
    
    # Check agent statuses are all done
    for agent, status in final_state["agent_status"].items():
        assert status == "done", f"Agent {agent} had status {status}"
