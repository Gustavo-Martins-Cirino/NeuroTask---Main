from typing import Sequence
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.task import Task
from schemas.task import TaskCreate, TaskUpdate


async def create_task(db: AsyncSession, task_in: TaskCreate, user_id: UUID) -> Task:
    task = Task(**task_in.model_dump(), user_id=user_id)
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task


async def get_tasks(db: AsyncSession, user_id: UUID) -> Sequence[Task]:
    stmt = select(Task).where(Task.user_id == user_id).order_by(Task.created_at.desc())
    result = await db.scalars(stmt)
    return result.all()


async def get_task_by_id(db: AsyncSession, task_id: UUID, user_id: UUID) -> Task | None:
    stmt = select(Task).where(Task.id == task_id, Task.user_id == user_id)
    return await db.scalar(stmt)


async def update_task(db: AsyncSession, db_task: Task, task_in: TaskUpdate) -> Task:
    updates = task_in.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(db_task, field, value)

    await db.commit()
    await db.refresh(db_task)
    return db_task


async def delete_task(db: AsyncSession, db_task: Task) -> None:
    await db.delete(db_task)
    await db.commit()
