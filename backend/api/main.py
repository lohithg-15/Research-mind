import os
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from backend.api.routes import query, export
from backend.api.jobs import jobs

# Set up logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("researchmind.api.main")

app = FastAPI(
    title="ResearchMind API",
    description="Agentic AI system for automated literature review and gap discovery",
    version="1.0"
)

# CORS configuration for local React development frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Renders sandbox/local access easy
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(query.router, tags=["Query & Pipeline"])
app.include_router(export.router, tags=["Report Export"])

@app.get("/status/{job_id}")
def get_job_status(job_id: str):
    """
    Polls the live execution progress of the 6 agents in the pipeline.
    """
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found.")
        
    job = jobs[job_id]
    state = job["state"]
    
    # Extract agent status list from state if initialized
    agent_status = {}
    if state and "agent_status" in state:
        agent_status = state["agent_status"]
    else:
        # Default fallback pending states
        agent_status = {
            "planner": "pending",
            "search": "pending",
            "extraction": "pending",
            "synthesis": "pending",
            "graph_gap": "pending",
            "report": "pending"
        }
        if job["status"] == "running":
            agent_status["planner"] = "running"
            
    return {
        "status": job["status"],
        "agent_status": agent_status,
        "error": job["error"]
    }

@app.get("/health")
def health_check():
    """
    Basic health check.
    """
    return {"status": "healthy"}
