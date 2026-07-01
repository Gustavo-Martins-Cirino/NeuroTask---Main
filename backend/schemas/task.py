from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TaskBase(BaseModel):
    title: str = Field(min_length=1)
    description: str | None = None
    status: str = "pending"
    priority: str = "medium"
    due_date: datetime | None = None


class TaskCreate(TaskBase):
    is_ai_generated: bool = False


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None
    priority: str | None = None
    due_date: datetime | None = None
    is_ai_generated: bool | None = None


class TaskRead(TaskBase):
    id: UUID
    user_id: UUID
    is_ai_generated: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
