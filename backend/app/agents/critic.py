import json
import logging
import re
from dataclasses import dataclass, field

from app.agents.base_agent import AgentResult, BaseAgent
from app.utils.llm_client import GPT_4O_MINI

logger = logging.getLogger(__name__)


@dataclass
class CriticIssue:
    """A single issue found by the Critic."""
    prompt_number: int
    category: str
    severity: str  # "critical", "major", "minor"
    description: str
    suggestion: str


@dataclass
class CriticResult:
    """Structured result from the Critic agent."""
    issues_found: bool
    severity: str  # Overall severity: "critical", "major", "minor", or "none"
    issues: list[CriticIssue]
    overall_assessment: str
    raw_response: str
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0
    cost_usd: float = 0.0
    model: str = ""
    latency_ms: float = 0

    @property
    def needs_refinement(self) -> bool:
        """True if issues are severe enough to warrant auto-refinement."""
        return self.issues_found and self.severity in ("critical", "major")

    @property
    def major_issues(self) -> list[CriticIssue]:
        return [i for i in self.issues if i.severity in ("critical", "major")]


def parse_critic_response(raw: str) -> dict:
    """Extract JSON from the Critic's response, handling markdown fences."""
    text = raw.strip()

    # Strip ```json ... ``` wrappers
    json_match = re.search(r"```(?:json)?\s*\n(.*?)\n\s*```", text, re.DOTALL)
    if json_match:
        text = json_match.group(1).strip()

    # Try parsing the whole thing if no fences found
    return json.loads(text)


class CriticAgent(BaseAgent):
    """Quality Assurance Critic — audits generated prompts for issues.

    Uses GPT-4o-mini (different model to prevent bias).
    """

    model = GPT_4O_MINI

    def get_system_prompt(self) -> str:
        return self._load_prompt_file("critic_prompt.md")

    def execute(self, input_data: dict) -> CriticResult:
        """Audit a set of prompts against the original spec.md.

        Args:
            input_data: {
                "spec_md": "the approved spec.md",
                "prompts_markdown": "full raw markdown of generated prompts"
            }

        Returns:
            CriticResult with structured issues and severity.
        """
        spec_md = input_data["spec_md"]
        prompts_md = input_data["prompts_markdown"]

        user_message = (
            f"## Original spec.md\n\n{spec_md}\n\n"
            f"---\n\n"
            f"## Generated Prompts to Audit\n\n{prompts_md}"
        )

        result: AgentResult = self._call_llm(
            user_message=user_message,
            max_tokens=2048,
            temperature=0.3,  # Lower temperature for analytical task
        )

        try:
            data = parse_critic_response(result.content)
        except (json.JSONDecodeError, ValueError) as e:
            logger.error("Failed to parse Critic JSON: %s\nRaw: %s", e, result.content[:500])
            # Return a fallback indicating parse failure
            return CriticResult(
                issues_found=True,
                severity="major",
                issues=[CriticIssue(
                    prompt_number=0,
                    category="parse_error",
                    severity="major",
                    description=f"Critic response was not valid JSON: {e}",
                    suggestion="Re-run the critic audit.",
                )],
                overall_assessment="Critic output could not be parsed.",
                raw_response=result.content,
                input_tokens=result.input_tokens,
                output_tokens=result.output_tokens,
                total_tokens=result.total_tokens,
                cost_usd=result.cost_usd,
                model=result.model,
                latency_ms=result.latency_ms,
            )

        issues = [
            CriticIssue(
                prompt_number=i.get("prompt_number", 0),
                category=i.get("category", "unknown"),
                severity=i.get("severity", "minor"),
                description=i.get("description", ""),
                suggestion=i.get("suggestion", ""),
            )
            for i in data.get("issues", [])
        ]

        return CriticResult(
            issues_found=data.get("issues_found", False),
            severity=data.get("severity", "none"),
            issues=issues,
            overall_assessment=data.get("overall_assessment", ""),
            raw_response=result.content,
            input_tokens=result.input_tokens,
            output_tokens=result.output_tokens,
            total_tokens=result.total_tokens,
            cost_usd=result.cost_usd,
            model=result.model,
            latency_ms=result.latency_ms,
        )
