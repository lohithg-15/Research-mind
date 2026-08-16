import os
import requests
from typing import List, Dict, Any, Optional
from backend.data.cache import get_cache_key, read_from_cache, write_to_cache, exponential_backoff
import logging

logger = logging.getLogger("researchmind.s2")

# Fields to retrieve from Semantic Scholar API
# Added openAccessPdf to get direct open-access PDF links
# Added url to get the Semantic Scholar paper page URL
S2_FIELDS = "title,authors,year,venue,abstract,externalIds,citationCount,citations,openAccessPdf,url"

@exponential_backoff(max_retries=5, base_delay=3.0)
def _fetch_s2_raw(url: str, params: Dict[str, Any], headers: Dict[str, str]) -> Dict[str, Any]:
    """
    Executes raw GET request to Semantic Scholar API.
    """
    response = requests.get(url, params=params, headers=headers, timeout=30)
    # Check for rate-limiting (429) specifically to trigger backoff
    if response.status_code == 429:
        raise Exception("429 Too Many Requests: Semantic Scholar rate limit hit")
    response.raise_for_status()
    return response.json()

def search_semantic_scholar(
    query: str,
    limit: int = 25,
    year_from: Optional[int] = None,
    year_to: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """
    Searches Semantic Scholar API with optional year filtering,
    processes results, and returns list of paper metadata dictionaries.
    """
    url = "https://api.semanticscholar.org/graph/v1/paper/search"
    params = {
        "query": query,
        "limit": limit,
        "fields": S2_FIELDS,
        # Sort by relevance (default for S2, but explicit is better)
        "sort": "relevance",
    }

    # Apply year range filter if provided
    if year_from and year_to:
        params["year"] = f"{year_from}-{year_to}"
    elif year_from:
        params["year"] = f"{year_from}-"
    elif year_to:
        params["year"] = f"-{year_to}"

    headers = {}
    api_key = os.environ.get("SEMANTIC_SCHOLAR_API_KEY")
    if api_key:
        headers["x-api-key"] = api_key

    cache_key = get_cache_key("s2", query=query, limit=limit, year_from=year_from, year_to=year_to)
    cached = read_from_cache(cache_key)
    if cached is not None:
        return cached

    logger.info(f"Querying Semantic Scholar API: {url} with query '{query}'")
    try:
        data = _fetch_s2_raw(url, params=params, headers=headers)
    except Exception as e:
        logger.error(f"Failed to query Semantic Scholar: {e}")
        return []

    papers = []
    try:
        for item in data.get("data", []):
            paper_id = item.get("paperId")
            if not paper_id:
                continue

            external_ids = item.get("externalIds", {}) or {}
            doi = external_ids.get("DOI")
            arxiv_id = external_ids.get("ArXiv")

            # Use DOI as the primary ID if available, otherwise Semantic Scholar paperId
            p_id = doi if doi else paper_id

            authors = [author.get("name") for author in item.get("authors", []) if author.get("name")]

            # Citations list (citations of this paper)
            citations_list = []
            for cit in item.get("citations", []):
                cit_id = cit.get("paperId")
                if cit_id:
                    citations_list.append(cit_id)

            # Prefer open-access PDF URL, then arXiv PDF, then None
            open_access = item.get("openAccessPdf") or {}
            open_pdf_url = open_access.get("url") if open_access else None

            if open_pdf_url:
                pdf_url = open_pdf_url
            elif arxiv_id:
                pdf_url = f"https://arxiv.org/pdf/{arxiv_id}.pdf"
            else:
                pdf_url = None

            # Human-readable paper page: arXiv abs page preferred, then S2 page
            if arxiv_id:
                paper_url = f"https://arxiv.org/abs/{arxiv_id}"
            else:
                paper_url = item.get("url") or f"https://www.semanticscholar.org/paper/{paper_id}"

            papers.append({
                "id": p_id,
                "arxiv_id": arxiv_id,
                "title": item.get("title", "Untitled"),
                "abstract": item.get("abstract", "") or "",
                "authors": authors,
                "year": item.get("year", 2000) or 2000,
                "venue": item.get("venue", "Unknown") or "Unknown",
                "pdf_url": pdf_url,
                "url": paper_url,
                "full_text_available": True if (open_pdf_url or arxiv_id) else False,
                "citation_count": item.get("citationCount", 0) or 0,
                "citations": citations_list,
                "doi": doi,
                "source": "semantic_scholar"
            })

        write_to_cache(cache_key, papers)
    except Exception as e:
        logger.error(f"Error parsing Semantic Scholar API response: {e}")

    return papers
