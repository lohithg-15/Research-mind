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
    full_text_available: bool = False
    citation_count: int = 0
    citations: List[str] = Field(default_factory=list)  # IDs of papers cited by this paper
    doi: Optional[str] = None
    arxiv_id: Optional[str] = None
    source: str  # 'arxiv', 'semantic_scholar', or 'merged'

class FieldRecord(BaseModel):
    paper_id: str
    method: str
    dataset: str
    key_metric: str
    limitation: str
    year: int
    verification_status: Literal["verified", "unverified", "failed"] = "unverified"
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
