from typing import Sequence
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.time_block import TimeBlock
from schemas.time_block import TimeBlockCreate, TimeBlockUpdate


async def create_time_block(
    db: AsyncSession,
    block_in: TimeBlockCreate,
    user_id: UUID,
) -> TimeBlock:
    block = TimeBlock(**block_in.model_dump(), user_id=user_id)
    db.add(block)
    await db.commit()
    await db.refresh(block)
    return block


async def get_time_blocks(db: AsyncSession, user_id: UUID) -> Sequence[TimeBlock]:
    stmt = select(TimeBlock).where(TimeBlock.user_id == user_id).order_by(TimeBlock.start_time.asc())
    result = await db.scalars(stmt)
    return result.all()


async def get_time_block_by_id(
    db: AsyncSession,
    block_id: UUID,
    user_id: UUID,
) -> TimeBlock | None:
    stmt = select(TimeBlock).where(TimeBlock.id == block_id, TimeBlock.user_id == user_id)
    return await db.scalar(stmt)


async def update_time_block(
    db: AsyncSession,
    db_block: TimeBlock,
    block_in: TimeBlockUpdate,
) -> TimeBlock:
    updates = block_in.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(db_block, field, value)

    await db.commit()
    await db.refresh(db_block)
    return db_block


async def delete_time_block(db: AsyncSession, db_block: TimeBlock) -> None:
    await db.delete(db_block)
    await db.commit()
