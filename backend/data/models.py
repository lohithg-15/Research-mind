from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Literal, Any

class PaperMeta(BaseModel):
    id: str  # Unique identifier (DOI or arXiv ID)
    title: str
    authors: List[str] = Field(default_factory=list)
    year: int
    venue: str = "Unknown"
    abstract: str
    pdf_url: Optional[str] = None
    url: Optional[str] = None  # Human-readable paper page (arXiv abs, Semantic Scholar, DOI)
    full_text_available: bool = False
    citation_count: int = 0
    citations: List[str] = Field(default_factory=list)  # IDs of papers cited by this paper
    doi: Optional[str] = None
    arxiv_id: Optional[str] = None
    source: str  # 'arxiv', 'semantic_scholar', or 'merged'

def resolve_paper_url(
    url: Optional[str] = None,
    arxiv_id: Optional[str] = None,
    doi: Optional[str] = None,
    pdf_url: Optional[str] = None,
) -> Optional[str]:
    """
    Resolves the best available human-readable link for a paper, in
    priority order: explicit url > arXiv abstract page > DOI page >
    raw PDF url > None. Centralizes logic previously duplicated across
    synthesis.py and multiple frontend components.
    """
    if url:
        return url
    if arxiv_id:
        return f"https://arxiv.org/abs/{arxiv_id}"
    if doi:
        return f"https://doi.org/{doi}"
    if pdf_url:
        return pdf_url
    return None

def resolve_paper_url_from_meta(paper: "PaperMeta") -> Optional[str]:
    """Convenience wrapper for a full PaperMeta object."""
    return resolve_paper_url(paper.url, paper.arxiv_id, paper.doi, paper.pdf_url)

class FieldRecord(BaseModel):
    paper_id: str
    method: str
    dataset: str
    key_metric: str
    limitation: str
    year: int
    verification_status: Literal["verified", "unverified", "failed", "heuristic"] = "unverified"
    verification_notes: Optional[str] = None
    abstract_only: bool = False

class Summary(BaseModel):
    paper_id: str
    title: str
    summary_text: str
    attributions: List[Dict[str, Any]] = Field(default_factory=list) # Grounding evidence

class GapClaim(BaseModel):
    gap_id: str
    topic_label: str
    description: str
    citation_density: float
    papers_in_cluster: List[str]  # Paper IDs in this gap cluster
    subgraph_snapshot: Dict[str, Any]  # NetworkX node-link JSON export format
    suggested_directions: List[str] = Field(default_factory=list)
