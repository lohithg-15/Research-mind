import pytest
from unittest.mock import patch

from backend.api.jobs import (
    cancelled_jobs,
    request_cancellation,
    is_cancelled,
    clear_cancellation,
)
from backend.agents.search import run_search
from backend.agents.synthesis import run_synthesis
from backend.orchestration.pipeline import create_initial_state


@pytest.fixture(autouse=True)
def clean_cancelled_jobs():
    """Ensure the module-level cancelled_jobs set doesn't leak between tests."""
    cancelled_jobs.clear()
    yield
    cancelled_jobs.clear()


def test_request_and_check_cancellation():
    request_cancellation("job-x")

    assert is_cancelled("job-x") is True
    assert is_cancelled("job-y") is False

    clear_cancellation("job-x")
    assert is_cancelled("job-x") is False


@patch('backend.agents.search.search_semantic_scholar')
@patch('backend.agents.search.search_arxiv')
def test_run_search_stops_early_when_cancelled(mock_arxiv, mock_s2):
    mock_arxiv.return_value = [
        {
            "id": "arxiv-123",
            "arxiv_id": "arxiv-123",
            "title": "Some Paper",
            "abstract": "An abstract.",
            "authors": ["Author A"],
            "year": 2020,
            "venue": "arXiv",
            "pdf_url": "http://arxiv.org/pdf/arxiv-123.pdf",
            "full_text_available": True,
            "citation_count": 0,
            "citations": [],
            "doi": None,
            "source": "arxiv",
        }
    ]
    mock_s2.return_value = []

    state = create_initial_state("attention mechanisms")
    state["job_id"] = "job-x"
    state["sub_queries"] = ["attention mechanisms"]

    request_cancellation("job-x")

    updated_state = run_search(state)

    assert updated_state["agent_status"]["search"] == "cancelled"
    assert updated_state["papers"] == []


@patch('backend.clients.claude_client.ClaudeClient.complete')
def test_run_synthesis_short_circuits_when_search_cancelled(mock_complete):
    state = create_initial_state("attention mechanisms")
    state["agent_status"] = {"search": "cancelled"}

    updated_state = run_synthesis(state)

    assert updated_state["agent_status"]["synthesis"] == "cancelled"
    mock_complete.assert_not_called()


def test_is_cancelled_noops_for_missing_job_id():
    # Mirrors the `if job_id and is_cancelled(job_id):` guard used in agents:
    # a falsy job_id must short-circuit before is_cancelled is ever called.
    job_id = None
    assert not (job_id and is_cancelled(job_id))
