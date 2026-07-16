import re
import logging
from typing import List, Dict, Any
from backend.clients.arxiv_client import search_arxiv
from backend.clients.s2_client import search_semantic_scholar
from backend.data.vector_store import VectorStore
from backend.data.models import PaperMeta

logger = logging.getLogger("researchmind.search")

def clean_title(title: str) -> str:
    """
    Cleans a title by lowercasing and removing non-alphanumeric characters.
    """
    return re.sub(r'[^a-z0-9]', '', title.lower())

def is_similar_title(t1: str, t2: str, threshold: float = 0.8) -> bool:
    """
    Checks if two titles are similar using Jaccard Similarity of their words.
    """
    c1 = clean_title(t1)
    c2 = clean_title(t2)
    if c1 == c2:
        return True
        
    words1 = set(re.findall(r'\w+', t1.lower()))
    words2 = set(re.findall(r'\w+', t2.lower()))
    
    if not words1 or not words2:
        return False
        
    jaccard = len(words1.intersection(words2)) / len(words1.union(words2))
    return jaccard >= threshold

def run_search(state: dict) -> dict:
    """
    Retrieves academic literature based on sub-queries, deduplicates, ranks, 
    populates local vector DB with paper text, and updates pipeline state.
    """
    sub_queries = state.get("sub_queries", [])
    if not sub_queries:
        sub_queries = [state.get("query", "")]
        
    if "agent_status" not in state:
        state["agent_status"] = {}
        
    state["agent_status"]["search"] = "running"
    logger.info(f"Search Agent: Retrieving papers for sub-queries: {sub_queries}")
    
    raw_results = []
    
    # 1. Fetch papers from both sources
    for query in sub_queries:
        try:
            arxiv_results = search_arxiv(query, limit=15)
            raw_results.extend(arxiv_results)
        except Exception as e:
            logger.error(f"Search Agent arXiv sub-query fail: {e}")
            
        try:
            s2_results = search_semantic_scholar(query, limit=15)
            raw_results.extend(s2_results)
        except Exception as e:
            logger.error(f"Search Agent Semantic Scholar sub-query fail: {e}")
            
    # 2. Deduplicate and merge results
    deduped_papers = []
    
    for raw in raw_results:
        duplicate_index = None
        for i, existing in enumerate(deduped_papers):
            # Check DOI match
            if raw.get("doi") and existing.doi and raw.get("doi").lower() == existing.doi.lower():
                duplicate_index = i
                break
            # Check arXiv ID match
            if raw.get("arxiv_id") and existing.arxiv_id and raw.get("arxiv_id").lower() == existing.arxiv_id.lower():
                duplicate_index = i
                break
            # Check Title Jaccard similarity
            if is_similar_title(raw.get("title", ""), existing.title):
                duplicate_index = i
                break
                
        if duplicate_index is not None:
            # Merge matching paper details
            existing = deduped_papers[duplicate_index]
            logger.info(f"Merging duplicates for paper: '{existing.title}'")
            
            # Enrich fields if missing
            if not existing.doi and raw.get("doi"):
                existing.doi = raw.get("doi")
            if not existing.arxiv_id and raw.get("arxiv_id"):
                existing.arxiv_id = raw.get("arxiv_id")
            if raw.get("pdf_url") and not existing.pdf_url:
                existing.pdf_url = raw.get("pdf_url")
            if raw.get("full_text_available") and not existing.full_text_available:
                existing.full_text_available = True
            if raw.get("citation_count", 0) > existing.citation_count:
                existing.citation_count = raw.get("citation_count", 0)
            if raw.get("citations") and not existing.citations:
                existing.citations = raw.get("citations")
            
            if existing.source != raw.get("source"):
                existing.source = "merged"
        else:
            # Add as a new unique PaperMeta
            paper_meta = PaperMeta(
                id=raw["id"],
                title=raw["title"],
                authors=raw["authors"],
                year=raw["year"],
                venue=raw["venue"],
                abstract=raw["abstract"],
                pdf_url=raw.get("pdf_url"),
                full_text_available=raw.get("full_text_available", False),
                citation_count=raw.get("citation_count", 0),
                citations=raw.get("citations", []),
                doi=raw.get("doi"),
                arxiv_id=raw.get("arxiv_id"),
                source=raw["source"]
            )
            deduped_papers.append(paper_meta)
            
    # 3. Store in ChromaDB
    try:
        vs = VectorStore()
        # Convert to dictionary representation for vector store import
        papers_dict_list = [p.model_dump() for p in deduped_papers]
        vs.add_papers(papers_dict_list)
    except Exception as e:
        logger.error(f"Failed to store paper embeddings in ChromaDB: {e}")
        
    state["papers"] = deduped_papers
    state["agent_status"]["search"] = "done"
    logger.info(f"Search Agent finished: merged into {len(deduped_papers)} unique papers.")
    
    return state
