import logging
import re
from dataclasses import dataclass, field

from app.agents.base_agent import AgentResult, BaseAgent
from app.utils.llm_client import CLAUDE_SONNET

logger = logging.getLogger(__name__)


@dataclass
class ParsedPrompt:
    """A single prompt from the generated prompt package."""
    number: int
    title: str
    content: str  # Full markdown content of this prompt section


@dataclass
class SynthesizerResult:
    """Structured result from the Synthesizer agent."""
    prompts: list[ParsedPrompt]
    raw_markdown: str
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0
    cost_usd: float = 0.0
    model: str = ""
    latency_ms: float = 0


def parse_prompts(markdown: str) -> list[ParsedPrompt]:
    """Parse the Synthesizer's output into individual prompts.

    Looks for ## Prompt N: Title headers and splits content between them.
    """
    prompts: list[ParsedPrompt] = []

    pattern = r"##\s*Prompt\s+(\d+)\s*:\s*(.+)"
    headers = list(re.finditer(pattern, markdown))

    for i, match in enumerate(headers):
        number = int(match.group(1))
        title = match.group(2).strip()

        start = match.end()
        end = headers[i + 1].start() if i + 1 < len(headers) else len(markdown)

        # Stop at "## Final Notes" or "## Instructions" if they come before the next prompt
        block = markdown[start:end]
        for sentinel in ["## Final Notes", "## Instructions for Use"]:
            idx = block.find(sentinel)
            if idx != -1:
                block = block[:idx]

        content = block.strip()

        prompts.append(ParsedPrompt(
            number=number,
            title=title,
            content=content,
        ))

    return prompts


MAX_TOKENS_BY_TYPE = {
    "build": 8192,
    "enhance": 4096,
    "refactor": 3072,
    "debug": 2048,
}


class SynthesizerAgent(BaseAgent):
    """Prompt Synthesizer agent — transforms spec.md into sequential prompts.

    Uses Claude Sonnet 4 for high-quality prompt generation.
    """

    model = CLAUDE_SONNET

    def get_system_prompt(self) -> str:
        return self._load_prompt_file("synthesizer_prompt.md")

    def execute(self, input_data: dict) -> SynthesizerResult:
        """Generate a prompt package from an approved spec.md.

        Args:
            input_data: {"spec_md": "the full spec.md content"}

        Returns:
            SynthesizerResult with parsed prompts and token usage.
        """
        spec_md = input_data["spec_md"]
        project_type = input_data.get("project_type", "build")
        codebase_context = input_data.get("codebase_context", "")

        user_message = f"[Project Type: {project_type}]\n\n"
        if codebase_context:
            user_message += f"[Codebase Context: {codebase_context}]\n\n"
        user_message += f"## Approved spec.md\n\n{spec_md}"

        max_tokens = MAX_TOKENS_BY_TYPE.get(project_type, 8192)

        result: AgentResult = self._call_llm(
            user_message=user_message,
            max_tokens=max_tokens,
            temperature=0.7,
        )

        raw = result.content.strip()

        # Strip wrapping ```markdown fences if present
        if raw.startswith("```"):
            first_newline = raw.index("\n")
            raw = raw[first_newline + 1:]
        if raw.endswith("```"):
            raw = raw[:-3].rstrip()

        prompts = parse_prompts(raw)

        if not prompts:
            logger.warning("Synthesizer returned no parseable prompts. Raw output:\n%s", raw[:500])

        return SynthesizerResult(
            prompts=prompts,
            raw_markdown=raw,
            input_tokens=result.input_tokens,
            output_tokens=result.output_tokens,
            total_tokens=result.total_tokens,
            cost_usd=result.cost_usd,
            model=result.model,
            latency_ms=result.latency_ms,
        )

    def refine_section(self, input_data: dict) -> SynthesizerResult:
        """Refine a specific prompt section based on feedback.

        Args:
            input_data: {
                "spec_md": "the full spec.md",
                "current_prompts": "full raw markdown of current prompts",
                "target_prompt_number": int,
                "feedback": "user's refinement request"
            }

        Returns:
            SynthesizerResult with the complete updated prompt package.
        """
        spec_md = input_data["spec_md"]
        current_prompts = input_data["current_prompts"]
        target = input_data["target_prompt_number"]
        feedback = input_data["feedback"]

        user_message = (
            f"## Original spec.md\n\n{spec_md}\n\n"
            f"## Current Prompt Package\n\n{current_prompts}\n\n"
            f"## Refinement Request\n\n"
            f"Please update **Prompt {target}** based on this feedback:\n\n"
            f"{feedback}\n\n"
            f"Return the COMPLETE updated prompt package with all prompts. "
            f"Only modify Prompt {target} — keep all other prompts unchanged."
        )

        result: AgentResult = self._call_llm(
            user_message=user_message,
            max_tokens=8192,
            temperature=0.7,
        )

        raw = result.content.strip()
        if raw.startswith("```"):
            first_newline = raw.index("\n")
            raw = raw[first_newline + 1:]
        if raw.endswith("```"):
            raw = raw[:-3].rstrip()

        prompts = parse_prompts(raw)

        return SynthesizerResult(
            prompts=prompts,
            raw_markdown=raw,
            input_tokens=result.input_tokens,
            output_tokens=result.output_tokens,
            total_tokens=result.total_tokens,
            cost_usd=result.cost_usd,
            model=result.model,
            latency_ms=result.latency_ms,
        )
