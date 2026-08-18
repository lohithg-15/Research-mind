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

FULL_TEXT_PROMPT = """You are an expert academic research analyst. Extract structured information from the paper text below.

INSTRUCTIONS:
- Read the full text carefully. Extract the BEST answer for each field using evidence from the text.
- Be SPECIFIC and CONCISE. Use actual names, numbers, and terms from the paper.
- If a field is not explicitly named but can be reasonably inferred from context, infer it.
- Do NOT write vague answers like "various datasets" or "standard benchmarks" — be specific.
- Only write "Not available" if there is absolutely zero evidence in the text.

Paper text:
{paper_text}

Extract these fields:
- method: The specific algorithm, model architecture, or technique proposed (e.g., "BERT fine-tuned with contrastive loss", "ResNet-50 with attention gates")
- dataset: The specific dataset(s) used for training or evaluation (e.g., "ImageNet-1K", "SQuAD 2.0 + TriviaQA", "COCO 2017 val set")
- key_metric: The main quantitative result with the number (e.g., "92.4% accuracy on GLUE", "BLEU 41.8 on WMT14 En-De", "mAP 58.7 on COCO")
- limitation: The main limitation or acknowledged weakness (e.g., "High computational cost — requires 8 A100 GPUs", "Degrades on out-of-domain text", "Limited to English only")

For each field, provide a short supporting quote.

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

ABSTRACT_ONLY_PROMPT = """You are an expert academic research analyst. Based on the paper title and abstract below, extract structured research information.

You MUST provide a real, useful answer for every field. Think like an expert reading this abstract.

METHOD — Identify the core technical contribution. The title usually names it. Be specific (e.g., "sparse attention transformer", "graph neural network for drug discovery", "contrastive self-supervised learning framework").

DATASET — Identify what data or task domain the paper works with:
  - If a named dataset appears → use that name exactly.
  - If a task is mentioned (e.g., "image classification", "machine translation", "sentiment analysis") → state the task + likely benchmark type.
  - If a domain is mentioned (e.g., "medical imaging", "social media text", "financial data") → state that domain.
  - Only write "Not available" if there is truly zero mention of data, task, or application domain.

KEY METRIC — Look for numbers: accuracy, F1, BLEU, AUC, RMSE, mAP, perplexity, etc. Include the number and context. If only relative improvement is mentioned, state that. If none, write "Performance improvement demonstrated".

LIMITATION — Look for: "however", "although", "limited to", "future work", "cannot", "fails on", "restricted to", computational cost, generalization concerns, scope restrictions. Even if not explicit, infer a likely limitation from the method's scope or domain.

Paper:
Title: {title}
Abstract: {abstract}

Return ONLY a valid JSON object:
{{
  "method": "...",
  "dataset": "...",
  "key_metric": "...",
  "limitation": "..."
}}"""

# Canonical blank/useless values to detect
_BLANK_VALUES = {
    "not specified", "not available", "n/a", "none", "unknown",
    "not mentioned", "not stated", "not provided", "not given",
    "not reported", "not applicable", "no limitation mentioned",
    "not explicitly mentioned", "not explicitly stated",
    "performance improvement demonstrated",
}

def _is_blank(val: str) -> bool:
    """Returns True if an extracted value is effectively empty/useless."""
    if not val:
        return True
    return val.strip().lower() in _BLANK_VALUES or len(val.strip()) < 5


INFERENCE_PROMPT = """You are an expert academic researcher. Based on the paper title and abstract below, answer the following questions as clearly and specifically as possible.

Title: {title}
Abstract: {abstract}

Answer each question with a short, direct, specific phrase (not a full sentence):
{questions}

Return ONLY a valid JSON object with exactly these keys:
{{
{json_fields}
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
                    "You are an expert academic research analyst. "
                    "Extract specific, clear, informative answers from academic papers. "
                    "Use expert knowledge to interpret and infer where needed — do not refuse to answer."
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

            # 4. Second-pass inference for any blank fields
            blank_fields = {
                f: extracted.get(f, "")
                for f in ["method", "dataset", "key_metric", "limitation"]
                if _is_blank(extracted.get(f, ""))
            }
            if blank_fields and (paper.title or paper.abstract):
                FIELD_QUESTIONS = {
                    "method":     'What is the main technique, model, or approach proposed by this paper?',
                    "dataset":    'What dataset, benchmark, or data domain does this paper use or evaluate on?',
                    "key_metric": 'What performance metric or result is reported or implied?',
                    "limitation": 'What is the most likely limitation or constraint of this approach?',
                }
                questions_text = "\n".join(
                    f'- {k.upper()}: {FIELD_QUESTIONS[k]}' for k in blank_fields
                )
                json_fields_text = "\n".join(
                    f'  "{k}": "..."' for k in blank_fields
                )
                inf_prompt = INFERENCE_PROMPT.format(
                    title=paper.title or "",
                    abstract=paper.abstract or "",
                    questions=questions_text,
                    json_fields=json_fields_text,
                )
                try:
                    inf_resp = claude.complete(
                        prompt=inf_prompt,
                        system="You are an expert academic researcher. Give specific, direct answers.",
                        temperature=0.1
                    )
                    inf_clean = inf_resp.strip()
                    if inf_clean.startswith("```json"): inf_clean = inf_clean[7:]
                    elif inf_clean.startswith("```"): inf_clean = inf_clean[3:]
                    if inf_clean.endswith("```"): inf_clean = inf_clean[:-3]
                    inf_extracted = json.loads(inf_clean.strip())
                    for f in blank_fields:
                        if f in inf_extracted and not _is_blank(inf_extracted[f]):
                            extracted[f] = inf_extracted[f]
                            logger.info(f"Second-pass filled '{f}' for '{paper.title}'")
                except Exception as ie:
                    logger.warning(f"Second-pass inference failed for '{paper.title}': {ie}")

            # 5. Verify Grounding
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
            # Fallback — derive fields from title
            words = (paper.title or "").split()
            method_hint = " ".join(words[:6]) if words else "See title"
            record = FieldRecord(
                paper_id=paper.id,
                method=method_hint,
                dataset="See abstract",
                key_metric="Not available",
                limitation="Not available",
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
