import re
import fitz
import requests
import json
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


def verify_grounding(extracted: Dict[str, str], text: str, abstract_only: bool) -> Tuple[str, str]:
    """
    Verifies that the extracted fields are supported by the text.
    For abstract-only papers uses a relaxed check (keyword presence).
    Returns (status, notes).
    """
    fields_to_check = ["method", "dataset", "key_metric", "limitation"]
    all_verified = True
    notes = []
    clean_text_lower = text.lower()

    for f in fields_to_check:
        val = extracted.get(f, "").strip()

        if not val or val.lower() in ["not specified", "none", "n/a", "unknown", "not mentioned"]:
            notes.append(f"Field '{f}': not found in text (acceptable).")
            continue

        if abstract_only:
            # Relaxed: check if at least one significant word from the value appears in the text
            significant_words = [w for w in re.findall(r'\b\w{4,}\b', val.lower()) if w not in {
                "with", "that", "this", "from", "using", "based", "model", "paper", "approach"
            }]
            found = any(w in clean_text_lower for w in significant_words)
            if found:
                notes.append(f"Field '{f}': keyword-verified in abstract.")
            else:
                all_verified = False
                notes.append(f"Field '{f}': value '{val}' not grounded in abstract text.")
        else:
            # Full-text: check exact quote presence
            quote = extracted.get(f"{f}_quote", "").strip()
            if not quote:
                all_verified = False
                notes.append(f"Field '{f}' has no supporting quote.")
                continue

            clean_quote = re.sub(r'\s+', '', quote.lower()).strip()
            clean_text = re.sub(r'\s+', '', clean_text_lower).strip()

            if clean_quote in clean_text:
                notes.append(f"Field '{f}' verified.")
            else:
                all_verified = False
                notes.append(f"Field '{f}' quote not found in full text.")

    if abstract_only:
        # For abstract-only, "verified" means keywords found; otherwise "unverified" (not "failed")
        status = "verified" if all_verified else "unverified"
    else:
        status = "verified" if all_verified else "failed"

    return status, "; ".join(notes)


# ---------------------------------------------------------------------------
# LLM Extraction Prompts
# ---------------------------------------------------------------------------

FULL_TEXT_PROMPT = """You are a precise academic extraction assistant. Analyze the paper text below and extract structured research details.

CRITICAL RULES:
- Extract ONLY from the paper text provided below. Do NOT use any prior knowledge or training data.
- If a field is not explicitly stated in the text, set its value to "Not specified".
- Provide exact quotes from the paper text as evidence.

Paper text:
{paper_text}

Extract these fields:
- method: The main algorithm, model, or technique proposed in THIS paper (e.g., "BERT", "ResNet-50", "Proximal Policy Optimization")
- dataset: The specific training or evaluation dataset used (e.g., "ImageNet-1K", "SQuAD 2.0", "COCO 2017")
- key_metric: The main quantitative result reported (e.g., "92.4% accuracy on GLUE", "BLEU score of 41.8")
- limitation: The main limitation, constraint, or future work admitted by the authors

For each field, provide a short exact quote from the paper supporting it.

Return ONLY a valid JSON object:
{{
  "method": "...",
  "method_quote": "exact sentence from paper",
  "dataset": "...",
  "dataset_quote": "exact sentence from paper",
  "key_metric": "...",
  "key_metric_quote": "exact sentence from paper",
  "limitation": "...",
  "limitation_quote": "exact sentence from paper"
}}"""

ABSTRACT_ONLY_PROMPT = """You are a precise academic extraction assistant. Analyze ONLY the abstract/metadata below.

CRITICAL RULES:
- Extract ONLY from the text provided. Do NOT use any prior knowledge or training data.
- Many abstracts don't mention specific datasets or metrics — if something is not stated, write "Not specified".
- Be specific: use the actual name of any model/method mentioned in the abstract (e.g. "BERT", "GPT-4", "contrastive learning").
- Do NOT invent values, do NOT use generic defaults like "Multi-Head Self-Attention" or "Wikitext-103" unless those exact words appear in the text.

Paper:
Title: {title}
Abstract: {abstract}

Extract:
- method: What specific technique, model, or approach does this paper propose? (from the title/abstract only)
- dataset: What specific dataset(s) are mentioned? (write "Not specified" if none mentioned)
- key_metric: What specific performance result is mentioned? (write "Not specified" if none mentioned)
- limitation: What limitation, challenge, or future direction does the abstract mention? (write "Not specified" if none)

Return ONLY a valid JSON object:
{{
  "method": "...",
  "dataset": "...",
  "key_metric": "...",
  "limitation": "..."
}}"""


def run_extraction(state: dict) -> dict:
    """
    Downloads PDFs, extracts text, queries Claude to extract methodology fields,
    and runs a verification pass. Uses separate prompts for full-text vs abstract-only mode.
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

        # 1. Attempt PDF retrieval (only for papers with full-text available)
        if paper.pdf_url and paper.full_text_available:
            logger.info(f"Attempting to download PDF for '{paper.title}' from {paper.pdf_url}")
            try:
                headers = {"User-Agent": "Mozilla/5.0 (compatible; ResearchMindBot/1.0)"}
                response = requests.get(paper.pdf_url, headers=headers, timeout=20)

                # Verify it is a valid PDF
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
                    logger.warning(
                        f"PDF download failed (status={response.status_code}) for: {paper.title}"
                    )
            except Exception as e:
                logger.error(f"Error downloading PDF for '{paper.title}': {e}")

        # 2. Build prompt depending on mode
        if abstract_only:
            logger.info(f"Using abstract-only extraction for '{paper.title}'")
            prompt = ABSTRACT_ONLY_PROMPT.format(
                title=paper.title,
                abstract=paper.abstract or "(No abstract available)"
            )
            paper.full_text_available = False
        else:
            prompt = FULL_TEXT_PROMPT.format(paper_text=paper_text[:12000])

        # 3. LLM Extraction
        try:
            response_text = claude.complete(
                prompt=prompt,
                system=(
                    "You are a precise academic extraction assistant. "
                    "You extract ONLY what is written in the provided text. "
                    "You NEVER use prior knowledge or training data to fill in missing information."
                ),
                temperature=0.0
            )

            # Clean LLM response fences
            clean_text = response_text.strip()
            if clean_text.startswith("```json"):
                clean_text = clean_text[7:]
            elif clean_text.startswith("```"):
                clean_text = clean_text[3:]
            if clean_text.endswith("```"):
                clean_text = clean_text[:-3]
            clean_text = clean_text.strip()

            extracted = json.loads(clean_text)

            # 4. Verify Grounding
            text_for_verify = paper_text if not abstract_only else f"{paper.title}\n{paper.abstract}"
            status, notes = verify_grounding(extracted, text_for_verify, abstract_only)

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
            logger.info(f"Extracted fields for '{paper.title}'. Status: {status}")

        except Exception as e:
            logger.error(f"Failed LLM extraction for paper '{paper.title}': {e}")
            # Fallback — derive method hint from title
            title_hint = paper.title[:80] if paper.title else "Not specified"
            record = FieldRecord(
                paper_id=paper.id,
                method=f"See title: {title_hint}",
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
    logger.info(f"Extraction Agent done: {len(extracted_records)} records.")
    return state
