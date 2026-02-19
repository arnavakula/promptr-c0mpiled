"""Project CRUD and workflow endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.project import Project
from app.models.prompt import Prompt
from app.models.user import User
from app.api.dependencies import get_current_user
from app.schemas.project import ProjectCreate, ProjectResponse
from app.services.rate_limit_service import check_project_limit, check_refinement_limit
from app.tasks.workflow_tasks import (
    start_project_workflow,
    process_user_response,
    refine_prompts_task,
)

router = APIRouter(prefix="/api/projects", tags=["projects"])


# ─── Helpers ──────────────────────────────────────────────────────

def _get_user_project(project_id: int, user: User, db: Session) -> Project:
    """Fetch a project owned by the current user or raise 404."""
    project = (
        db.query(Project)
        .filter(Project.id == project_id, Project.user_id == user.id)
        .first()
    )
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


# ─── CRUD ─────────────────────────────────────────────────────────

@router.get("", response_model=list[ProjectResponse])
def list_projects(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all projects for the current user."""
    return (
        db.query(Project)
        .filter(Project.user_id == user.id)
        .order_by(Project.created_at.desc())
        .all()
    )


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    body: ProjectCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new project and kick off the elicitor workflow."""
    check_project_limit(user, db)

    project = Project(
        user_id=user.id,
        title=body.title,
        initial_idea=body.initial_idea,
        project_type=body.project_type,
        codebase_context=body.codebase_context,
        status="eliciting",
    )
    db.add(project)

    user.projects_created += 1
    db.commit()
    db.refresh(project)

    # Kick off async workflow (elicitor generates questions)
    start_project_workflow.delay(project.id)

    return project


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a single project by ID."""
    return _get_user_project(project_id, user, db)


# ─── Workflow actions ─────────────────────────────────────────────

@router.patch("/{project_id}/respond")
def respond_to_questions(
    project_id: int,
    body: dict,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Submit user answers to elicitor questions. Triggers architect + synthesizer."""
    project = _get_user_project(project_id, user, db)

    if project.status != "awaiting_answers":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Project is in '{project.status}' state, expected 'awaiting_answers'.",
        )

    answers = body.get("answers", "")
    if not answers or not answers.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="answers field is required and must not be empty.",
        )

    # Mark as processing so UI knows
    project.status = "planning"
    db.commit()

    process_user_response.delay(project.id, answers)

    return {"message": "Processing answers", "project_id": project.id}


@router.post("/{project_id}/refine")
def refine_prompts(
    project_id: int,
    body: dict,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Request refinement of a specific prompt section."""
    project = _get_user_project(project_id, user, db)

    if project.status != "completed":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Project must be 'completed' to refine, currently '{project.status}'.",
        )

    check_refinement_limit(project)

    feedback = body.get("feedback", "")
    target_section = body.get("target_section")

    if not feedback or not feedback.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="feedback field is required.",
        )
    if target_section is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="target_section (prompt number) is required.",
        )

    refine_prompts_task.delay(project.id, feedback, int(target_section))

    return {
        "message": "Refinement started",
        "project_id": project.id,
        "target_section": target_section,
    }


# ─── Prompts ──────────────────────────────────────────────────────

@router.get("/{project_id}/prompts")
def get_prompts(
    project_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get generated prompts for a project (from workflow_data)."""
    project = _get_user_project(project_id, user, db)

    # Return from final_prompts JSONB (set by workflow tasks)
    prompts = project.final_prompts or []
    return {
        "project_id": project.id,
        "status": project.status,
        "prompts": prompts,
        "count": len(prompts),
    }


# ─── Export ───────────────────────────────────────────────────────

@router.post("/{project_id}/export")
def export_prompts(
    project_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Export project prompts as a Markdown file."""
    project = _get_user_project(project_id, user, db)

    if not project.final_prompts:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No prompts generated yet.",
        )

    lines = [f"# {project.title}\n"]

    if project.spec_md:
        lines.append("## Specification\n")
        lines.append(project.spec_md)
        lines.append("\n---\n")

    lines.append("## Generated Prompts\n")

    for i, prompt in enumerate(project.final_prompts, 1):
        title = prompt.get("title", f"Prompt {i}")
        content = prompt.get("content", "")
        lines.append(f"### Prompt {i}: {title}\n")
        lines.append(content)
        lines.append("\n")

    markdown = "\n".join(lines)

    return PlainTextResponse(
        content=markdown,
        media_type="text/markdown",
        headers={
            "Content-Disposition": f'attachment; filename="{project.title.replace(" ", "_")}_prompts.md"'
        },
    )
