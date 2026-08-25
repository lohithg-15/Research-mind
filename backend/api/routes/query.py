import uuid
import logging
import threading
from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
from backend.api.jobs import jobs
from backend.orchestration.pipeline import app as pipeline_app, create_initial_state

logger = logging.getLogger("researchmind.api.query")
router = APIRouter()

class QueryRequest(BaseModel):
    query: str = Field(..., description="The free-text research topic")
    filters: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Optional filters like year_range, keywords")

class QARequest(BaseModel):
    job_id: str = Field(..., description="The ID of the research job session")
    question: str = Field(..., description="The user question about the research")
    history: Optional[List[Dict[str, str]]] = Field(default_factory=list, description="Optional chat conversation history")

def execute_pipeline(job_id: str, query: str, filters: Dict[str, Any]):
    """
    Executes the LangGraph pipeline in the background and updates the job state.
    """
    logger.info(f"Starting pipeline execution for job {job_id}")
    try:
        initial_state = create_initial_state(query, filters)
        jobs[job_id]["state"] = initial_state
        jobs[job_id]["status"] = "running"
        
        # Invoke LangGraph
        final_state = pipeline_app.invoke(initial_state)
        
        jobs[job_id]["state"] = final_state
        jobs[job_id]["status"] = "done"
        logger.info(f"Pipeline execution completed successfully for job {job_id}")
    except Exception as e:
        logger.error(f"Error executing pipeline for job {job_id}: {e}")
        jobs[job_id]["status"] = "error"
        jobs[job_id]["error"] = str(e)

@router.post("/query")
def submit_query(request: QueryRequest, background_tasks: BackgroundTasks):
    """
    Submits a research topic to start the agentic literature review pipeline.
    """
    if not request.query or not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")
        
    job_id = str(uuid.uuid4())
    jobs[job_id] = {
        "status": "pending",
        "state": None,
        "error": None
    }
    
    # Run the pipeline in a background task
    background_tasks.add_task(execute_pipeline, job_id, request.query, request.filters)
    
    return {"job_id": job_id}

@router.get("/results/{job_id}")
def get_results(job_id: str):
    """
    Fetches the comparison table, gap claims, and citation graph for a completed job.
    """
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found.")
        
    job = jobs[job_id]
    if job["status"] == "pending" or job["status"] == "running":
        return {
            "status": job["status"],
            "message": "Results are still being processed."
        }
    elif job["status"] == "error":
        return {
            "status": "error",
            "error": job["error"]
        }
        
    state = job["state"]

    # Serialize PaperMeta objects to plain dicts for the API response
    raw_papers = state.get("papers", [])
    papers_list = []
    for p in raw_papers:
        if hasattr(p, "model_dump"):
            papers_list.append(p.model_dump())
        elif isinstance(p, dict):
            papers_list.append(p)

    # Serialize summaries
    raw_summaries = state.get("summaries", [])
    summaries_list = []
    for s in raw_summaries:
        if hasattr(s, "model_dump"):
            summaries_list.append(s.model_dump())
        elif isinstance(s, dict):
            summaries_list.append(s)

    # Extract results
    return {
        "status": "done",
        "papers": papers_list,
        "comparison_table": state.get("comparison_table", []),
        "gap_claims": [g.model_dump() for g in state.get("gap_claims", [])],
        "graph_ref": state.get("graph_ref"),
        "summaries": summaries_list,
        "sub_queries": state.get("sub_queries", []),
        "report_draft": state.get("report_draft", {}),
    }

@router.post("/qa")
def answer_question(request: QARequest):
    """
    Answers a question about the papers obtained during a specific research job.
    Similar to Elicit QA functionality.
    """
    if request.job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found.")
        
    job = jobs[request.job_id]
    if job["status"] != "done":
        raise HTTPException(status_code=400, detail="Job is not completed yet.")
        
    state = job["state"]
    if not state:
        raise HTTPException(status_code=500, detail="Job state is missing.")
        
    # Look up similar papers from VectorStore
    try:
        from backend.data.vector_store import VectorStore
        vs = VectorStore()
        similar_results = vs.query_similarity(request.question, limit=15)
    except Exception as e:
        logger.error(f"Error querying VectorStore in QA: {e}")
        similar_results = []
        
    # Filter papers to keep only those that belong to this job
    job_paper_ids = set()
    raw_papers = state.get("papers", [])
    for p in raw_papers:
        if hasattr(p, "id"):
            job_paper_ids.add(p.id)
        elif isinstance(p, dict) and "id" in p:
            job_paper_ids.add(p["id"])
            
    comp_table = state.get("comparison_table", [])
    comp_map = {item["id"]: item for item in comp_table if "id" in item}
    
    matched_ids = [r["id"] for r in similar_results if r["id"] in job_paper_ids]
    if not matched_ids:
        # Fallback: use top 8 papers from comparison table if vector store search finds nothing
        matched_ids = [item["id"] for item in comp_table[:8] if "id" in item]
        
    context_str = ""
    papers_referenced = []
    for pid in matched_ids:
        item = comp_map.get(pid)
        if not item:
            continue
        papers_referenced.append({
            "id": item["id"],
            "title": item["title"],
            "url": item.get("url") or item.get("pdf_url")
        })
        context_str += f"""
Paper ID: {item['id']}
Title: {item['title']}
Authors: {', '.join(item.get('authors', [])) if isinstance(item.get('authors'), list) else item.get('authors', '')}
Year: {item.get('year')}
Venue: {item.get('venue')}
Proposed Method: {item.get('method', 'Not specified')}
Evaluation Dataset: {item.get('dataset', 'Not specified')}
Key Metric: {item.get('key_metric', 'Not specified')}
Limitation: {item.get('limitation', 'Not specified')}
"""

    from backend.clients.claude_client import ClaudeClient
    claude = ClaudeClient()
    
    system_prompt = (
        "You are an advanced academic research assistant similar to Elicit. Your task is to answer user questions "
        "objectively based ONLY on the provided research papers from the literature review. "
        "Answer the question directly, referencing specific paper titles or Paper IDs in your explanation. "
        "Keep the tone objective and academic. If the provided context does not contain enough information "
        "to answer the question, state that clearly."
    )
    
    history_str = ""
    if request.history:
        history_str = "\n\nChat History:\n"
        for h in request.history:
            role = "User" if h.get("role") == "user" else "Assistant"
            history_str += f"{role}: {h.get('content')}\n"
            
    prompt = f"""
Here is the context representing the most relevant papers from the literature review on the topic:
{context_str}
{history_str}
Question: {request.question}

Answer:
"""
    try:
        response = claude.complete(prompt=prompt, system=system_prompt, temperature=0.2)
    except Exception as e:
        logger.error(f"Error calling ClaudeClient in QA: {e}")
        response = "Sorry, I encountered an error while synthesizing the answer."
        
    return {
        "answer": response,
        "papers_referenced": papers_referenced
    }
