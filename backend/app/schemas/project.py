from datetime import datetime
from typing import Any

from pydantic import BaseModel, field_validator

VALID_PROJECT_TYPES = {"build", "enhance", "refactor", "debug"}


class ProjectCreate(BaseModel):
    title: str
    initial_idea: str
    project_type: str = "build"
    codebase_context: str | None = None

    @field_validator("project_type")
    @classmethod
    def validate_project_type(cls, v: str) -> str:
        if v not in VALID_PROJECT_TYPES:
            raise ValueError(f"project_type must be one of {VALID_PROJECT_TYPES}")
        return v


class ProjectResponse(BaseModel):
    id: int
    user_id: int
    title: str
    initial_idea: str
    project_type: str
    codebase_context: str | None = None
    status: str
    current_stage: str | None
    workflow_data: dict[str, Any] | None = None
    spec_md: str | None
    final_prompts: list[dict[str, Any]] | None
    refinement_count: int
    max_refinements: int
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None

    model_config = {"from_attributes": True}


class ProjectUpdate(BaseModel):
    title: str | None = None
    status: str | None = None
    current_stage: str | None = None
