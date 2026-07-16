import os
import requests
from typing import List, Dict, Any
from backend.data.cache import get_cache_key, read_from_cache, write_to_cache, exponential_backoff
import logging

logger = logging.getLogger("researchmind.s2")

# Fields to retrieve from Semantic Scholar API
S2_FIELDS = "title,authors,year,venue,abstract,externalIds,citationCount,citations"

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

def search_semantic_scholar(query: str, limit: int = 25) -> List[Dict[str, Any]]:
    """
    Searches Semantic Scholar API, processes results, and returns list of paper metadata dictionaries.
    """
    url = "https://api.semanticscholar.org/graph/v1/paper/search"
    params = {
        "query": query,
        "limit": limit,
        "fields": S2_FIELDS
    }
    
    headers = {}
    api_key = os.environ.get("SEMANTIC_SCHOLAR_API_KEY")
    if api_key:
        headers["x-api-key"] = api_key
        
    cache_key = get_cache_key("s2", query=query, limit=limit)
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
                
            external_ids = item.get("externalIds", {})
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
                    
            papers.append({
                "id": p_id,
                "arxiv_id": arxiv_id,
                "title": item.get("title", "Untitled"),
                "abstract": item.get("abstract", "") or "",
                "authors": authors,
                "year": item.get("year", 2000) or 2000,
                "venue": item.get("venue", "Unknown") or "Unknown",
                "pdf_url": f"https://arxiv.org/pdf/{arxiv_id}.pdf" if arxiv_id else f"https://api.semanticscholar.org/{paper_id}",
                "full_text_available": True if arxiv_id else False,
                "citation_count": item.get("citationCount", 0) or 0,
                "citations": citations_list,
                "doi": doi,
                "source": "semantic_scholar"
            })
            
        write_to_cache(cache_key, papers)
    except Exception as e:
        logger.error(f"Error parsing Semantic Scholar API response: {e}")
        
    return papers
