from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_current_user
from db.database import get_db
from models.user import User
from schemas.time_block import TimeBlockCreate, TimeBlockRead, TimeBlockUpdate
from services.time_block import (
    create_time_block,
    delete_time_block,
    get_time_block_by_id,
    get_time_blocks,
    update_time_block,
)


router = APIRouter(prefix="/time-blocks", tags=["Time Blocks"])


@router.post("/", response_model=TimeBlockRead, status_code=status.HTTP_201_CREATED)
async def create_time_block_endpoint(
    block_in: TimeBlockCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TimeBlockRead:
    # Cria bloco vinculado ao usuario logado
    return await create_time_block(db, block_in, current_user.id)


@router.get("/", response_model=list[TimeBlockRead])
async def list_time_blocks_endpoint(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[TimeBlockRead]:
    # Lista blocos do usuario logado
    return list(await get_time_blocks(db, current_user.id))


@router.get("/{block_id}", response_model=TimeBlockRead)
async def get_time_block_endpoint(
    block_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TimeBlockRead:
    block = await get_time_block_by_id(db, block_id, current_user.id)
    if not block:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bloco de tempo não encontrado")
    return block


@router.patch("/{block_id}", response_model=TimeBlockRead)
async def update_time_block_endpoint(
    block_id: UUID,
    block_in: TimeBlockUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TimeBlockRead:
    block = await get_time_block_by_id(db, block_id, current_user.id)
    if not block:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bloco de tempo não encontrado")
    return await update_time_block(db, block, block_in)


@router.delete("/{block_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_time_block_endpoint(
    block_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    block = await get_time_block_by_id(db, block_id, current_user.id)
    if not block:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bloco de tempo não encontrado")
    await delete_time_block(db, block)
