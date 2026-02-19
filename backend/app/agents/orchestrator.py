"""Orchestrator — pure-logic workflow coordinator for Promptr.

No LLM calls. Manages state transitions, routes to specialist agents,
emits WebSocket events, and handles errors/retries.
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Callable

from app.agents.elicitor import ElicitorAgent, ElicitorResult
from app.agents.architect import ArchitectAgent, ArchitectResult
from app.agents.synthesizer import SynthesizerAgent, SynthesizerResult
from app.agents.critic import CriticAgent, CriticResult

logger = logging.getLogger(__name__)

MAX_CRITIC_RETRIES = 1  # Max auto-refinement loops to avoid infinite cycles


class WorkflowStatus(str, Enum):
    ELICITING = "eliciting"
    AWAITING_ANSWERS = "awaiting_answers"
    PLANNING = "planning"
    AWAITING_APPROVAL = "awaiting_approval"
    SYNTHESIZING = "synthesizing"
    CRITIQUING = "critiquing"
    REFINING = "refining"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class WorkflowEvent:
    """A single event emitted during the workflow."""
    event_type: str
    data: dict
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())


@dataclass
class WorkflowState:
    """Full mutable state of a project workflow."""
    status: WorkflowStatus = WorkflowStatus.ELICITING
    idea: str = ""
    project_type: str = "build"
    codebase_context: str = ""
    questions: list[dict] = field(default_factory=list)
    user_answers: str = ""
    spec_md: str = ""
    spec_approved: bool = False
    tech_stack: dict = field(default_factory=dict)
    raw_prompts: str = ""
    parsed_prompts: list[dict] = field(default_factory=list)
    critique_results: dict = field(default_factory=dict)
    refinement_history: list[dict] = field(default_factory=list)
    refinement_count: int = 0
    total_tokens: int = 0
    total_cost: float = 0.0
    error: str = ""


class Orchestrator:
    """Central workflow coordinator — no LLM, pure routing logic.

    Usage:
        orch = Orchestrator(emit_fn=my_websocket_emitter)
        state = orch.start_workflow("I want to build a fitness app")
        # state.status == AWAITING_ANSWERS

        state = orch.submit_answers(state, "Mobile app, casual users, ...")
        # state.status == AWAITING_APPROVAL

        state = orch.approve_spec(state)
        # state.status == COMPLETED (runs synthesizer + critic automatically)
    """

    def __init__(self, emit_fn: Callable[[WorkflowEvent], None] | None = None):
        self.elicitor = ElicitorAgent()
        self.architect = ArchitectAgent()
        self.synthesizer = SynthesizerAgent()
        self.critic = CriticAgent()
        self._emit_fn = emit_fn or self._default_emit

    # ─── Event emission ──────────────────────────────────────────

    def _emit(self, event_type: str, data: dict) -> None:
        event = WorkflowEvent(event_type=event_type, data=data)
        self._emit_fn(event)

    @staticmethod
    def _default_emit(event: WorkflowEvent) -> None:
        logger.info("[WS] %s: %s", event.event_type, event.data.get("message", ""))

    # ─── Token / cost tracking helpers ───────────────────────────

    @staticmethod
    def _accumulate(state: WorkflowState, tokens: int, cost: float) -> None:
        state.total_tokens += tokens
        state.total_cost += cost

    # ─── Workflow steps ──────────────────────────────────────────

    def start_workflow(self, idea: str, project_type: str = "build", codebase_context: str = "") -> WorkflowState:
        """Phase 1: Elicitor generates clarifying questions.

        Returns state with status AWAITING_ANSWERS.
        """
        state = WorkflowState(idea=idea, project_type=project_type, codebase_context=codebase_context, status=WorkflowStatus.ELICITING)
        self._emit("progress_update", {
            "stage": "eliciting",
            "message": "Analyzing your request and preparing questions...",
        })

        try:
            result: ElicitorResult = self.elicitor.execute({
                "idea": idea,
                "project_type": project_type,
                "codebase_context": codebase_context,
            })
        except Exception as e:
            return self._fail(state, f"Elicitor failed: {e}")

        state.questions = [
            {
                "number": q.number,
                "topic": q.topic,
                "text": q.text,
                "options": q.options,
            }
            for q in result.questions
        ]
        self._accumulate(state, result.total_tokens, result.cost_usd)

        state.status = WorkflowStatus.AWAITING_ANSWERS
        self._emit("questions_ready", {
            "questions": state.questions,
            "message": "Questions ready — waiting for your answers.",
        })
        return state

    def submit_answers(self, state: WorkflowState, answers: str) -> WorkflowState:
        """Phase 2: Architect generates spec.md from idea + answers.

        Returns state with status AWAITING_APPROVAL.
        """
        if state.status != WorkflowStatus.AWAITING_ANSWERS:
            return self._fail(state, f"Cannot submit answers in status {state.status}")

        state.user_answers = answers
        state.status = WorkflowStatus.PLANNING
        self._emit("progress_update", {
            "stage": "planning",
            "message": "Planning your app's architecture...",
        })

        try:
            result: ArchitectResult = self.architect.execute({
                "idea": state.idea,
                "questions_and_answers": answers,
                "project_type": state.project_type,
                "codebase_context": state.codebase_context,
            })
        except Exception as e:
            return self._fail(state, f"Architect failed: {e}")

        state.spec_md = result.spec_md
        state.tech_stack = {
            "frontend": result.tech_stack.frontend,
            "backend": result.tech_stack.backend,
            "database": result.tech_stack.database,
            "styling": result.tech_stack.styling,
        }
        self._accumulate(state, result.total_tokens, result.cost_usd)

        if not result.is_complete:
            logger.warning("Spec missing sections: %s (proceeding anyway)", result.missing_sections)

        state.status = WorkflowStatus.AWAITING_APPROVAL
        self._emit("spec_ready", {
            "spec_md": state.spec_md,
            "tech_stack": state.tech_stack,
            "message": "Spec ready — please review and approve.",
        })
        return state

    def approve_spec(self, state: WorkflowState) -> WorkflowState:
        """Phase 3+4: Synthesizer → Critic → auto-refine if needed.

        Runs automatically to completion. Returns state with status COMPLETED or FAILED.
        """
        if state.status != WorkflowStatus.AWAITING_APPROVAL:
            return self._fail(state, f"Cannot approve spec in status {state.status}")

        state.spec_approved = True

        # ── Synthesizer ──
        state = self._run_synthesizer(state)
        if state.status == WorkflowStatus.FAILED:
            return state

        # ── Critic + auto-refine loop ──
        state = self._run_critic_loop(state)
        return state

    def request_refinement(
        self, state: WorkflowState, target_prompt: int, feedback: str
    ) -> WorkflowState:
        """User-requested refinement of a specific prompt section."""
        if state.status != WorkflowStatus.COMPLETED:
            return self._fail(state, f"Cannot refine in status {state.status}")

        state.refinement_count += 1
        state.status = WorkflowStatus.REFINING
        self._emit("progress_update", {
            "stage": "refining",
            "message": f"Refining Prompt {target_prompt}...",
        })

        try:
            result: SynthesizerResult = self.synthesizer.refine_section({
                "spec_md": state.spec_md,
                "current_prompts": state.raw_prompts,
                "target_prompt_number": target_prompt,
                "feedback": feedback,
            })
        except Exception as e:
            state.status = WorkflowStatus.COMPLETED  # Revert — prompts still usable
            return self._fail(state, f"Refinement failed: {e}")

        state.raw_prompts = result.raw_markdown
        state.parsed_prompts = [
            {"number": p.number, "title": p.title, "content": p.content}
            for p in result.prompts
        ]
        state.refinement_history.append({
            "target_prompt": target_prompt,
            "feedback": feedback,
            "tokens": result.total_tokens,
            "cost": result.cost_usd,
        })
        self._accumulate(state, result.total_tokens, result.cost_usd)

        state.status = WorkflowStatus.COMPLETED
        self._emit("refinement_completed", {
            "section": target_prompt,
            "message": f"Prompt {target_prompt} refined successfully.",
        })
        return state

    # ─── Internal helpers ────────────────────────────────────────

    def _run_synthesizer(self, state: WorkflowState) -> WorkflowState:
        state.status = WorkflowStatus.SYNTHESIZING
        self._emit("progress_update", {
            "stage": "synthesizing",
            "message": "Writing optimized prompts...",
        })

        try:
            result: SynthesizerResult = self.synthesizer.execute({
                "spec_md": state.spec_md,
                "project_type": state.project_type,
                "codebase_context": state.codebase_context,
            })
        except Exception as e:
            return self._fail(state, f"Synthesizer failed: {e}")

        state.raw_prompts = result.raw_markdown
        state.parsed_prompts = [
            {"number": p.number, "title": p.title, "content": p.content}
            for p in result.prompts
        ]
        self._accumulate(state, result.total_tokens, result.cost_usd)
        return state

    def _run_critic_loop(self, state: WorkflowState) -> WorkflowState:
        """Run Critic, auto-refine up to MAX_CRITIC_RETRIES if major/critical."""
        for attempt in range(1 + MAX_CRITIC_RETRIES):
            state.status = WorkflowStatus.CRITIQUING
            self._emit("progress_update", {
                "stage": "critiquing",
                "message": "Evaluating prompt quality...",
            })

            try:
                critique: CriticResult = self.critic.execute({
                    "spec_md": state.spec_md,
                    "prompts_markdown": state.raw_prompts,
                })
            except Exception as e:
                return self._fail(state, f"Critic failed: {e}")

            state.critique_results = {
                "issues_found": critique.issues_found,
                "severity": critique.severity,
                "issues": [
                    {
                        "prompt_number": i.prompt_number,
                        "category": i.category,
                        "severity": i.severity,
                        "description": i.description,
                        "suggestion": i.suggestion,
                    }
                    for i in critique.issues
                ],
                "overall_assessment": critique.overall_assessment,
            }
            self._accumulate(state, critique.total_tokens, critique.cost_usd)

            if not critique.needs_refinement:
                break

            # Auto-refine: send critic feedback back to synthesizer
            if attempt < MAX_CRITIC_RETRIES:
                logger.info("Critic found %s issues — auto-refining (attempt %d)", critique.severity, attempt + 1)
                state.status = WorkflowStatus.REFINING
                self._emit("progress_update", {
                    "stage": "refining",
                    "message": "Auto-refining prompts based on quality review...",
                })

                feedback = "\n".join(
                    f"- Prompt {i.prompt_number} ({i.category}): {i.description}. Suggestion: {i.suggestion}"
                    for i in critique.major_issues
                )

                try:
                    refined: SynthesizerResult = self.synthesizer.refine_section({
                        "spec_md": state.spec_md,
                        "current_prompts": state.raw_prompts,
                        "target_prompt_number": 0,  # 0 = refine all flagged
                        "feedback": f"Quality review feedback — please address these issues:\n{feedback}",
                    })
                except Exception as e:
                    logger.warning("Auto-refinement failed: %s (proceeding with current prompts)", e)
                    break

                state.raw_prompts = refined.raw_markdown
                state.parsed_prompts = [
                    {"number": p.number, "title": p.title, "content": p.content}
                    for p in refined.prompts
                ]
                self._accumulate(state, refined.total_tokens, refined.cost_usd)

        # Done — mark completed
        state.status = WorkflowStatus.COMPLETED
        self._emit("prompts_generated", {
            "count": len(state.parsed_prompts),
            "message": f"Generated {len(state.parsed_prompts)} prompts.",
        })
        self._emit("workflow_completed", {
            "status": "completed",
            "total_tokens": state.total_tokens,
            "total_cost": round(state.total_cost, 4),
            "message": "Workflow complete — your prompts are ready!",
        })
        return state

    def _fail(self, state: WorkflowState, error: str) -> WorkflowState:
        logger.error("Workflow failed: %s", error)
        state.status = WorkflowStatus.FAILED
        state.error = error
        self._emit("workflow_failed", {"error": error, "message": f"Error: {error}"})
        return state
