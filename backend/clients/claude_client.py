import os
import json
import logging

logger = logging.getLogger("researchmind.claude")

class ClaudeClient:
    def __init__(self):
        # Support both Gemini and Anthropic Claude keys
        self.gemini_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        self.anthropic_key = os.environ.get("ANTHROPIC_API_KEY")
        
        # Strip potential quotes/spaces from user-provided key values
        if self.gemini_key:
            self.gemini_key = self.gemini_key.strip("'\" ")
        if self.anthropic_key:
            self.anthropic_key = self.anthropic_key.strip("'\" ")

        if self.gemini_key and self.gemini_key != "your-gemini-api-key-here" and len(self.gemini_key) > 5:
            try:
                import google.generativeai as genai
                genai.configure(api_key=self.gemini_key)
                # Use gemini-1.5-flash as the fast, high-quality, default model
                self.client = genai.GenerativeModel("gemini-1.5-flash")
                self.provider = "gemini"
                logger.info("ClaudeClient: Initialized successfully using Google Gemini API (gemini-1.5-flash).")
            except Exception as e:
                logger.error(f"ClaudeClient: Failed to initialize Google Gemini client: {e}")
                self.client = None
                self.provider = "mock"
                
        elif self.anthropic_key and self.anthropic_key != "your-anthropic-api-key-here" and len(self.anthropic_key) > 5:
            try:
                from anthropic import Anthropic
                self.client = Anthropic(api_key=self.anthropic_key)
                self.provider = "anthropic"
                logger.info("ClaudeClient: Initialized successfully using Anthropic Claude API (claude-3-5-sonnet).")
            except Exception as e:
                logger.error(f"ClaudeClient: Failed to initialize Anthropic client: {e}")
                self.client = None
                self.provider = "mock"
        else:
            logger.warning("ClaudeClient: Neither ANTHROPIC_API_KEY nor GEMINI_API_KEY is configured. Falling back to Mock Mode.")
            self.client = None
            self.provider = "mock"

    def complete(self, prompt: str, system: str = "You are an AI research assistant.", max_tokens: int = 1500, temperature: float = 0.0) -> str:
        """
        Sends prompt to configured LLM (Gemini or Anthropic) and returns the text response. 
        Falls back to mock responses if in mock mode or on request failure.
        """
        if self.provider == "mock" or not self.client:
            logger.info("Mock Mode: Generating simulated response.")
            return self._mock_response(prompt)
            
        if self.provider == "gemini":
            try:
                # Combine system prompt and user prompt
                contents = []
                if system:
                    contents.append(f"System instructions: {system}")
                contents.append(prompt)
                
                generation_config = {
                    "temperature": temperature,
                    "max_output_tokens": max_tokens
                }
                
                response = self.client.generate_content(
                    contents,
                    generation_config=generation_config
                )
                
                res_text = response.text
                if not res_text:
                    raise ValueError("Empty response received from Gemini API.")
                    
                res_text = res_text.strip()
                # Clean response text if it contains markdown code blocks
                if res_text.startswith("```json"):
                    res_text = res_text.split("```json", 1)[1].split("```", 1)[0].strip()
                elif res_text.startswith("```"):
                    res_text = res_text.split("```", 1)[1].split("```", 1)[0].strip()
                return res_text
            except Exception as e:
                logger.error(f"Error calling Gemini API: {e}")
                logger.info("Gemini API error occurred. Falling back to Mock Mode response.")
                return self._mock_response(prompt)
                
        elif self.provider == "anthropic":
            try:
                message = self.client.messages.create(
                    model="claude-3-5-sonnet-20241022",
                    max_tokens=max_tokens,
                    temperature=temperature,
                    system=system,
                    messages=[
                        {"role": "user", "content": prompt}
                    ]
                )
                return message.content[0].text
            except Exception as e:
                logger.error(f"Error calling Claude API: {e}")
                logger.info("Claude API error occurred. Falling back to Mock Mode response.")
                return self._mock_response(prompt)

    def _mock_response(self, prompt: str) -> str:
        prompt_lower = prompt.lower()
        
        # Determine caller from specific instructional prompt prefixes
        if "decompose the following research topic" in prompt_lower:
            # Planner Agent response: return JSON list of sub-queries
            return json.dumps([
                "attention mechanisms in transformer models",
                "efficient transformer architectures for NLP",
                "limitations and computational complexity of transformers"
            ])
            
        elif "analyze the following paper text" in prompt_lower:
            # Extraction Agent response: return JSON dictionary
            return json.dumps({
                "method": "Multi-Head Self-Attention",
                "method_quote": "transformer",
                "dataset": "Wikitext-103",
                "dataset_quote": "Wikitext-103",
                "key_metric": "Perplexity of 18.2",
                "key_metric_quote": "perplexity",
                "limitation": "Quadratic compute scaling with sequence length",
                "limitation_quote": "sequence"
            })
            
        elif "write a concise, factual 3-sentence summary" in prompt_lower:
            # Synthesis Agent response: return source-grounded summaries
            return "This work introduces the self-attention based Transformer model [Source: Method]. The architecture removes recurrent layers entirely to allow massive parallelization [Source: Method]. Evaluation on translation datasets demonstrates superior BLEU scores [Source: Key Metric]."
            
        elif "compile report" in prompt_lower or "literature review report" in prompt_lower:
            # Report Agent response: return markdown document content
            return "# Research Report\n\n## Introduction\nThis report analyzes literature on attention models.\n\n## Gaps\nAn identified gap is efficient attention for long contexts.\n"
            
        return "Simulated Claude response."
