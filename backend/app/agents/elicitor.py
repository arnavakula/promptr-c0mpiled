import logging
import re
from dataclasses import dataclass, field

from app.agents.base_agent import AgentResult, BaseAgent
from app.utils.llm_client import CLAUDE_HAIKU

logger = logging.getLogger(__name__)


@dataclass
class ParsedQuestion:
    """A single parsed question from the Elicitor's output."""
    number: int
    topic: str
    text: str
    options: list[str]  # Empty list if open-ended


@dataclass
class ElicitorResult:
    """Structured result from the Elicitor agent."""
    questions: list[ParsedQuestion]
    raw_markdown: str
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0
    cost_usd: float = 0.0
    model: str = ""
    latency_ms: float = 0


def parse_questions(markdown: str) -> list[ParsedQuestion]:
    """Parse the Elicitor's Markdown response into structured questions.

    Expected format:
        ## Question 1: Topic
        Question text
        - Option A
        - Option B
    """
    questions: list[ParsedQuestion] = []

    # Split on question headers: ## Question N: Topic
    pattern = r"##\s*Question\s+(\d+)\s*:\s*(.+)"
    headers = list(re.finditer(pattern, markdown))

    for i, match in enumerate(headers):
        number = int(match.group(1))
        topic = match.group(2).strip()

        # Get the block of text between this header and the next (or end)
        start = match.end()
        end = headers[i + 1].start() if i + 1 < len(headers) else len(markdown)
        block = markdown[start:end].strip()

        # Split into question text and options
        lines = [line for line in block.split("\n") if line.strip()]

        text_lines: list[str] = []
        options: list[str] = []
        for line in lines:
            stripped = line.strip()
            # Lines starting with "- " are options
            if stripped.startswith("- "):
                options.append(stripped[2:].strip())
            else:
                # Only add to text if we haven't started seeing options yet
                if not options:
                    text_lines.append(stripped)

        question_text = " ".join(text_lines)

        questions.append(ParsedQuestion(
            number=number,
            topic=topic,
            text=question_text,
            options=options,
        ))

    return questions


class ElicitorAgent(BaseAgent):
    """Requirements Elicitor agent — asks 1-3 clarifying questions.

    Uses Claude 3.5 Haiku for fast, cheap question generation.
    """

    model = CLAUDE_HAIKU

    def get_system_prompt(self) -> str:
        return self._load_prompt_file("elicitor_prompt.md")

    def execute(self, input_data: dict) -> ElicitorResult:
        """Generate clarifying questions for a user's app idea.

        Args:
            input_data: {"idea": "user's app idea text"}

        Returns:
            ElicitorResult with parsed questions and token usage.
        """
        idea = input_data["idea"]
        project_type = input_data.get("project_type", "build")
        codebase_context = input_data.get("codebase_context", "")

        user_message = f"[Project Type: {project_type}]\n\n"
        if codebase_context:
            user_message += f"[Codebase Context: {codebase_context}]\n\n"
        user_message += f"User's idea: {idea}"

        result: AgentResult = self._call_llm(
            user_message=user_message,
            max_tokens=1024,
            temperature=0.7,
        )

        questions = parse_questions(result.content)

        if not questions:
            logger.warning("Elicitor returned no parseable questions. Raw output:\n%s", result.content)

        # Enforce the 3-question cap
        questions = questions[:3]

        return ElicitorResult(
            questions=questions,
            raw_markdown=result.content,
            input_tokens=result.input_tokens,
            output_tokens=result.output_tokens,
            total_tokens=result.total_tokens,
            cost_usd=result.cost_usd,
            model=result.model,
            latency_ms=result.latency_ms,
        )
