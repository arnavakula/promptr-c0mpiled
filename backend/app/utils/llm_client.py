import logging
import time
from dataclasses import dataclass, field

import anthropic
import openai

from app.config import settings

logger = logging.getLogger(__name__)

# Model ID constants
CLAUDE_HAIKU = "claude-haiku-4-5-20251001"
CLAUDE_SONNET = "claude-sonnet-4-20250514"
GPT_4O_MINI = "gpt-4o-mini"

# Provider detection
ANTHROPIC_MODELS = {CLAUDE_HAIKU, CLAUDE_SONNET}
OPENAI_MODELS = {GPT_4O_MINI}


@dataclass
class LLMResponse:
    content: str
    model: str
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0
    latency_ms: float = 0


class LLMClient:
    """Unified client for Anthropic and OpenAI APIs with retry logic."""

    def __init__(self):
        self._anthropic: anthropic.Anthropic | None = None
        self._openai: openai.OpenAI | None = None

    @property
    def anthropic_client(self) -> anthropic.Anthropic:
        if self._anthropic is None:
            self._anthropic = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        return self._anthropic

    @property
    def openai_client(self) -> openai.OpenAI:
        if self._openai is None:
            self._openai = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
        return self._openai

    def call(
        self,
        model: str,
        system_prompt: str,
        user_message: str,
        max_tokens: int = 4096,
        temperature: float = 0.7,
        max_retries: int = 3,
    ) -> LLMResponse:
        """Call an LLM with automatic provider routing and retry logic."""
        if model in ANTHROPIC_MODELS:
            return self._call_anthropic(
                model, system_prompt, user_message, max_tokens, temperature, max_retries
            )
        elif model in OPENAI_MODELS:
            return self._call_openai(
                model, system_prompt, user_message, max_tokens, temperature, max_retries
            )
        else:
            raise ValueError(f"Unknown model: {model}")

    def _call_anthropic(
        self,
        model: str,
        system_prompt: str,
        user_message: str,
        max_tokens: int,
        temperature: float,
        max_retries: int,
    ) -> LLMResponse:
        last_error = None
        for attempt in range(max_retries):
            try:
                start = time.monotonic()
                response = self.anthropic_client.messages.create(
                    model=model,
                    max_tokens=max_tokens,
                    temperature=temperature,
                    system=system_prompt,
                    messages=[{"role": "user", "content": user_message}],
                )
                latency = (time.monotonic() - start) * 1000

                return LLMResponse(
                    content=response.content[0].text,
                    model=model,
                    input_tokens=response.usage.input_tokens,
                    output_tokens=response.usage.output_tokens,
                    total_tokens=response.usage.input_tokens + response.usage.output_tokens,
                    latency_ms=latency,
                )
            except (anthropic.APITimeoutError, anthropic.APIConnectionError, anthropic.RateLimitError) as e:
                last_error = e
                wait = 2 ** attempt
                logger.warning(f"Anthropic API error (attempt {attempt + 1}/{max_retries}): {e}. Retrying in {wait}s")
                time.sleep(wait)
            except anthropic.APIError as e:
                logger.error(f"Anthropic API error (non-retryable): {e}")
                raise

        raise RuntimeError(f"Anthropic API failed after {max_retries} retries: {last_error}")

    def _call_openai(
        self,
        model: str,
        system_prompt: str,
        user_message: str,
        max_tokens: int,
        temperature: float,
        max_retries: int,
    ) -> LLMResponse:
        last_error = None
        for attempt in range(max_retries):
            try:
                start = time.monotonic()
                response = self.openai_client.chat.completions.create(
                    model=model,
                    max_tokens=max_tokens,
                    temperature=temperature,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_message},
                    ],
                )
                latency = (time.monotonic() - start) * 1000

                usage = response.usage
                return LLMResponse(
                    content=response.choices[0].message.content,
                    model=model,
                    input_tokens=usage.prompt_tokens,
                    output_tokens=usage.completion_tokens,
                    total_tokens=usage.total_tokens,
                    latency_ms=latency,
                )
            except (openai.APITimeoutError, openai.APIConnectionError, openai.RateLimitError) as e:
                last_error = e
                wait = 2 ** attempt
                logger.warning(f"OpenAI API error (attempt {attempt + 1}/{max_retries}): {e}. Retrying in {wait}s")
                time.sleep(wait)
            except openai.APIError as e:
                logger.error(f"OpenAI API error (non-retryable): {e}")
                raise

        raise RuntimeError(f"OpenAI API failed after {max_retries} retries: {last_error}")


# Singleton instance
llm_client = LLMClient()
