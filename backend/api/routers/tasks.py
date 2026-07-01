from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_current_user
from db.database import get_db
from models.user import User
from schemas.task import TaskCreate, TaskRead, TaskUpdate
from services.task import (
    create_task,
    delete_task,
    get_task_by_id,
    get_tasks,
    update_task,
)


router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.post("/", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
async def create_task_endpoint(
    task_in: TaskCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TaskRead:
    # Cria tarefa vinculada ao usuario logado
    return await create_task(db, task_in, current_user.id)


@router.get("/", response_model=list[TaskRead])
async def list_tasks_endpoint(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[TaskRead]:
    # Lista tarefas do usuario logado
    return list(await get_tasks(db, current_user.id))


@router.get("/{task_id}", response_model=TaskRead)
async def get_task_endpoint(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TaskRead:
    task = await get_task_by_id(db, task_id, current_user.id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tarefa não encontrada")
    return task


@router.patch("/{task_id}", response_model=TaskRead)
async def update_task_endpoint(
    task_id: UUID,
    task_in: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TaskRead:
    task = await get_task_by_id(db, task_id, current_user.id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tarefa não encontrada")
    return await update_task(db, task, task_in)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task_endpoint(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    task = await get_task_by_id(db, task_id, current_user.id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tarefa não encontrada")
    await delete_task(db, task)
