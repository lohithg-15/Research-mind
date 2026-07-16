import pytest
from backend.agents.search import run_search, clean_title, is_similar_title
from backend.orchestration.pipeline import create_initial_state

from unittest.mock import patch

def test_title_cleaning():
    """
    Test helper clean_title, checking lowercasing and character removal.
    """
    assert clean_title("Attention Is All You Need") == "attentionisallyouneed"
    assert clean_title("Attention: Is All, You Need!!") == "attentionisallyouneed"
    assert clean_title("    Spaces  And  Caps    ") == "spacesandcaps"

def test_title_similarity():
    """
    Test title similarity checking based on Word Jaccard Distance.
    """
    t1 = "Attention Is All You Need"
    t2 = "Attention is all you need: A review"
    t3 = "Deep Residual Learning for Image Recognition"
    t4 = "Deep Residual Learning for Image Classification"
    
    # Identical titles should always match
    assert is_similar_title(t1, "Attention is all you Need") is True
    
    # Slight additions should match if threshold is low enough
    assert is_similar_title(t1, t2, threshold=0.7) is True
    assert is_similar_title(t1, t2, threshold=0.85) is False
    
    # Distinct topics should not match
    assert is_similar_title(t3, t4, threshold=0.85) is False
    assert is_similar_title(t3, t4, threshold=0.6) is True  # Share 'Deep Residual Learning for Image'

@patch('backend.agents.search.search_arxiv')
@patch('backend.agents.search.search_semantic_scholar')
def test_search_agent_flow(mock_s2, mock_arxiv):
    """
    Test the Search Agent run method, ensuring retrieved papers are returned and cached.
    """
    # Mock return values for search clients
    mock_arxiv.return_value = [
        {
            "id": "arxiv-123",
            "arxiv_id": "arxiv-123",
            "title": "Attention Mechanism in Deep Learning",
            "abstract": "We propose a novel attention mechanism.",
            "authors": ["Ashish Vaswani"],
            "year": 2017,
            "venue": "arXiv",
            "pdf_url": "http://arxiv.org/pdf/arxiv-123.pdf",
            "full_text_available": True,
            "citation_count": 0,
            "citations": [],
            "doi": None,
            "source": "arxiv"
        }
    ]
    mock_s2.return_value = [
        {
            "id": "10.1234/s2-456",
            "arxiv_id": None,
            "title": "A Survey of Transformer Models",
            "abstract": "A comprehensive review of transformer model variants.",
            "authors": ["Author B"],
            "year": 2021,
            "venue": "ACL",
            "pdf_url": "https://api.semanticscholar.org/10.1234/s2-456",
            "full_text_available": False,
            "citation_count": 15,
            "citations": [],
            "doi": "10.1234/s2-456",
            "source": "semantic_scholar"
        }
    ]

    state = create_initial_state("attention mechanisms")
    state["sub_queries"] = ["attention mechanisms in transformers"]
    
    updated_state = run_search(state)
    
    assert updated_state["agent_status"]["search"] == "done"
    assert "papers" in updated_state
    assert len(updated_state["papers"]) == 2
    
    # Verify elements in output list are valid PaperMeta objects
    first_paper = updated_state["papers"][0]
    assert first_paper.id is not None
    assert first_paper.title is not None
    assert len(first_paper.authors) >= 0
    assert first_paper.year >= 1900
    assert first_paper.abstract is not None
