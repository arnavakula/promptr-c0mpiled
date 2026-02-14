import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path

from app.utils.cost_calculator import calculate_cost
from app.utils.llm_client import LLMResponse, llm_client

logger = logging.getLogger(__name__)

PROMPTS_DIR = Path(__file__).parent / "prompts"


@dataclass
class AgentResult:
    """Result returned from any agent execution."""
    content: str
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0
    cost_usd: float = 0.0
    model: str = ""
    latency_ms: float = 0


class BaseAgent(ABC):
    """Abstract base class for all Promptr agents.

    Subclasses must implement:
        - model: the LLM model ID to use
        - execute(): the agent's main logic
        - get_system_prompt(): returns the system prompt string
    """

    model: str  # Subclasses set this as a class attribute

    def __init__(self):
        self._total_tokens = 0
        self._total_cost = 0.0

    @abstractmethod
    def execute(self, input_data: dict) -> AgentResult:
        """Run the agent's main task. Subclasses implement this."""
        ...

    @abstractmethod
    def get_system_prompt(self) -> str:
        """Return the system prompt for this agent."""
        ...

    def _load_prompt_file(self, filename: str) -> str:
        """Load a system prompt from the prompts/ directory."""
        path = PROMPTS_DIR / filename
        return path.read_text()

    def _call_llm(
        self,
        user_message: str,
        max_tokens: int = 4096,
        temperature: float = 0.7,
    ) -> AgentResult:
        """Call the LLM using this agent's model and system prompt.

        Wraps LLMClient.call() and tracks cumulative cost.
        """
        system_prompt = self.get_system_prompt()
        logger.info(f"[{self.__class__.__name__}] Calling {self.model}")

        response: LLMResponse = llm_client.call(
            model=self.model,
            system_prompt=system_prompt,
            user_message=user_message,
            max_tokens=max_tokens,
            temperature=temperature,
        )

        cost = calculate_cost(response.model, response.input_tokens, response.output_tokens)
        self._total_tokens += response.total_tokens
        self._total_cost += cost

        logger.info(
            f"[{self.__class__.__name__}] Done — "
            f"{response.total_tokens} tokens, ${cost:.4f}, {response.latency_ms:.0f}ms"
        )

        return AgentResult(
            content=response.content,
            input_tokens=response.input_tokens,
            output_tokens=response.output_tokens,
            total_tokens=response.total_tokens,
            cost_usd=cost,
            model=response.model,
            latency_ms=response.latency_ms,
        )

    @property
    def cumulative_tokens(self) -> int:
        return self._total_tokens

    @property
    def cumulative_cost(self) -> float:
        return self._total_cost
