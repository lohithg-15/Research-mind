import uuid
import logging
import threading
from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional
from backend.api.jobs import jobs
from backend.orchestration.pipeline import app as pipeline_app, create_initial_state

logger = logging.getLogger("researchmind.api.query")
router = APIRouter()

class QueryRequest(BaseModel):
    query: str = Field(..., description="The free-text research topic")
    filters: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Optional filters like year_range, keywords")

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
    # Extract results matching PRD specification
    return {
        "status": "done",
        "comparison_table": state.get("comparison_table", []),
        "gap_claims": [g.model_dump() for g in state.get("gap_claims", [])],
        "graph_ref": state.get("graph_ref")
    }
