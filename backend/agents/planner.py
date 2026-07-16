import json
from backend.clients.claude_client import ClaudeClient
import logging

logger = logging.getLogger("researchmind.planner")

def run_planner(state: dict) -> dict:
    """
    Decomposes the main research query/topic into multiple sub-queries using Claude.
    Updates the 'sub_queries' list in state and sets 'agent_status'.
    """
    topic = state.get("query", "")
    filters = state.get("filters", {})
    
    if "agent_status" not in state:
        state["agent_status"] = {}
        
    state["agent_status"]["planner"] = "running"
    
    if not topic or not topic.strip():
        state["agent_status"]["planner"] = "error"
        raise ValueError("Invalid topic: Query cannot be empty.")
        
    logger.info(f"Running Planner Agent on topic: '{topic}'")
    
    prompt = f"""
Decompose the following research topic into at least 2 (up to 4) distinct, highly specific search queries for academic literature retrieval (e.g., for arXiv or Semantic Scholar). 
Each sub-query should capture a different facet, methodology, or research angle of the main topic.

Main Topic: {topic}
Optional Filters: {json.dumps(filters)}

Return ONLY a valid JSON list of strings representing the sub-queries. Do not include any other text, markdown blocks, formatting, or commentary.
Example:
["sub query 1", "sub query 2"]
"""
    
    try:
        claude = ClaudeClient()
        response_text = claude.complete(
            prompt=prompt,
            system="You are an expert research planner. You analyze a research query and output only a raw JSON array of search strings.",
            temperature=0.0
        )
        
        # Strip potential markdown code fences from LLM output
        clean_text = response_text.strip()
        if clean_text.startswith("```json"):
            clean_text = clean_text[7:]
        elif clean_text.startswith("```"):
            clean_text = clean_text[3:]
        if clean_text.endswith("```"):
            clean_text = clean_text[:-3]
        clean_text = clean_text.strip()
        
        sub_queries = json.loads(clean_text)
        if not isinstance(sub_queries, list):
            raise ValueError("Claude response did not parse as a list")
            
        # Ensure all elements are strings
        sub_queries = [str(q).strip() for q in sub_queries if q]
        
        if not sub_queries:
            sub_queries = [topic]
            
        state["sub_queries"] = sub_queries
        state["agent_status"]["planner"] = "done"
        logger.info(f"Planner Agent successfully generated sub-queries: {sub_queries}")
    except Exception as e:
        logger.error(f"Planner Agent error: {e}")
        state["agent_status"]["planner"] = "error"
        # Provide a safe fallback so the pipeline doesn't crash on connection errors
        state["sub_queries"] = [topic]
        
    return state
