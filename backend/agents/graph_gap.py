import logging
import datetime
import json
import numpy as np
import networkx as nx
from networkx.readwrite import json_graph
from typing import List, Dict, Any
from backend.clients.claude_client import ClaudeClient
from backend.data.models import PaperMeta, GapClaim
from backend.data.graph_store import GraphStore

logger = logging.getLogger("researchmind.graph_gap")

def compute_cosine_similarity(v1: List[float], v2: List[float]) -> float:
    """
    Computes cosine similarity between two vectors.
    """
    if not v1 or not v2:
        return 0.0
    arr1 = np.array(v1)
    arr2 = np.array(v2)
    norm1 = np.linalg.norm(arr1)
    norm2 = np.linalg.norm(arr2)
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return float(np.dot(arr1, arr2) / (norm1 * norm2))

def fallback_clustering(papers: List[PaperMeta]) -> List[Dict[str, Any]]:
    """
    Simple keyword-based clustering fallback when Claude fails or is unavailable.
    """
    logger.info("Using keyword-based fallback clustering.")
    # Group by key vocabulary in abstract
    keywords = ["attention", "transformer", "bert", "gpt", "optimization", "efficiency", "llm", "cnn", "classification"]
    clusters = {}
    
    for paper in papers:
        found_keywords = []
        text = (paper.title + " " + paper.abstract).lower()
        for kw in keywords:
            if kw in text:
                found_keywords.append(kw)
                
        # Primary cluster label is the most frequent keyword, or 'General'
        primary = found_keywords[0].capitalize() if found_keywords else "General Research"
        if primary not in clusters:
            clusters[primary] = []
        clusters[primary].append(paper.id)
        
    result = []
    for label, paper_ids in clusters.items():
        result.append({
            "topic_label": label,
            "description": f"Papers discussing topics related to {label.lower()}.",
            "paper_ids": paper_ids
        })
    return result

def run_graph_gap(state: dict) -> dict:
    """
    Builds the NetworkX MultiDiGraph and executes the gap detection heuristic.
    """
    papers: List[PaperMeta] = state.get("papers", [])
    
    if "agent_status" not in state:
        state["agent_status"] = {}
        
    state["agent_status"]["graph_gap"] = "running"
    
    # 1. Enforce minimum corpus size
    if len(papers) < 15:
        logger.warning(f"Corpus size {len(papers)} is below the minimum of 15 papers. Skipping gap detection.")
        state["gap_claims"] = []
        state["graph_ref"] = None
        state["agent_status"]["graph_gap"] = "done"
        return state
        
    logger.info(f"Graph/Gap Agent: Building network graph for {len(papers)} papers.")
    
    # 2. Build the NetworkX Graph via GraphStore
    gs = GraphStore()
    G = gs.build_graph(papers)
    paper_ids_set = {p.id for p in papers}
        
    # 4. Perform Topic Clustering using Claude
    claude = ClaudeClient()
    paper_summary_list = [{"id": p.id, "title": p.title, "abstract": p.abstract[:300]} for p in papers]
    
    prompt = f"""
Group the following research papers into 3 to 5 distinct thematic topic clusters.
For each cluster, provide a high-level descriptive topic label, a brief 1-sentence description of the theme, and the list of paper IDs that belong to it.
Ensure every paper is assigned to at least one cluster.

Papers list:
{json.dumps(paper_summary_list, indent=2)}

Return ONLY a valid JSON list of objects matching the schema below. Do not include markdown blocks, backticks, or any explanation.
JSON Schema:
[
  {{
    "topic_label": "Theme Name",
    "description": "Theme description",
    "paper_ids": ["id1", "id2"]
  }}
]
"""
    clusters = []
    try:
        response_text = claude.complete(
            prompt=prompt,
            system="You are an expert research analyst. You output only raw, valid JSON clustering list.",
            temperature=0.0
        )
        
        # Clean LLM response fences
        clean_text = response_text.strip()
        if clean_text.startswith("```json"):
            clean_text = clean_text[7:]
        elif clean_text.startswith("```"):
            clean_text = clean_text[3:]
        if clean_text.endswith("```"):
            clean_text = clean_text[:-3]
        clean_text = clean_text.strip()
        
        clusters = json.loads(clean_text)
        if not isinstance(clusters, list):
            raise ValueError("LLM response is not a list")
    except Exception as e:
        logger.error(f"Failed to cluster papers using Claude: {e}")
        clusters = fallback_clustering(papers)
        
    # Add Topic nodes and BELONGS_TO edges
    for cluster in clusters:
        label = cluster["topic_label"]
        desc = cluster["description"]
        paper_ids = cluster["paper_ids"]
        
        G.add_node(label, type="Topic", label=label, description=desc)
        for pid in paper_ids:
            if pid in paper_ids_set:
                G.add_edge(pid, label, type="BELONGS_TO", membership_score=1.0)
                
    # 5. Gap Detection Heuristic
    # Compute citation density for each cluster in the last 3 years
    current_year = datetime.datetime.now().year
    cluster_densities = []
    
    for cluster in clusters:
        label = cluster["topic_label"]
        paper_ids = [pid for pid in cluster["paper_ids"] if pid in paper_ids_set]
        
        if not paper_ids:
            continue
            
        # Compute density: average citation count of papers in cluster
        total_citations = 0
        for pid in paper_ids:
            p_node = G.nodes[pid]
            total_citations += p_node.get("citation_count", 0)
            
        density = total_citations / len(paper_ids)
        cluster_densities.append((cluster, density, paper_ids))
        
    # Flag clusters below the median density
    gap_claims = []
    if cluster_densities:
        densities = [d[1] for d in cluster_densities]
        median_density = np.median(densities)
        logger.info(f"Median citation density: {median_density:.2f}")
        
        for idx, (cluster, density, paper_ids) in enumerate(cluster_densities):
            # Check if density is below or equal to median (handles small clusters/ties gracefully)
            if density <= median_density:
                label = cluster["topic_label"]
                desc = cluster["description"]
                
                # Extract induced subgraph (papers in cluster, their authors, their topic node)
                subgraph_nodes = list(paper_ids) + [label]
                for pid in paper_ids:
                    # Add authors of these papers
                    for author in papers:
                        if author.id == pid:
                            subgraph_nodes.extend(author.authors)
                            
                # Deduplicate node list
                subgraph_nodes = list(set(subgraph_nodes))
                
                # Filter nodes present in G
                subgraph_nodes = [node for node in subgraph_nodes if G.has_node(node)]
                subgraph = G.subgraph(subgraph_nodes)
                
                # Convert subgraph to node-link JSON format
                subgraph_data = json_graph.node_link_data(subgraph)
                
                gap_id = f"GAP-{idx+1:02d}"
                suggested_directions = [
                    f"Integrate {label.lower()} with recent developments in transformer architectures.",
                    f"Validate {label.lower()} models on broader, non-standard benchmark datasets.",
                    f"Explore scaling properties and hardware efficiency constraints in {label.lower()} implementations."
                ]
                
                gap_claims.append(GapClaim(
                    gap_id=gap_id,
                    topic_label=label,
                    description=f"Thematic area '{label}' shows low citation density ({density:.2f} citations/paper vs median {median_density:.2f}), suggesting it is an under-explored research gap. Theme: {desc}",
                    citation_density=density,
                    papers_in_cluster=paper_ids,
                    subgraph_snapshot=subgraph_data,
                    suggested_directions=suggested_directions
                ))
                logger.info(f"Flagged gap: {gap_id} in topic '{label}' with density {density:.2f}")
                
    state["gap_claims"] = gap_claims
    
    # Store complete graph representation as node-link JSON
    state["graph_ref"] = json_graph.node_link_data(G)
    state["agent_status"]["graph_gap"] = "done"
    return state
