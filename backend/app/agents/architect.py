import logging
import re
from dataclasses import dataclass, field

from app.agents.base_agent import AgentResult, BaseAgent
from app.utils.llm_client import CLAUDE_SONNET

logger = logging.getLogger(__name__)

# Required sections in spec.md (## header text, case-insensitive substring match)
REQUIRED_SECTIONS_BUILD = [
    "What You're Building",
    "Who It's For",
    "Core Features",
    "How It Will Look & Feel",
    "Recommended Tech Stack",
    "How Your Data Works",
    "Build Stages",
]

REQUIRED_SECTIONS_OTHER = [
    "Current State & Goal",
    "Core Features",
    "Implementation Stages",
    "Affected Areas",
]


def get_required_sections(project_type: str) -> list[str]:
    if project_type == "build":
        return REQUIRED_SECTIONS_BUILD
    return REQUIRED_SECTIONS_OTHER


@dataclass
class TechStack:
    """Parsed tech stack recommendation from spec.md."""
    frontend: str = ""
    backend: str = ""
    database: str = ""
    styling: str = ""


@dataclass
class ArchitectResult:
    """Structured result from the Architect agent."""
    spec_md: str
    tech_stack: TechStack
    missing_sections: list[str]
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0
    cost_usd: float = 0.0
    model: str = ""
    latency_ms: float = 0

    @property
    def is_complete(self) -> bool:
        return len(self.missing_sections) == 0


def parse_tech_stack(spec_md: str) -> TechStack:
    """Extract tech stack choices from the spec.md markdown.

    Looks for ### Frontend / ### Backend / ### Database / ### Styling
    subsections under ## Recommended Tech Stack, then grabs the **bold**
    technology name on the line immediately after the header.
    """
    stack = TechStack()

    mapping = {
        "frontend": "frontend",
        "backend": "backend",
        "database": "database",
        "styling": "styling",
        "styling/ui": "styling",
    }

    for match in re.finditer(r"###\s+(.+)", spec_md):
        header = match.group(1).strip().lower().rstrip(":")
        attr = mapping.get(header)
        if attr is None:
            continue

        # Grab the text between this ### and the next ### or ## (or EOF)
        start = match.end()
        next_header = re.search(r"\n##", spec_md[start:])
        end = start + next_header.start() if next_header else len(spec_md)
        block = spec_md[start:end].strip()

        # Try to extract **Bold Choice** from the first non-empty line
        bold = re.search(r"\*\*(.+?)\*\*", block)
        if bold:
            setattr(stack, attr, bold.group(1).strip())
        elif block:
            # Fallback: use the first non-empty line
            first_line = block.split("\n")[0].strip().strip("*").strip()
            setattr(stack, attr, first_line)

    return stack


def validate_sections(spec_md: str, project_type: str = "build") -> list[str]:
    """Return list of required section names missing from the spec."""
    required = get_required_sections(project_type)
    lower = spec_md.lower()
    missing = []
    for section in required:
        # Look for "## <section>" allowing flexible whitespace
        if re.search(rf"##\s+{re.escape(section.lower())}", lower) is None:
            # Also try without apostrophe variants
            alt = section.replace("\u2019", "'").replace("'", "'")
            if re.search(rf"##\s+{re.escape(alt.lower())}", lower) is None:
                missing.append(section)
    return missing


class ArchitectAgent(BaseAgent):
    """Technical Architect agent — generates spec.md from user idea + answers.

    Uses Claude Sonnet 4 for high-quality reasoning.
    """

    model = CLAUDE_SONNET

    def get_system_prompt(self) -> str:
        return self._load_prompt_file("architect_prompt.md")

    def execute(self, input_data: dict) -> ArchitectResult:
        """Generate a spec.md from the user's idea and their answers.

        Args:
            input_data: {
                "idea": "the original app idea",
                "questions_and_answers": "formatted Q&A string"
            }

        Returns:
            ArchitectResult with spec_md, parsed tech_stack, and validation.
        """
        idea = input_data["idea"]
        qa = input_data.get("questions_and_answers", "")
        project_type = input_data.get("project_type", "build")
        codebase_context = input_data.get("codebase_context", "")

        user_message = f"[Project Type: {project_type}]\n\n"
        if codebase_context:
            user_message += f"[Codebase Context: {codebase_context}]\n\n"
        user_message += f"## Original Idea\n{idea}\n\n## User's Answers to Clarifying Questions\n{qa}"

        result: AgentResult = self._call_llm(
            user_message=user_message,
            max_tokens=4096,
            temperature=0.7,
        )

        spec_md = result.content.strip()

        # Strip wrapping ```markdown fences if present
        if spec_md.startswith("```"):
            first_newline = spec_md.index("\n")
            spec_md = spec_md[first_newline + 1:]
        if spec_md.endswith("```"):
            spec_md = spec_md[:-3].rstrip()

        tech_stack = parse_tech_stack(spec_md)
        missing = validate_sections(spec_md, project_type)

        if missing:
            logger.warning("Architect spec is missing sections: %s", missing)

        return ArchitectResult(
            spec_md=spec_md,
            tech_stack=tech_stack,
            missing_sections=missing,
            input_tokens=result.input_tokens,
            output_tokens=result.output_tokens,
            total_tokens=result.total_tokens,
            cost_usd=result.cost_usd,
            model=result.model,
            latency_ms=result.latency_ms,
        )
