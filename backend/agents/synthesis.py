import logging
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Any, Tuple
from backend.clients.claude_client import ClaudeClient
from backend.data.models import PaperMeta, FieldRecord, Summary, resolve_paper_url_from_meta
from backend.logging_utils import get_job_logger
from backend.api.jobs import is_cancelled

logger = logging.getLogger("researchmind.synthesis")

MAX_SYNTHESIS_WORKERS = 8


def _process_single_paper_summary(
    paper: PaperMeta,
    record: FieldRecord,
    claude: ClaudeClient,
    job_id: str = None,
) -> Tuple[Summary, Dict[str, Any]]:
    """
    Generates the source-grounded summary and comparison table row for a
    single paper. Never raises — falls back to an error Summary matching
    current behavior.
    """
    log = get_job_logger(logger, job_id)
    record_info = ""
    if record:
        record_info = (
            f"Proposed Method: {record.method}\n"
            f"Evaluation Dataset: {record.dataset}\n"
            f"Key Metric: {record.key_metric}\n"
            f"Limitation: {record.limitation}\n"
        )

    prompt = f"""
Write a concise, factual 3-sentence summary of the following academic paper based on its metadata and extracted facts.
You MUST provide sentence-level source attribution by appending [Source: Abstract], [Source: Method], [Source: Dataset], [Source: Key Metric], or [Source: Limitation] to the end of each sentence as appropriate.

Paper Details:
Title: {paper.title}
Abstract: {paper.abstract}
{record_info}

Example output:
This paper introduces a new architecture called the Transformer to replace recurrent layers [Source: Method]. The authors evaluate their model on the WMT 2014 translation task [Source: Dataset]. It achieves a BLEU score of 28.4, establishing a new state of the art [Source: Key Metric].

Return ONLY the summary text with attributions. Do not add intro, markdown formatting, or commentary.
"""
    try:
        summary_text = claude.complete(
            prompt=prompt,
            system="You are an expert research synthesis writer. You produce only raw text summaries with sentence-level bracketed attributions.",
            temperature=0.0
        ).strip()

        # Parse attributions from summary sentences
        # Split summary into sentences by finding punctuation followed by bracketed source
        # E.g. "Sentence text [Source: X]."
        sentences = re.split(r'(?<=\.|\!|\?)\s+(?=[A-Z])|(?<=\])\s+(?=[A-Z])', summary_text)
        attributions_list = []

        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue
            match = re.search(r'\[Source:\s*([^\]]+)\]', sentence)
            source = match.group(1) if match else "General Context"
            attributions_list.append({
                "sentence": sentence,
                "source": source
            })

        summary = Summary(
            paper_id=paper.id,
            title=paper.title,
            summary_text=summary_text,
            attributions=attributions_list
        )

    except Exception as e:
        log.error(f"Failed to generate summary for '{paper.title}': {e}")
        summary = Summary(
            paper_id=paper.id,
            title=paper.title,
            summary_text=f"Summary unavailable due to synthesis error: {e}",
            attributions=[{"sentence": "Summary unavailable.", "source": "Error"}]
        )

    comparison_row = {
        "id": paper.id,
        "title": paper.title,
        "authors": paper.authors,
        "year": paper.year,
        "venue": paper.venue,
        "arxiv_id": paper.arxiv_id,
        "doi": paper.doi,
        "pdf_url": paper.pdf_url,
        "url": resolve_paper_url_from_meta(paper),
        "method": record.method if record else "Not specified",
        "dataset": record.dataset if record else "Not specified",
        "key_metric": record.key_metric if record else "Not specified",
        "limitation": record.limitation if record else "Not specified",
        "verification_status": record.verification_status if record else "unverified",
        "abstract_only": record.abstract_only if record else False
    }

    return summary, comparison_row


def run_synthesis(state: dict) -> dict:
    """
    Produces source-grounded summaries for each paper and compiles
    the comparison table using extracted fields.
    """
    log = get_job_logger(logger, state.get("job_id"))

    if state.get("agent_status", {}).get("search") == "cancelled" or \
       state.get("agent_status", {}).get("extraction") == "cancelled":
        state["agent_status"]["synthesis"] = "cancelled"
        return state

    papers: List[PaperMeta] = state.get("papers", [])
    extracted_fields: List[FieldRecord] = state.get("extracted_fields", [])

    if "agent_status" not in state:
        state["agent_status"] = {}

    state["agent_status"]["synthesis"] = "running"
    log.info("Synthesis Agent: Summarizing papers and compiling comparison table.")
    
    # Map paper_id to its extracted record for fast lookup
    records_map = {r.paper_id: r for r in extracted_fields}

    claude = ClaudeClient()
    job_id = state.get("job_id")

    summaries = [None] * len(papers)  # preserve original order
    comparison_table = [None] * len(papers)  # preserve original order

    with ThreadPoolExecutor(max_workers=MAX_SYNTHESIS_WORKERS) as executor:
        future_to_idx = {
            executor.submit(
                _process_single_paper_summary, paper, records_map.get(paper.id), claude, job_id
            ): idx
            for idx, paper in enumerate(papers)
        }
        cancelled_mid_run = False
        for future in as_completed(future_to_idx):
            if job_id and is_cancelled(job_id):
                log.info(f"Job {job_id} cancelled during synthesis; stopping early.")
                executor.shutdown(wait=False, cancel_futures=True)
                cancelled_mid_run = True
                break
            idx = future_to_idx[future]
            summary, comparison_row = future.result()
            summaries[idx] = summary
            comparison_table[idx] = comparison_row

    if cancelled_mid_run:
        state["agent_status"]["synthesis"] = "cancelled"
        return state

    summaries = [s for s in summaries if s is not None]
    comparison_table = [c for c in comparison_table if c is not None]

    state["summaries"] = summaries
    state["comparison_table"] = comparison_table
    state["agent_status"]["synthesis"] = "done"
    log.info("Synthesis Agent successfully completed.")
    return state
