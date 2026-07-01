from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.user import User
from schemas.user import UserCreate


async def get_user_by_id(db: AsyncSession, user_id: UUID) -> User | None:
    stmt = select(User).where(User.id == user_id)
    return await db.scalar(stmt)


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    stmt = select(User).where(User.email == email)
    return await db.scalar(stmt)


async def create_user(db: AsyncSession, user_in: UserCreate) -> User:
    user = User(**user_in.model_dump())
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user
