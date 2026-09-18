import os
import sqlite3
from typing import TypedDict, List, Dict, Any, Literal
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.sqlite import SqliteSaver
from backend.data.models import PaperMeta, FieldRecord, Summary, GapClaim
from backend.db.database import DB_DIR
from backend.agents.planner import run_planner
from backend.agents.search import run_search
from backend.agents.extraction import run_extraction
from backend.agents.synthesis import run_synthesis
from backend.agents.graph_gap import run_graph_gap
from backend.agents.report import run_report

# Define the orchestration state matching the contract in PRD/SRS
class PipelineState(TypedDict):
    query: str
    filters: Dict[str, Any]
    sub_queries: List[str]
    papers: List[PaperMeta]
    extracted_fields: List[FieldRecord]
    summaries: List[Summary]
    comparison_table: List[Dict[str, Any]]
    graph_ref: Any  # NetworkX MultiDiGraph (or JSON representation)
    gap_claims: List[GapClaim]
    report_draft: Dict[str, Any]
    agent_status: Dict[str, Literal["pending", "running", "done", "error"]]

# 1. Initialize StateGraph
workflow = StateGraph(PipelineState)

# 2. Add nodes (agents)
workflow.add_node("planner", run_planner)
workflow.add_node("search", run_search)
workflow.add_node("extraction", run_extraction)
workflow.add_node("synthesis", run_synthesis)
workflow.add_node("graph_gap", run_graph_gap)
workflow.add_node("report", run_report)

# 3. Configure connections (edges)
workflow.set_entry_point("planner")
workflow.add_edge("planner", "search")
workflow.add_edge("search", "extraction")
workflow.add_edge("extraction", "synthesis")
workflow.add_edge("synthesis", "graph_gap")
workflow.add_edge("graph_gap", "report")
workflow.add_edge("report", END)

# 4. Checkpointer: persists state after every node so a failed run can resume from the
# last completed agent instead of rerunning the whole pipeline.
# Installed versions: langgraph==1.2.11, langgraph-checkpoint-sqlite==3.1.1 — this exposes
# SqliteSaver at langgraph.checkpoint.sqlite. SqliteSaver's constructor takes a raw
# sqlite3.Connection (not a path); `from_conn_string` is a contextmanager that closes the
# connection on exit, which doesn't fit a module-level singleton, so we open the connection
# directly instead, mirroring the DB_DIR-relative path convention used in backend/db/database.py.
CHECKPOINT_DB_PATH = os.path.join(DB_DIR, "langgraph_checkpoints.db")
_checkpoint_conn = sqlite3.connect(CHECKPOINT_DB_PATH, check_same_thread=False)
checkpointer = SqliteSaver(_checkpoint_conn)

# 5. Compile the state machine
app = workflow.compile(checkpointer=checkpointer)

def create_initial_state(query: str, filters: Dict[str, Any] = None) -> PipelineState:
    """
    Creates a new, initialized state dictionary for a pipeline job.
    """
    if filters is None:
        filters = {}

    state = {
        "query": query,
        "filters": filters,
        "sub_queries": [],
        "papers": [],
        "extracted_fields": [],
        "summaries": [],
        "comparison_table": [],
        "graph_ref": None,
        "gap_claims": [],
        "report_draft": {},
        "agent_status": {
            "planner": "pending",
            "search": "pending",
            "extraction": "pending",
            "synthesis": "pending",
            "graph_gap": "pending",
            "report": "pending"
        },
        "job_id": None,  # Will be set by execute_pipeline if available
    }
    return state
