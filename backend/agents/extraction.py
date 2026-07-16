import re
import fitz
import requests
import logging
from typing import List, Dict, Any, Tuple
from backend.clients.claude_client import ClaudeClient
from backend.data.models import PaperMeta, FieldRecord

logger = logging.getLogger("researchmind.extraction")

def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """
    Extracts text from PDF bytes using PyMuPDF (fitz).
    Reads the first 4 pages and the last 2 pages to balance context size.
    """
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        text = ""
        total_pages = len(doc)
        
        # Read first 4 and last 2 pages
        if total_pages <= 6:
            pages_to_read = list(range(total_pages))
        else:
            pages_to_read = list(range(4)) + list(range(total_pages - 2, total_pages))
            
        for page_num in pages_to_read:
            text += f"\n--- PAGE {page_num + 1} ---\n"
            text += doc[page_num].get_text()
            
        return text
    except Exception as e:
        logger.error(f"Error extracting text from PDF: {e}")
        return ""

def verify_grounding(extracted: Dict[str, str], text: str) -> Tuple[str, str]:
    """
    Verifies that the extracted fields are supported by the text.
    Returns (status, notes).
    """
    fields_to_check = ["method", "dataset", "key_metric", "limitation"]
    all_verified = True
    notes = []
    
    for f in fields_to_check:
        val = extracted.get(f, "").strip()
        quote = extracted.get(f"{f}_quote", "").strip()
        
        # If the value is "not specified" or similar and quote is empty, consider verified
        if not val or val.lower() in ["not specified", "none", "n/a", "unknown"]:
            continue
            
        if not quote:
            all_verified = False
            notes.append(f"Field '{f}' has no supporting quote.")
            continue
            
        # Clean quote and text to handle minor whitespace differences
        clean_quote = re.sub(r'\s+', '', quote.lower()).strip()
        clean_text = re.sub(r'\s+', '', text.lower()).strip()
        
        if clean_quote in clean_text:
            notes.append(f"Field '{f}' verified.")
        else:
            all_verified = False
            notes.append(f"Field '{f}' quote verification failed. Quote: '{quote}' not found.")
            
    status = "verified" if all_verified else "failed"
    return status, "; ".join(notes)

def run_extraction(state: dict) -> dict:
    """
    Downloads PDFs, extracts text, queries Claude to extract methodology fields,
    and runs a verification pass on returned quotes.
    """
    papers: List[PaperMeta] = state.get("papers", [])
    
    if "agent_status" not in state:
        state["agent_status"] = {}
        
    state["agent_status"]["extraction"] = "running"
    logger.info(f"Extraction Agent: Processing {len(papers)} papers.")
    
    extracted_records = []
    claude = ClaudeClient()
    
    for paper in papers:
        paper_text = ""
        abstract_only = True
        
        # 1. Attempt PDF retrieval
        if paper.pdf_url:
            logger.info(f"Attempting to download PDF for '{paper.title}' from {paper.pdf_url}")
            try:
                # Use a standard user-agent to prevent bot blockers on some domains
                headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
                response = requests.get(paper.pdf_url, headers=headers, timeout=20)
                
                # Verify that it is a valid PDF
                if response.status_code == 200 and response.content.startswith(b"%PDF"):
                    extracted_pdf_text = extract_text_from_pdf(response.content)
                    if extracted_pdf_text.strip():
                        paper_text = extracted_pdf_text
                        abstract_only = False
                        paper.full_text_available = True
                        logger.info(f"Successfully extracted full text for: {paper.title}")
                    else:
                        logger.warning(f"Extracted PDF text is empty for: {paper.title}")
                else:
                    logger.warning(f"Download failed or content is not PDF (status={response.status_code}) for: {paper.title}")
            except Exception as e:
                logger.error(f"Error downloading PDF for paper '{paper.title}': {e}")
                
        # 2. Fall back to abstract
        if abstract_only:
            logger.info(f"Falling back to abstract-only processing for '{paper.title}'")
            paper_text = f"Title: {paper.title}\nAbstract: {paper.abstract}"
            paper.full_text_available = False
            
        # 3. LLM Extraction Prompt
        prompt = f"""
Analyze the following paper text (which might be full text or just abstract) and extract the structured research details.
For each extracted field, you MUST also provide the exact text snippet or quote from the paper that supports/proves this extraction. 
If a field is not mentioned or specified in the text, set the value to "Not specified" and the quote to an empty string.

Paper text:
{paper_text[:12000]}

Return ONLY a valid JSON object matching the schema below. Do not include markdown formatting, backticks, or any explanation.
JSON Schema:
{{
  "method": "The main algorithm, architecture, or model proposed (e.g. Transformer, ResNet)",
  "method_quote": "exact sentence/phrase from the paper supporting the method",
  "dataset": "The training or evaluation dataset used (e.g. ImageNet, SQuAD)",
  "dataset_quote": "exact sentence/phrase from the paper supporting the dataset",
  "key_metric": "The main performance results achieved (e.g. 84.2% accuracy, perplexity of 18.2)",
  "key_metric_quote": "exact sentence/phrase from the paper supporting the key metric",
  "limitation": "The main limitation, error source, or constraint admitted by the authors (e.g. high computational cost)",
  "limitation_quote": "exact sentence/phrase from the paper supporting the limitation"
}}
"""
        try:
            response_text = claude.complete(
                prompt=prompt,
                system="You are a precise academic extraction assistant. You output only raw, valid JSON containing structured fields and exact quotes.",
                temperature=0.0
            )
            
            # Clean LLM response fences if present
            clean_text = response_text.strip()
            if clean_text.startswith("```json"):
                clean_text = clean_text[7:]
            elif clean_text.startswith("```"):
                clean_text = clean_text[3:]
            if clean_text.endswith("```"):
                clean_text = clean_text[:-3]
            clean_text = clean_text.strip()
            
            import json
            extracted = json.loads(clean_text)
            
            # 4. Verify Grounding Quotes
            status, notes = verify_grounding(extracted, paper_text)
            
            record = FieldRecord(
                paper_id=paper.id,
                method=extracted.get("method", "Not specified"),
                dataset=extracted.get("dataset", "Not specified"),
                key_metric=extracted.get("key_metric", "Not specified"),
                limitation=extracted.get("limitation", "Not specified"),
                year=paper.year,
                verification_status=status,
                verification_notes=notes,
                abstract_only=abstract_only
            )
            extracted_records.append(record)
            logger.info(f"Extracted fields for '{paper.title}' successfully. Status: {status}")
        except Exception as e:
            logger.error(f"Failed LLM extraction for paper '{paper.title}': {e}")
            # Fallback record
            record = FieldRecord(
                paper_id=paper.id,
                method="Not specified",
                dataset="Not specified",
                key_metric="Not specified",
                limitation="Not specified",
                year=paper.year,
                verification_status="failed",
                verification_notes=f"Extraction error: {str(e)}",
                abstract_only=abstract_only
            )
            extracted_records.append(record)
            
    state["extracted_fields"] = extracted_records
    state["agent_status"]["extraction"] = "done"
    return state
