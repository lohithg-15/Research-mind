import xml.etree.ElementTree as ET
import requests
import re
from typing import List, Dict, Any, Optional
from backend.data.cache import get_cache_key, read_from_cache, write_to_cache, exponential_backoff
import logging

logger = logging.getLogger("researchmind.arxiv")

@exponential_backoff(max_retries=3, base_delay=2.0)
def _fetch_arxiv_raw(url: str) -> str:
    """
    Fetches raw XML data from arXiv API.
    """
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    return response.text

def search_arxiv(
    query: str,
    limit: int = 25,
    year_from: Optional[int] = None,
    year_to: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """
    Queries the arXiv API with title/abstract fields for precise matching,
    applies optional year range filtering, sorts by relevance, and returns
    deduplicated metadata dicts.
    """
    # Use title+abstract fields instead of 'all:' for relevance
    # This prevents matching on author names, comments, categories etc.
    safe_query = re.sub(r'\s+', '+', query.strip())
    search_query = f"ti:{safe_query}+OR+abs:{safe_query}"

    # Build date filter if provided (arXiv uses submittedDate:[YYYYMMDD TO YYYYMMDD])
    if year_from or year_to:
        date_from = f"{year_from or 1900}0101"
        date_to   = f"{year_to or 2099}1231"
        search_query += f"+AND+submittedDate:[{date_from}+TO+{date_to}]"

    url = (
        f"http://export.arxiv.org/api/query"
        f"?search_query={search_query}"
        f"&max_results={limit}"
        f"&sortBy=relevance"
        f"&sortOrder=descending"
    )

    # Check Cache
    cache_key = get_cache_key("arxiv", query=query, limit=limit, year_from=year_from, year_to=year_to)
    cached = read_from_cache(cache_key)
    if cached is not None:
        return cached

    logger.info(f"Querying arXiv API: {url}")
    try:
        xml_data = _fetch_arxiv_raw(url)
    except Exception as e:
        logger.error(f"Failed to retrieve data from arXiv: {e}")
        return []

    papers = []
    try:
        root = ET.fromstring(xml_data)
        ns = {'atom': 'http://www.w3.org/2005/Atom'}

        for entry in root.findall('atom:entry', ns):
            id_element = entry.find('atom:id', ns)
            if id_element is None or not id_element.text:
                continue
            id_url = id_element.text.strip()

            # Extract arXiv ID, e.g., http://arxiv.org/abs/2103.00020v1 -> 2103.00020
            match = re.search(r'/abs/([^v/]+)', id_url)
            arxiv_id = match.group(1) if match else id_url.split('/')[-1]
            # Strip version if present (e.g. 2103.00020v2 -> 2103.00020)
            arxiv_id = re.sub(r'v\d+$', '', arxiv_id)

            title_el = entry.find('atom:title', ns)
            title = title_el.text.strip().replace('\n', ' ') if title_el is not None else "Untitled"
            # Replace multiple spaces with a single space
            title = re.sub(r'\s+', ' ', title)

            summary_el = entry.find('atom:summary', ns)
            summary = summary_el.text.strip().replace('\n', ' ') if summary_el is not None else ""
            summary = re.sub(r'\s+', ' ', summary)

            published_el = entry.find('atom:published', ns)
            year = 2000
            if published_el is not None and published_el.text:
                try:
                    year = int(published_el.text.split('-')[0])
                except ValueError:
                    pass

            # Client-side year filter (belt-and-suspenders in case API filter differs)
            if year_from and year < year_from:
                continue
            if year_to and year > year_to:
                continue

            authors = []
            for author in entry.findall('atom:author', ns):
                name_el = author.find('atom:name', ns)
                if name_el is not None and name_el.text:
                    authors.append(name_el.text.strip())

            pdf_url = None
            abs_url = f"https://arxiv.org/abs/{arxiv_id}"
            for link in entry.findall('atom:link', ns):
                if link.attrib.get('title') == 'pdf' or link.attrib.get('type') == 'application/pdf':
                    pdf_url = link.attrib.get('href')

            if not pdf_url:
                pdf_url = f"https://arxiv.org/pdf/{arxiv_id}.pdf"

            papers.append({
                "id": arxiv_id,
                "arxiv_id": arxiv_id,
                "title": title,
                "abstract": summary,
                "authors": authors,
                "year": year,
                "venue": "arXiv",
                "pdf_url": pdf_url,
                "url": abs_url,  # human-readable abstract page
                "full_text_available": True,  # arXiv papers generally have PDF available
                "citation_count": 0,          # arXiv doesn't provide citation count in response
                "citations": [],
                "doi": None,
                "source": "arxiv"
            })

        write_to_cache(cache_key, papers)
    except Exception as e:
        logger.error(f"Error parsing arXiv XML response: {e}")

    return papers
