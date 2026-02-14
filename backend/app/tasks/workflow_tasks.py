"""Celery tasks that bridge the Orchestrator with the database.

Each task:
1. Loads the project from the database
2. Reconstructs WorkflowState from project fields
3. Calls the appropriate Orchestrator method
4. Persists the updated state back to the database
"""

import logging
from datetime import datetime

from app.tasks.celery_app import celery_app
from app.database import SessionLocal
from app.models.project import Project
from app.models.conversation_event import ConversationEvent
from app.models.user_session import UserSession
from app.agents.orchestrator import Orchestrator, WorkflowState, WorkflowStatus

logger = logging.getLogger(__name__)


# ─── Helpers ─────────────────────────────────────────────────────

def _load_project(db, project_id: int) -> Project:
    project = db.query(Project).filter(Project.id == project_id).first()
    if project is None:
        raise ValueError(f"Project {project_id} not found")
    return project


def _state_from_project(project: Project) -> WorkflowState:
    """Reconstruct an in-memory WorkflowState from the DB project."""
    wd = project.workflow_data or {}
    return WorkflowState(
        status=WorkflowStatus(project.status),
        idea=project.initial_idea,
        questions=wd.get("questions", []),
        user_answers=wd.get("user_answers", ""),
        spec_md=project.spec_md or "",
        spec_approved=wd.get("spec_approved", False),
        tech_stack=wd.get("tech_stack", {}),
        raw_prompts=wd.get("raw_prompts", ""),
        parsed_prompts=wd.get("parsed_prompts", []),
        critique_results=wd.get("critique_results", {}),
        refinement_history=wd.get("refinement_history", []),
        refinement_count=project.refinement_count,
        total_tokens=wd.get("total_tokens", 0),
        total_cost=wd.get("total_cost", 0.0),
    )


def _save_state(db, project: Project, state: WorkflowState) -> None:
    """Persist WorkflowState back to the DB project."""
    project.status = state.status.value
    project.current_stage = state.status.value
    project.spec_md = state.spec_md or None
    project.refinement_count = state.refinement_count

    if state.parsed_prompts:
        project.final_prompts = state.parsed_prompts

    if state.status == WorkflowStatus.COMPLETED:
        project.completed_at = datetime.utcnow()

    # Store full workflow state in JSONB
    project.workflow_data = {
        "questions": state.questions,
        "user_answers": state.user_answers,
        "spec_approved": state.spec_approved,
        "tech_stack": state.tech_stack,
        "raw_prompts": state.raw_prompts,
        "parsed_prompts": state.parsed_prompts,
        "critique_results": state.critique_results,
        "refinement_history": state.refinement_history,
        "total_tokens": state.total_tokens,
        "total_cost": state.total_cost,
    }

    if state.error:
        wd = project.workflow_data
        wd["error"] = state.error
        project.workflow_data = wd

    project.updated_at = datetime.utcnow()
    db.commit()


def _add_event(db, project_id: int, event_type: str, agent_role: str | None,
               content: str, metadata: dict | None = None) -> None:
    """Append a conversation event to the project history."""
    last = (
        db.query(ConversationEvent)
        .filter(ConversationEvent.project_id == project_id)
        .order_by(ConversationEvent.sequence_number.desc())
        .first()
    )
    seq = (last.sequence_number + 1) if last else 1

    event = ConversationEvent(
        project_id=project_id,
        event_type=event_type,
        agent_role=agent_role,
        content=content,
        metadata_=metadata,
        sequence_number=seq,
    )
    db.add(event)
    db.commit()


def _record_session(db, project: Project, state: WorkflowState) -> None:
    """Create a UserSession row for cost tracking."""
    session = UserSession(
        user_id=project.user_id,
        project_id=project.id,
        session_start=project.created_at,
        session_end=datetime.utcnow(),
        total_tokens_used=state.total_tokens,
        estimated_cost_usd=round(state.total_cost, 6),
    )
    start = session.session_start
    end = session.session_end
    if start and end:
        session.duration_seconds = int((end - start).total_seconds())
    db.add(session)
    db.commit()


# ─── Tasks ───────────────────────────────────────────────────────

@celery_app.task(name="workflow.start_project", bind=True, max_retries=0)
def start_project_workflow(self, project_id: int) -> dict:
    """Phase 1: Run elicitor to generate questions.

    After this task completes the project is in AWAITING_ANSWERS status,
    waiting for the user to submit responses via the API.
    """
    db = SessionLocal()
    try:
        project = _load_project(db, project_id)
        logger.info("Starting workflow for project %d: %s", project_id, project.title)

        orch = Orchestrator()
        state = orch.start_workflow(project.initial_idea)

        _save_state(db, project, state)

        _add_event(db, project_id, "agent_question", "elicitor",
                   state.questions[0]["text"] if state.questions else "No questions generated",
                   {"questions": state.questions})

        return {"status": state.status.value, "questions": len(state.questions)}
    except Exception as e:
        logger.exception("start_project_workflow failed for project %d", project_id)
        try:
            project = _load_project(db, project_id)
            project.status = "failed"
            project.workflow_data = {**(project.workflow_data or {}), "error": str(e)}
            project.updated_at = datetime.utcnow()
            db.commit()
        except Exception:
            logger.exception("Failed to mark project %d as failed", project_id)
        return {"status": "failed", "error": str(e)}
    finally:
        db.close()


@celery_app.task(name="workflow.process_response", bind=True, max_retries=0)
def process_user_response(self, project_id: int, answers: str) -> dict:
    """Phase 2: Architect generates spec.md, then pauses for approval.

    After this task the project is in AWAITING_APPROVAL status.
    """
    db = SessionLocal()
    try:
        project = _load_project(db, project_id)
        logger.info("Processing user response for project %d", project_id)

        state = _state_from_project(project)

        orch = Orchestrator()
        state = orch.submit_answers(state, answers)

        if state.status == WorkflowStatus.FAILED:
            _save_state(db, project, state)
            return {"status": "failed", "error": state.error}

        # User answered → architect ran → now awaiting approval
        # Continue to synthesizer + critic automatically
        state = orch.approve_spec(state)

        _save_state(db, project, state)

        _add_event(db, project_id, "user_input", None, answers)
        _add_event(db, project_id, "agent_response", "architect",
                   f"Spec generated ({len(state.spec_md)} chars)",
                   {"tech_stack": state.tech_stack})

        if state.status == WorkflowStatus.COMPLETED:
            _add_event(db, project_id, "agent_response", "synthesizer",
                       f"Generated {len(state.parsed_prompts)} prompts",
                       {"critique": state.critique_results})
            _record_session(db, project, state)

        return {
            "status": state.status.value,
            "prompts_count": len(state.parsed_prompts),
            "total_tokens": state.total_tokens,
            "total_cost": round(state.total_cost, 4),
        }
    except Exception as e:
        logger.exception("process_user_response failed for project %d", project_id)
        try:
            project = _load_project(db, project_id)
            project.status = "failed"
            project.workflow_data = {**(project.workflow_data or {}), "error": str(e)}
            project.updated_at = datetime.utcnow()
            db.commit()
        except Exception:
            logger.exception("Failed to mark project %d as failed", project_id)
        return {"status": "failed", "error": str(e)}
    finally:
        db.close()


@celery_app.task(name="workflow.refine_prompts", bind=True, max_retries=0)
def refine_prompts_task(self, project_id: int, refinement_request: str,
                        target_section: int) -> dict:
    """Refine a specific prompt section based on user feedback."""
    db = SessionLocal()
    try:
        project = _load_project(db, project_id)
        logger.info("Refining prompt %d for project %d", target_section, project_id)

        if project.refinement_count >= project.max_refinements:
            return {"status": "error", "error": "Maximum refinements reached"}

        state = _state_from_project(project)

        orch = Orchestrator()
        state = orch.request_refinement(state, target_section, refinement_request)

        _save_state(db, project, state)

        _add_event(db, project_id, "user_input", None,
                   f"Refine Prompt {target_section}: {refinement_request}")
        _add_event(db, project_id, "agent_response", "synthesizer",
                   f"Prompt {target_section} refined",
                   {"refinement_count": state.refinement_count})

        return {
            "status": state.status.value,
            "refinement_count": state.refinement_count,
            "total_tokens": state.total_tokens,
        }
    except Exception as e:
        logger.exception("refine_prompts_task failed for project %d", project_id)
        try:
            project = _load_project(db, project_id)
            project.workflow_data = {**(project.workflow_data or {}), "error": str(e)}
            project.updated_at = datetime.utcnow()
            db.commit()
        except Exception:
            logger.exception("Failed to update project %d error", project_id)
        return {"status": "failed", "error": str(e)}
    finally:
        db.close()
