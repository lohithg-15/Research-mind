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

    def _mock_extract_from_prompt(self, prompt: str, full_text: bool = False) -> str:
        """
        Intelligent mock extraction that parses the actual paper content from
        the prompt and returns unique, paper-specific data instead of generic
        placeholder strings.
        """
        import re

        # Extract title and abstract/text from the prompt
        title_match = re.search(r'Title:\s*(.+?)(?:\n|$)', prompt, re.IGNORECASE)
        title = title_match.group(1).strip() if title_match else ""

        abstract_match = re.search(
            r'Abstract:\s*(.+?)(?:\n\n|Return ONLY|Extract these|$)',
            prompt, re.IGNORECASE | re.DOTALL
        )
        abstract = abstract_match.group(1).strip() if abstract_match else ""

        # For full-text prompts, use the paper text section
        if full_text and not abstract:
            text_match = re.search(
                r'Paper text:\s*(.+?)(?:\nExtract these|$)',
                prompt, re.IGNORECASE | re.DOTALL
            )
            abstract = text_match.group(1).strip()[:3000] if text_match else ""

        combined = f"{title} {abstract}".lower()

        # ── Method: find architecture/technique keywords and build specific description ──
        METHOD_PATTERNS = [
            (r'(?:propos|introduc|present|develop)\w*\s+(?:a\s+)?(.{10,80}?)(?:\.|,|\s+that|\s+which|\s+for)', ""),
            (r'(transformer[^.]{0,40})', "Transformer-based "),
            (r'(bert[^.]{0,40})', "BERT-based "),
            (r'(gpt[^.]{0,40})', "GPT-based "),
            (r'(attention[^.]{0,50})', "Attention-based "),
            (r'(convolution\w*[^.]{0,40})', "CNN-based "),
            (r'(diffusion[^.]{0,40})', "Diffusion "),
            (r'(generative[^.]{0,40})', "Generative "),
            (r'(reinforcement[^.]{0,40})', "Reinforcement learning "),
            (r'(graph neural[^.]{0,40})', "GNN-based "),
            (r'(federated[^.]{0,40})', "Federated "),
            (r'(knowledge distill\w*[^.]{0,40})', "Knowledge distillation "),
            (r'(self-supervis\w*[^.]{0,40})', "Self-supervised "),
            (r'(contrastive[^.]{0,40})', "Contrastive learning "),
            (r'(retrieval[^.]{0,40})', "Retrieval-based "),
            (r'(fine-tun\w*[^.]{0,40})', "Fine-tuning "),
            (r'(meta-learn\w*[^.]{0,40})', "Meta-learning "),
            (r'(zero-shot[^.]{0,40})', "Zero-shot "),
            (r'(few-shot[^.]{0,40})', "Few-shot learning "),
            (r'(multi-modal[^.]{0,40})', "Multi-modal "),
            (r'(recurrent[^.]{0,40})', "RNN-based "),
            (r'(autoencoder[^.]{0,40})', "Autoencoder-based "),
            (r'(variational[^.]{0,40})', "VAE-based "),
            (r'(neuro\w*[^.]{0,40})', "Neural "),
            (r'(deep learn\w*[^.]{0,40})', "Deep learning "),
        ]
        method = None
        search_text = f"{title} {abstract}"
        for pat, prefix in METHOD_PATTERNS:
            m = re.search(pat, search_text, re.IGNORECASE)
            if m:
                snippet = m.group(1).strip().rstrip('.,;:')
                method = f"{prefix}{snippet}" if prefix and prefix.lower() not in snippet.lower() else snippet
                method = method[:100]
                break
        if not method:
            method = " ".join(title.split()[:8]) if title else "Novel approach described in this paper"

        # ── Dataset: find named datasets or task domains ──
        DATASET_MAP = {
            'imagenet': 'ImageNet', 'cifar-10': 'CIFAR-10', 'cifar-100': 'CIFAR-100',
            'coco': 'MS COCO', 'squad': 'SQuAD', 'glue': 'GLUE', 'superglue': 'SuperGLUE',
            'wmt': 'WMT', 'wikitext': 'WikiText', 'imdb': 'IMDb', 'yelp': 'Yelp Reviews',
            'mnist': 'MNIST', 'svhn': 'SVHN', 'celeba': 'CelebA', 'voc': 'Pascal VOC',
            'cityscapes': 'Cityscapes', 'kitti': 'KITTI', 'nuscenes': 'nuScenes',
            'librispeech': 'LibriSpeech', 'common voice': 'Common Voice',
            'penn treebank': 'Penn Treebank', 'conll': 'CoNLL', 'snli': 'SNLI',
            'mnli': 'MultiNLI', 'openwebtext': 'OpenWebText', 'c4': 'C4',
            'laion': 'LAION', 'conceptual captions': 'Conceptual Captions',
            'visual genome': 'Visual Genome', 'vqa': 'Visual QA',
            'ag news': 'AG News', 'amazon': 'Amazon Reviews',
            'mimic': 'MIMIC', 'chexpert': 'CheXpert',
        }
        dataset = None
        for key, name in DATASET_MAP.items():
            if key in combined:
                # Look for multiple datasets
                found = [name]
                for k2, n2 in DATASET_MAP.items():
                    if k2 != key and k2 in combined:
                        found.append(n2)
                        if len(found) >= 3:
                            break
                dataset = ", ".join(found)
                break

        if not dataset:
            TASK_PATTERNS = [
                (r'(image classif\w+)', 'Image classification benchmarks'),
                (r'(object detect\w+)', 'Object detection benchmarks'),
                (r'(semantic segmentat\w+)', 'Semantic segmentation datasets'),
                (r'(machine translat\w+)', 'Machine translation datasets'),
                (r'(text classif\w+)', 'Text classification corpora'),
                (r'(sentiment analy\w+)', 'Sentiment analysis datasets'),
                (r'(question answer\w+)', 'Question answering datasets'),
                (r'(named entity)', 'NER benchmark corpora'),
                (r'(speech recogn\w+)', 'Speech recognition datasets'),
                (r'(medical imag\w+)', 'Medical imaging datasets'),
                (r'(drug discover\w+)', 'Drug discovery/molecular datasets'),
                (r'(natural language (?:process|understand|infer)\w+)', 'NLP benchmark suite'),
                (r'(recomm\w+ system\w*)', 'Recommendation system datasets'),
                (r'(autonomous driv\w+)', 'Autonomous driving datasets'),
                (r'(protein|genom\w+|bioinformat\w+)', 'Bioinformatics datasets'),
                (r'(robot\w+|manipulat\w+)', 'Robotics simulation environments'),
                (r'(time series)', 'Time series datasets'),
                (r'(point cloud)', 'Point cloud datasets'),
                (r'(video\s+\w+)', 'Video understanding datasets'),
                (r'(audio|music)', 'Audio/music datasets'),
            ]
            for pat, label in TASK_PATTERNS:
                if re.search(pat, combined):
                    dataset = label
                    break

        if not dataset:
            # Extract domain from abstract
            domain_match = re.search(
                r'(?:on|using|from|with)\s+(?:the\s+)?(\w+(?:\s+\w+){0,3})\s+(?:dataset|corpus|benchmark|data)',
                abstract, re.IGNORECASE
            )
            if domain_match:
                dataset = domain_match.group(1).strip().title() + " dataset"
            else:
                dataset = "Task-specific evaluation data (see abstract)"

        # ── Key metric: find actual numbers ──
        metric = None
        METRIC_PATTERNS = [
            r'(\d+\.?\d*\s*%\s*(?:accuracy|f1|precision|recall|top-\d|auc|ap|map)?)',
            r'((?:accuracy|f1|bleu|rouge|map|auc|rmse|mae|perplexity|psnr|ssim|dice|iou|cer|wer)[\s:=of]+\d+\.?\d*)',
            r'(\d+\.?\d*\s+(?:bleu|rouge|map|auc|f1|accuracy|psnr|ssim))',
            r'((?:achieve|obtain|reach)\w*\s+\w*\s*\d+\.?\d*[%]?\s*(?:on|in|for)?[^.]{0,30})',
            r'(\d+\.?\d*[x×]\s*(?:faster|speedup|improvement))',
            r'((?:state[- ]of[- ]the[- ]art|sota)\s*[^.]{0,40})',
            r'(outperform\w*[^.]{0,50})',
            r'(improve\w*\s+(?:by|over)\s+\d+[^.]{0,30})',
            r'(reduce\w*\s+(?:by)?\s*\d+[^.]{0,30})',
        ]
        for pat in METRIC_PATTERNS:
            m = re.search(pat, f"{title} {abstract}", re.IGNORECASE)
            if m:
                metric = m.group(1).strip().rstrip('.,;:')[:80]
                break
        if not metric:
            if re.search(r'state.of.the.art|sota|superior|competitive', combined):
                metric = "Achieves competitive/state-of-the-art performance"
            elif re.search(r'significant|substantial|notable', combined):
                metric = "Significant improvement over prior baselines"
            else:
                metric = "Performance gains demonstrated over existing methods"

        # ── Limitation: find actual constraints from text ──
        limitation = None
        LIM_PATTERNS = [
            r'(?:however|although|but|while|despite|nonetheless)[,\s]+([^.]{15,120})',
            r'(limited to [^.]{10,80})',
            r'(cannot [^.]{10,60})',
            r'(restricted to [^.]{10,60})',
            r'(does not (?:handle|support|address|consider|scale)[^.]{5,60})',
            r'(fail[s]?\s+(?:on|to|when|for)[^.]{10,60})',
            r'(high\w*\s+computational[^.]{5,60})',
            r'(requires?\s+(?:large|extensive|significant|substantial)[^.]{5,60})',
            r'(future work[^.]{10,80})',
            r'(only\s+(?:work|train|test|appli|evaluat|consider)\w*[^.]{10,60})',
            r'(english[- ]only|single[- ]language|monolingual)',
            r'(sensitive to [^.]{5,50})',
            r'(assumes? [^.]{10,50})',
            r'(scalab\w+ (?:issue|challenge|limitation|concern)[^.]{0,40})',
        ]
        for pat in LIM_PATTERNS:
            m = re.search(pat, f"{title} {abstract}", re.IGNORECASE)
            if m:
                limitation = m.group(1).strip().rstrip('.,;:')
                limitation = limitation[0].upper() + limitation[1:] if limitation else None
                if limitation and len(limitation) > 15:
                    limitation = limitation[:150]
                    break
                limitation = None

        if not limitation:
            # Infer limitation from the method/domain scope
            if 'english' in combined or 'monolingual' in combined:
                limitation = "Evaluated only on English data; multilingual generalization not tested"
            elif 'specific domain' in combined or 'domain-specific' in combined:
                limitation = "Domain-specific approach; cross-domain transferability not evaluated"
            elif 'small' in combined and ('dataset' in combined or 'corpus' in combined):
                limitation = "Evaluated on relatively small-scale datasets"
            elif 'supervised' in combined:
                limitation = "Requires labeled training data which may be expensive to obtain"
            elif 'computational' in combined or 'gpu' in combined or 'resource' in combined:
                limitation = "High computational requirements may limit practical deployment"
            elif title:
                # Use the scope of the title to construct a limitation
                scope_words = [w for w in title.split() if len(w) > 3 and w.lower() not in {
                    'with', 'from', 'that', 'this', 'using', 'based', 'learning', 'model', 'paper',
                    'approach', 'method', 'novel', 'efficient', 'improved', 'toward', 'towards',
                    'deep', 'neural', 'network', 'networks',
                }]
                if scope_words:
                    limitation = f"Scope focused on {' '.join(scope_words[:3]).lower()}; broader generalization not explored"
                else:
                    limitation = "Generalization beyond the tested conditions requires further study"
            else:
                limitation = "Broader applicability and scalability not fully explored"

        result = {
            "method": method,
            "dataset": dataset,
            "key_metric": metric,
            "limitation": limitation,
        }

        # Add quotes for full-text extraction mode
        if full_text:
            for field in ["method", "dataset", "key_metric", "limitation"]:
                val = result.get(field, "")
                # Use first few words as a pseudo-quote
                words = val.split()[:4]
                result[f"{field}_quote"] = " ".join(words) if words else field

        return json.dumps(result)


    def _mock_response(self, prompt: str) -> str:
        p = prompt.lower()

        # Planner
        if "decompose the following research topic" in p:
            return json.dumps([
                "attention mechanisms in transformer models",
                "efficient transformer architectures for NLP",
                "limitations and computational complexity of transformers",
            ])

        # QA assistant prompts — MUST be checked BEFORE extraction handlers
        # because QA prompts also contain 'title:', 'method', 'abstract:' keywords
        if "question:" in p and ("paper id:" in p or "most relevant papers" in p or "literature review" in p):
            return self._mock_qa_response(prompt)

        # Abstract-only extraction prompt
        if ("analyze the following paper text" in p
            or ("title:" in p and "abstract:" in p and "method" in p)):
            return self._mock_extract_from_prompt(prompt)

        # Full-text extraction prompt
        if "paper text" in p and "method" in p and "dataset" in p:
            return self._mock_extract_from_prompt(prompt, full_text=True)

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

        # Second-pass inference prompt
        if "answer the following questions" in p or ("method" in p and "dataset" in p and "limitation" in p and "title:" in p):
            return self._mock_extract_from_prompt(prompt)

        # Summary
        if "write a concise, factual 3-sentence summary" in p:
            return (
                "This work introduces a novel deep learning approach for the target task [Source: Method]. "
                "The method is evaluated on standard benchmarks and achieves competitive results [Source: Key Metric]. "
                "Future work will address generalization limitations identified in this study [Source: Limitation]."
            )

        return json.dumps({
            "method": "See paper", "dataset": "See abstract",
            "key_metric": "See results section", "limitation": "See discussion section",
        })

    def _mock_qa_response(self, prompt: str) -> str:
        """
        Generates a natural language answer for QA prompts by reading
        paper context from the prompt. Returns prose, NOT JSON.
        """
        import re

        q_match = re.search(r'question:\s*(.+?)(?:\n|answer:|$)', prompt, re.IGNORECASE | re.DOTALL)
        question_text = q_match.group(1).strip() if q_match else "your question"

        titles = re.findall(r'Title:\s*(.+)', prompt)
        methods = re.findall(r'Proposed Method:\s*(.+)', prompt)
        datasets = re.findall(r'Evaluation Dataset:\s*(.+)', prompt)
        limitations = re.findall(r'Limitation:\s*(.+)', prompt)
        key_metrics = re.findall(r'Key Metric:\s*(.+)', prompt)

        answer_parts = []
        answer_parts.append(
            f"Based on the {len(titles)} papers analyzed from the literature review, "
            f"here is what the research indicates regarding your question:\n"
        )

        if titles:
            answer_parts.append("Key findings from the papers:\n")
            for i, title in enumerate(titles[:6]):
                bullet = f"- {title.strip()}"
                details = []
                if i < len(methods) and methods[i].strip() not in ("Not specified", "Not available"):
                    details.append(f"uses {methods[i].strip()}")
                if i < len(datasets) and datasets[i].strip() not in ("Not specified", "Not available", "Task-specific evaluation data (see abstract)"):
                    details.append(f"evaluated on {datasets[i].strip()}")
                if i < len(key_metrics) and key_metrics[i].strip() not in ("Not specified", "Not available"):
                    details.append(f"achieving {key_metrics[i].strip()}")
                if details:
                    bullet += " — " + ", ".join(details)
                answer_parts.append(bullet)

        if limitations:
            valid_lims = [l.strip() for l in limitations if l.strip() not in ("Not specified", "Not available")]
            if valid_lims:
                answer_parts.append(
                    "\nCommon limitations across these papers include: "
                    + "; ".join(valid_lims[:4]) + "."
                )

        answer_parts.append(
            "\nFor more detailed analysis, ensure the Gemini API key is properly configured."
        )
        return "\n".join(answer_parts)
