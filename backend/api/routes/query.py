import uuid
import logging
import threading
from fastapi import APIRouter, BackgroundTasks, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
from backend.api.jobs import jobs
from backend.api.deps import get_optional_user
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
    If the job has a user_id, auto-saves the results to the database on completion.
    """
    logger.info(f"Starting pipeline execution for job {job_id}")
    try:
        initial_state = create_initial_state(query, filters)
        initial_state["job_id"] = job_id
        jobs[job_id]["state"] = initial_state
        jobs[job_id]["status"] = "running"

        # Invoke LangGraph, keyed by job_id so the checkpointer can resume this run later
        config = {"configurable": {"thread_id": job_id}}
        final_state = pipeline_app.invoke(initial_state, config=config)
        
        jobs[job_id]["state"] = final_state
        jobs[job_id]["status"] = "done"
        logger.info(f"Pipeline execution completed successfully for job {job_id}")

        # Auto-save for authenticated users
        user_id = jobs[job_id].get("user_id")
        if user_id:
            try:
                from backend.api.routes.history import save_session
                # Build the results dict (same shape as GET /results)
                state = final_state
                raw_papers = state.get("papers", [])
                papers_list = [
                    p.model_dump() if hasattr(p, "model_dump") else p
                    for p in raw_papers
                ]
                raw_summaries = state.get("summaries", [])
                summaries_list = [
                    s.model_dump() if hasattr(s, "model_dump") else s
                    for s in raw_summaries
                ]
                gap_claims_list = [
                    g.model_dump() if hasattr(g, "model_dump") else g
                    for g in state.get("gap_claims", [])
                ]
                results_to_save = {
                    "status": "done",
                    "papers": papers_list,
                    "comparison_table": state.get("comparison_table", []),
                    "gap_claims": gap_claims_list,
                    "summaries": summaries_list,
                    "sub_queries": state.get("sub_queries", []),
                    "report_draft": state.get("report_draft", {}),
                }
                save_session(
                    user_id=user_id,
                    session_id=job_id,
                    query=query,
                    filters=filters,
                    results=results_to_save,
                )
            except Exception as save_err:
                logger.error(f"Auto-save failed for job {job_id}: {save_err}")
    except Exception as e:
        logger.error(f"Error executing pipeline for job {job_id}: {e}")
        jobs[job_id]["status"] = "error"
        jobs[job_id]["error"] = str(e)

def retry_pipeline(job_id: str):
    """
    Resumes a previously failed pipeline run from its last completed agent, using the
    checkpoint the SqliteSaver persisted under this job_id's thread_id. Not wired to a
    route yet; this is the resume primitive for a future retry endpoint.
    """
    logger.info(f"Resuming pipeline execution for job {job_id}")
    config = {"configurable": {"thread_id": job_id}}
    try:
        jobs[job_id]["status"] = "running"

        # Passing None as input is LangGraph's convention for "resume from the last
        # checkpoint recorded for this thread_id" rather than starting a fresh run.
        final_state = pipeline_app.invoke(None, config=config)

        jobs[job_id]["state"] = final_state
        jobs[job_id]["status"] = "done"
        logger.info(f"Pipeline resume completed successfully for job {job_id}")
    except Exception as e:
        logger.error(f"Error resuming pipeline for job {job_id}: {e}")
        jobs[job_id]["status"] = "error"
        jobs[job_id]["error"] = str(e)

@router.post("/query")
def submit_query(
    request: QueryRequest,
    background_tasks: BackgroundTasks,
    user=Depends(get_optional_user),
):
    """
    Submits a research topic to start the agentic literature review pipeline.
    If an authenticated user submits, results are auto-saved on completion.
    """
    if not request.query or not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")
        
    job_id = str(uuid.uuid4())
    jobs[job_id] = {
        "status": "pending",
        "state": None,
        "error": None,
        "user_id": user["user_id"] if user else None,
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
    Supports explicit paper matching (by title, author, paper number/index, or keyword)
    as well as semantic vector search across all session literature.
    """
    import json
    import re

    # 1. Job Lookup (In-memory or SQLite Database recovery)
    if request.job_id not in jobs:
        try:
            from backend.db.database import get_connection
            conn = get_connection()
            row = conn.execute("SELECT query, results FROM research_sessions WHERE id = ?", (request.job_id,)).fetchone()
            conn.close()
            if row and row["results"]:
                saved_results = json.loads(row["results"])
                jobs[request.job_id] = {
                    "status": "done",
                    "state": saved_results,
                    "error": None
                }
            else:
                raise HTTPException(status_code=404, detail="Job not found.")
        except Exception as db_err:
            logger.error(f"Error restoring job {request.job_id} from DB: {db_err}")
            raise HTTPException(status_code=404, detail="Job not found.")
        
    job = jobs[request.job_id]
    if job["status"] != "done":
        raise HTTPException(status_code=400, detail="Job is not completed yet.")
        
    state = job["state"]
    if not state:
        raise HTTPException(status_code=500, detail="Job state is missing.")

    # 2. Build Unified Paper Dictionary Map & Paper List
    paper_map = {}  # id -> dict
    paper_order = []  # preserve original order

    comp_table = state.get("comparison_table", [])
    raw_papers = state.get("papers", [])

    for idx, item in enumerate(comp_table):
        if isinstance(item, dict) and "id" in item:
            pid = item["id"]
            if pid not in paper_map:
                p_copy = dict(item)
                p_copy["index"] = idx + 1
                paper_map[pid] = p_copy
                paper_order.append(pid)

    for idx, p in enumerate(raw_papers):
        p_dict = p.model_dump() if hasattr(p, "model_dump") else (p if isinstance(p, dict) else {})
        pid = p_dict.get("id")
        if pid:
            if pid not in paper_map:
                p_dict["index"] = len(paper_order) + 1
                paper_map[pid] = p_dict
                paper_order.append(pid)
            else:
                # Merge missing attributes like abstract, url, etc.
                for k, v in p_dict.items():
                    if v and not paper_map[pid].get(k):
                        paper_map[pid][k] = v

    if not paper_map:
        return {
            "answer": (
                "I don't have paper data from this research session to answer your question. "
                "Please try running a new literature review query."
            ),
            "papers_referenced": []
        }

    q_lower = request.question.lower().strip()

    # 3. Paper Matching Algorithm (Explicit Title/Index/Author + Vector + Keyword)
    matched_ids = []
    matched_set = set()

    # A. Index matching (e.g. "paper 1", "paper 2", "second paper", "#3", "paper #3")
    index_match = re.search(r'(?:paper|source|ref|#)\s*(\d+)', q_lower)
    if index_match:
        target_idx = int(index_match.group(1))
        for pid, p in paper_map.items():
            if p.get("index") == target_idx:
                matched_ids.append(pid)
                matched_set.add(pid)
                break

    # B. Title & Author substring matching
    for pid, p in paper_map.items():
        if pid in matched_set:
            continue
        title = (p.get("title") or "").lower()
        authors = p.get("authors") or []
        if isinstance(authors, list):
            authors_str = " ".join(authors).lower()
        else:
            authors_str = str(authors).lower()

        # Check title substring or author match
        if title and len(title) > 5:
            # Match if question contains significant portion of title or vice versa
            words = [w for w in title.split() if len(w) > 3]
            if title in q_lower or (len(words) >= 2 and sum(1 for w in words if w in q_lower) >= max(2, len(words) // 2)):
                matched_ids.append(pid)
                matched_set.add(pid)
                continue

        if authors_str and any(a in q_lower for a in authors_str.split() if len(a) > 4):
            matched_ids.append(pid)
            matched_set.add(pid)

    # C. Vector Store similarity search
    try:
        from backend.data.vector_store import VectorStore
        vs = VectorStore()
        similar_results = vs.query_similarity(request.question, limit=15)
        for r in similar_results:
            rid = r.get("id")
            if rid in paper_map and rid not in matched_set:
                matched_ids.append(rid)
                matched_set.add(rid)
    except Exception as e:
        logger.warning(f"VectorStore query in QA: {e}")

    # D. Keyword scoring across all remaining papers
    q_words = [w for w in re.findall(r'\w+', q_lower) if len(w) > 3 and w not in {
        'what', 'which', 'where', 'when', 'how', 'why', 'tell', 'explain', 'describe',
        'show', 'paper', 'papers', 'about', 'this', 'that', 'these', 'those', 'using'
    }]
    if q_words:
        scored = []
        for pid, p in paper_map.items():
            if pid in matched_set:
                continue
            text = f"{p.get('title','')} {p.get('abstract','')} {p.get('method','')} {p.get('dataset','')}".lower()
            score = sum(1 for w in q_words if w in text)
            if score > 0:
                scored.append((score, pid))
        scored.sort(reverse=True, key=lambda x: x[0])
        for score, pid in scored:
            matched_ids.append(pid)
            matched_set.add(pid)

    # E. Fallback: add remaining papers in session order up to limit
    for pid in paper_order:
        if pid not in matched_set:
            matched_ids.append(pid)
            matched_set.add(pid)

    # Cap matched papers to 25 to fit within token context window cleanly
    final_matched_ids = matched_ids[:25]

    # 4. Build Rich Context String & References List
    context_str = ""
    papers_referenced = []
    summaries_map = {}

    raw_summaries = state.get("summaries", [])
    for s in raw_summaries:
        sid = s.paper_id if hasattr(s, "paper_id") else s.get("paper_id", "")
        stxt = s.summary_text if hasattr(s, "summary_text") else s.get("summary_text", "")
        if sid and stxt:
            summaries_map[sid] = stxt

    for pid in final_matched_ids:
        item = paper_map[pid]
        papers_referenced.append({
            "id": item["id"],
            "title": item.get("title", "Untitled"),
            "url": item.get("url") or item.get("pdf_url")
        })

        authors_val = item.get("authors", [])
        if isinstance(authors_val, list):
            authors_str = ", ".join(authors_val[:4])
        else:
            authors_str = str(authors_val)

        abstract_text = item.get("abstract") or "No full abstract available."
        summary_text = summaries_map.get(pid, "")

        context_str += f"""
---
Paper [{item.get('index', '?')}] ID: {item['id']}
Title: {item.get('title', 'Untitled')}
Authors: {authors_str} | Year: {item.get('year', 'Unknown')} | Venue: {item.get('venue', 'Unknown')}
Proposed Method: {item.get('method', 'Not specified')}
Evaluation Dataset: {item.get('dataset', 'Not specified')}
Key Metric: {item.get('key_metric', 'Not specified')}
Limitation: {item.get('limitation', 'Not specified')}
Abstract: {abstract_text[:1200]}
"""
        if summary_text:
            context_str += f"Summary: {summary_text}\n"

    # 5. Call LLM with Refined Instructions
    from backend.clients.claude_client import ClaudeClient
    claude = ClaudeClient()
    
    system_prompt = (
        "You are an expert academic research assistant similar to Elicit. Your goal is to answer user questions "
        "comprehensively and objectively based on the provided literature review papers.\n\n"
        "GUIDELINES:\n"
        "1. If the user asks about a SPECIFIC paper (e.g. 'explain paper X', 'tell me about title Y', 'what is paper 2 about?'), "
        "provide a thorough, well-structured explanation of that paper's core idea, background, methodology, "
        "datasets, key metrics/results, and limitations based on the provided context.\n"
        "2. If the user asks a general question, synthesize the findings across papers and cite specific paper titles.\n"
        "3. Always reference specific paper titles or Paper Numbers (e.g. Paper [1]) in your answer.\n"
        "4. Be objective, academic, clear, and informative."
    )
    
    history_str = ""
    if request.history:
        history_str = "\n\nConversation History:\n"
        for h in request.history[-6:]:
            role = "User" if h.get("role") == "user" else "Assistant"
            history_str += f"{role}: {h.get('content')}\n"
            
    prompt = f"""
Here is the context representing the research papers from this literature review:
{context_str}
{history_str}
Question: {request.question}

Answer:
"""
    try:
        response = claude.complete(prompt=prompt, system=system_prompt, max_tokens=2500, temperature=0.2)
    except Exception as e:
        logger.error(f"Error calling ClaudeClient in QA: {e}")
        paper_titles = [p["title"] for p in papers_referenced[:5]]
        response = (
            f"Here is what I can tell you from the {len(papers_referenced)} papers in this research session:\n\n"
            f"Key papers in this collection:\n"
            + "\n".join(f"- {t}" for t in paper_titles)
            + "\n\nPlease check the Comparison Table tab for detailed method, dataset, and limitation "
            "information for each paper."
        )
        
    return {
        "answer": response,
        "papers_referenced": papers_referenced
    }

