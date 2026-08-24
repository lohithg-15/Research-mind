"""
Gemini LLM client for ResearchMind.

Named 'claude_client.py' for backward compatibility — all agent imports
remain unchanged. The class 'ClaudeClient' wraps the Google Gemini API
(gemini-3.6-flash) and falls back to a deterministic mock when the key
is missing or on API failure.
"""

import os
import json
import logging

logger = logging.getLogger("researchmind.gemini")

# Model to use — gemini-3.6-flash is the latest fast model
_GEMINI_MODEL = "gemini-3.6-flash"


class ClaudeClient:
    """
    LLM client backed by Google Gemini.

    Drop-in replacement for the old Anthropic Claude client.
    Call `client.complete(prompt, system, max_tokens, temperature)` exactly
    as before — the interface is identical.
    """

    def __init__(self):
        self.api_key = (
            os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY", "")
        ).strip("'\" ")

        if self.api_key and self.api_key not in ("your-gemini-api-key-here", ""):
            try:
                from google import genai  # type: ignore
                self._client = genai.Client(api_key=self.api_key)
                self.provider = "gemini"
                logger.info(
                    f"GeminiClient: Initialized successfully using model '{_GEMINI_MODEL}'."
                )
            except Exception as exc:
                logger.error(f"GeminiClient: Failed to initialize — {exc}")
                self._client = None
                self.provider = "mock"
        else:
            logger.warning(
                "GeminiClient: GEMINI_API_KEY not set. Running in Mock Mode."
            )
            self._client = None
            self.provider = "mock"

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    def complete(
        self,
        prompt: str,
        system: str = "You are an AI research assistant.",
        max_tokens: int = 2000,
        temperature: float = 0.0,
    ) -> str:
        """
        Send *prompt* to Gemini and return the text response.
        Falls back to a deterministic mock on failure.
        """
        if self.provider == "mock" or self._client is None:
            logger.info("GeminiClient: Mock Mode — returning simulated response.")
            return self._mock_response(prompt)

        try:
            from google.genai import types as genai_types  # type: ignore

            # Combine system instructions + user prompt into a single turn
            combined = f"System instructions: {system}\n\n{prompt}" if system else prompt

            response = self._client.models.generate_content(
                model=_GEMINI_MODEL,
                contents=combined,
                config=genai_types.GenerateContentConfig(
                    temperature=temperature,
                    max_output_tokens=max_tokens,
                ),
            )

            text = (response.text or "").strip()
            if not text:
                raise ValueError("Empty response from Gemini API.")

            # Strip markdown code fences the model sometimes wraps around JSON
            if text.startswith("```json"):
                text = text.split("```json", 1)[1].split("```", 1)[0].strip()
            elif text.startswith("```"):
                text = text.split("```", 1)[1].split("```", 1)[0].strip()

            return text

        except Exception as exc:
            logger.error(f"GeminiClient: API call failed — {exc}. Falling back to mock.")
            return self._mock_response(prompt)

    # ------------------------------------------------------------------
    # Mock responses (used when key is absent or on API failure)
    # ------------------------------------------------------------------

    def _mock_response(self, prompt: str) -> str:
        p = prompt.lower()

        # Planner
        if "decompose the following research topic" in p:
            return json.dumps([
                "attention mechanisms in transformer models",
                "efficient transformer architectures for NLP",
                "limitations and computational complexity of transformers",
            ])

        # Abstract-only extraction prompt
        if "analyze the following paper text" in p or "title:" in p and "abstract:" in p and "method" in p:
            # Try to pull a few words from the title to make mock realistic
            title_match = __import__('re').search(r'title:\s*(.+)', prompt, __import__('re').IGNORECASE)
            title_hint = title_match.group(1).strip()[:40] if title_match else "this paper"
            return json.dumps({
                "method":     f"Technique described in '{title_hint}'",
                "dataset":    "Domain-specific benchmark dataset",
                "key_metric": "Performance improvement demonstrated",
                "limitation": "Evaluated on limited data domains; generalization requires further study",
            })

        # Full-text extraction prompt
        if "paper text" in p and "method" in p and "dataset" in p:
            return json.dumps({
                "method":          "Deep learning approach with attention mechanism",
                "method_quote":    "attention",
                "dataset":         "Benchmark dataset from paper",
                "dataset_quote":   "dataset",
                "key_metric":      "Improved performance over baselines",
                "key_metric_quote":"outperforms",
                "limitation":      "Computational requirements limit deployment on resource-constrained devices",
                "limitation_quote":"computational",
            })

        # Second-pass inference prompt
        if "answer the following questions" in p or ("method" in p and "dataset" in p and "limitation" in p):
            title_match = __import__('re').search(r'title:\s*(.+)', prompt, __import__('re').IGNORECASE)
            title_hint = title_match.group(1).strip()[:40] if title_match else "this paper"
            return json.dumps({
                "method":     f"Core approach in '{title_hint}'",
                "dataset":    "Standard benchmark for this domain",
                "key_metric": "Competitive performance demonstrated",
                "limitation": "Scope limited to specific experimental conditions",
            })

        # Summary
        if "write a concise, factual 3-sentence summary" in p:
            return (
                "This work introduces a novel deep learning approach for the target task [Source: Method]. "
                "The method is evaluated on standard benchmarks and achieves competitive results [Source: Key Metric]. "
                "Future work will address generalization limitations identified in this study [Source: Limitation]."
            )

        # Thematic synthesis / report sections
        if "thematic synthesis" in p or "academic literature review" in p:
            return (
                "### 3.1 Methodological Paradigms\n"
                "Current research focuses on transformer-based approaches that leverage self-attention mechanisms. "
                "Multiple paradigms have emerged including sparse attention and low-rank approximations.\n\n"
                "### 3.2 Empirical Evaluation & Benchmarks\n"
                "Validation typically uses standard benchmarks such as ImageNet, GLUE, and WMT translation tasks.\n\n"
                "### 3.3 Identified Limitations and Research Gaps\n"
                "A critical gap remains between theoretical complexity reduction and practical latency gains.\n\n"
                "### 3.4 Critical Assessment\n"
                "Despite progress, evaluation on out-of-domain data remains limited across most studies."
            )

        if "compile report" in p or "literature review report" in p:
            return (
                "# Research Report\n\n## Introduction\n"
                "This report analyses recent literature on the given research topic.\n\n"
                "## Gaps\nA key identified gap is the lack of evaluation on diverse, real-world datasets.\n"
            )

        # Introduction / gap narrative
        if "introduction" in p or "narrative" in p or "gap" in p:
            return (
                "Recent advances in this research domain have demonstrated significant progress. "
                "This report synthesises key findings from the surveyed literature and identifies "
                "areas where further investigation is needed."
            )

        return json.dumps({
            "method": "See paper", "dataset": "See abstract",
            "key_metric": "See results section", "limitation": "See discussion section",
        })
