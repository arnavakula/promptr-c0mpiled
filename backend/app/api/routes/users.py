"""User stats endpoint."""

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.project import Project
from app.models.user import User
from app.models.user_session import UserSession
from app.api.dependencies import get_current_user

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me/stats")
def get_my_stats(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get current user's usage statistics."""
    # Project counts by status
    project_counts = (
        db.query(Project.status, func.count(Project.id))
        .filter(Project.user_id == user.id)
        .group_by(Project.status)
        .all()
    )
    status_map = {status: count for status, count in project_counts}
    total_projects = sum(status_map.values())

    # Aggregate session stats (tokens + cost)
    session_stats = (
        db.query(
            func.coalesce(func.sum(UserSession.total_tokens_used), 0),
            func.coalesce(func.sum(UserSession.estimated_cost_usd), 0.0),
        )
        .filter(UserSession.user_id == user.id)
        .first()
    )

    total_tokens = int(session_stats[0])
    total_cost = float(session_stats[1])

    return {
        "user_id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "projects": {
            "total": total_projects,
            "max_allowed": user.max_projects,
            "by_status": status_map,
        },
        "usage": {
            "total_tokens": total_tokens,
            "estimated_cost_usd": round(total_cost, 4),
        },
    }
