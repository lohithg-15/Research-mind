import os
import logging
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse
from backend.api.jobs import jobs

logger = logging.getLogger("researchmind.api.export")
router = APIRouter()

@router.get("/export/{job_id}")
def export_report(job_id: str, format: str = Query("pdf", regex="^(pdf|docx)$")):
    """
    Downloads the compiled literature review report as a PDF or DOCX file.
    """
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found.")
        
    job = jobs[job_id]
    if job["status"] != "done":
        raise HTTPException(status_code=400, detail=f"Job status is {job['status']}. Report not ready for export.")
        
    state = job["state"]
    report_draft = state.get("report_draft", {})
    
    file_key = f"{format}_path"
    file_path = report_draft.get(file_key)
    
    if not file_path or not os.path.exists(file_path):
        logger.error(f"Report file path not found or does not exist: {file_path}")
        raise HTTPException(status_code=404, detail=f"Report file in {format.upper()} format was not generated.")
        
    # Return FileResponse with custom download filename
    filename = f"ResearchMind_Report_{job_id[:8]}.{format}"
    media_type = "application/pdf" if format == "pdf" else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type=media_type
    )
