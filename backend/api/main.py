import os
import logging
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from backend.api.routes import query, export, auth, history
from backend.api.jobs import get_or_restore_job
from backend.db.database import init_db

# Load environment variables from backend/.env before anything else
load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

# Set up logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s [job=%(job_id)s]: %(message)s"
)


class DefaultJobIdFilter(logging.Filter):
    """Ensures records from loggers not wrapped in get_job_logger (e.g. uvicorn,
    chromadb) still satisfy the %(job_id)s format placeholder above."""
    def filter(self, record):
        if not hasattr(record, "job_id"):
            record.job_id = "-"
        return True



# Filters attached to a Logger only run for records that logger itself
# originates, not ones a child logger (uvicorn, chromadb, ...) propagates
# up for handling — so the filter must sit on the handler(s) instead.
for _handler in logging.getLogger().handlers:
    _handler.addFilter(DefaultJobIdFilter())

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

# Initialize database on startup
@app.on_event("startup")
def startup_event():
    init_db()
    logger.info("Database initialized on startup.")

# Include routers
app.include_router(query.router, tags=["Query & Pipeline"])
app.include_router(export.router, tags=["Report Export"])
app.include_router(auth.router)
app.include_router(history.router)

@app.get("/status/{job_id}")
def get_job_status(job_id: str):
    """
    Polls the live execution progress of the 6 agents in the pipeline.
    """
    job = get_or_restore_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")
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
