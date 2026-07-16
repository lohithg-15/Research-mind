import logging
import networkx as nx
from typing import List, Dict, Any
from backend.data.models import PaperMeta
from backend.data.vector_store import VectorStore
import numpy as np

logger = logging.getLogger("researchmind.data.graph_store")

def compute_cosine_similarity(v1: List[float], v2: List[float]) -> float:
    if not v1 or not v2:
        return 0.0
    arr1 = np.array(v1)
    arr2 = np.array(v2)
    norm1 = np.linalg.norm(arr1)
    norm2 = np.linalg.norm(arr2)
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return float(np.dot(arr1, arr2) / (norm1 * norm2))

class GraphStore:
    def __init__(self):
        pass
        
    def build_graph(self, papers: List[PaperMeta]) -> nx.MultiDiGraph:
        """
        Builds and returns an in-memory NetworkX MultiDiGraph from paper metadata.
        """
        G = nx.MultiDiGraph()
        paper_ids_set = {p.id for p in papers}
        
        # 1. Add Paper nodes
        for p in papers:
            G.add_node(
                p.id,
                type="Paper",
                title=p.title,
                year=p.year,
                venue=p.venue,
                abstract=p.abstract,
                full_text_available=p.full_text_available,
                citation_count=p.citation_count
            )
            
            # Add Authors & Authored_By edges
            for author in p.authors:
                G.add_node(author, type="Author", name=author)
                G.add_edge(p.id, author, type="AUTHORED_BY")
                
            # Add undirected co-authorship relationships
            for i in range(len(p.authors)):
                for j in range(i + 1, len(p.authors)):
                    a1, a2 = p.authors[i], p.authors[j]
                    G.add_edge(a1, a2, type="CO_AUTHORED_WITH")
                    G.add_edge(a2, a1, type="CO_AUTHORED_WITH")
                    
            # Add CITES edges within the corpus
            for cited_id in p.citations:
                if cited_id in paper_ids_set:
                    G.add_edge(p.id, cited_id, type="CITES", year_of_citation=p.year)
                    
        # 2. Add SIMILAR_TOPIC edges using ChromaDB embeddings
        try:
            vs = VectorStore()
            embeddings = {}
            for p in papers:
                emb = vs.get_embedding(p.id)
                if emb:
                    embeddings[p.id] = emb
                    
            paper_list = list(papers)
            for i in range(len(paper_list)):
                for j in range(i + 1, len(paper_list)):
                    p1, p2 = paper_list[i], paper_list[j]
                    v1 = embeddings.get(p1.id)
                    v2 = embeddings.get(p2.id)
                    
                    if v1 and v2:
                        sim = compute_cosine_similarity(v1, v2)
                        if sim >= 0.6:
                            G.add_edge(p1.id, p2.id, type="SIMILAR_TOPIC", weight=sim)
                            G.add_edge(p2.id, p1.id, type="SIMILAR_TOPIC", weight=sim)
        except Exception as e:
            logger.error(f"Error computing topic similarity edges: {e}")
            
        return G
