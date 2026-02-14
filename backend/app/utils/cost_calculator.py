from app.utils.llm_client import CLAUDE_HAIKU, CLAUDE_SONNET, GPT_4O_MINI

# Pricing per 1M tokens (USD)
MODEL_PRICING: dict[str, dict[str, float]] = {
    CLAUDE_HAIKU: {
        "input": 0.80,
        "output": 4.00,
    },
    CLAUDE_SONNET: {
        "input": 3.00,
        "output": 15.00,
    },
    GPT_4O_MINI: {
        "input": 0.15,
        "output": 0.60,
    },
}


def calculate_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    """Calculate USD cost for a single LLM call."""
    pricing = MODEL_PRICING.get(model)
    if pricing is None:
        return 0.0
    input_cost = (input_tokens / 1_000_000) * pricing["input"]
    output_cost = (output_tokens / 1_000_000) * pricing["output"]
    return round(input_cost + output_cost, 6)


def estimate_project_cost() -> dict:
    """Return estimated cost breakdown for one full project workflow."""
    return {
        "elicitor": "~$0.02 (Haiku)",
        "architect": "~$0.15 (Sonnet)",
        "synthesizer": "~$0.15 (Sonnet)",
        "critic": "~$0.03 (GPT-4o-mini)",
        "total_estimate": "$0.35-$0.50",
    }
