from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    initial_idea: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        String(50), default="eliciting", nullable=False
    )  # eliciting, planning, synthesizing, critiquing, completed, failed
    current_stage: Mapped[str | None] = mapped_column(String(50), nullable=True)
    workflow_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    spec_md: Mapped[str | None] = mapped_column(Text, nullable=True)
    final_prompts: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    refinement_count: Mapped[int] = mapped_column(Integer, default=0)
    max_refinements: Mapped[int] = mapped_column(Integer, default=3)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    user = relationship("User", back_populates="projects")
    conversation_events = relationship(
        "ConversationEvent", back_populates="project", cascade="all, delete-orphan"
    )
    prompts = relationship("Prompt", back_populates="project", cascade="all, delete-orphan")
    sessions = relationship("UserSession", back_populates="project", cascade="all, delete-orphan")
