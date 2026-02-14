"""Rate limiting checks for projects and refinements."""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.config import settings
from app.models.project import Project
from app.models.user import User


def check_project_limit(user: User, db: Session) -> None:
    """Raise 429 if user has reached their project limit."""
    active_count = (
        db.query(Project)
        .filter(Project.user_id == user.id)
        .count()
    )
    if active_count >= settings.MAX_PROJECTS_PER_USER:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Project limit reached ({settings.MAX_PROJECTS_PER_USER}). "
                   "Delete an existing project or wait for completion.",
        )


def check_refinement_limit(project: Project) -> None:
    """Raise 429 if project has reached its refinement limit."""
    if project.refinement_count >= project.max_refinements:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Refinement limit reached ({project.max_refinements}).",
        )
