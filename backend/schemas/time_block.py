from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TimeBlockBase(BaseModel):
    title: str = Field(min_length=1)
    start_time: datetime
    end_time: datetime
    task_id: UUID | None = None


class TimeBlockCreate(TimeBlockBase):
    pass


class TimeBlockUpdate(BaseModel):
    title: str | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    task_id: UUID | None = None


class TimeBlockRead(TimeBlockBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
