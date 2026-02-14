from datetime import datetime
from typing import Any

from pydantic import BaseModel


class ProjectCreate(BaseModel):
    title: str
    initial_idea: str


class ProjectResponse(BaseModel):
    id: int
    user_id: int
    title: str
    initial_idea: str
    status: str
    current_stage: str | None
    spec_md: str | None
    final_prompts: dict | None
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
