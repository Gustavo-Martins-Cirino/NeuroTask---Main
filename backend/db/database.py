from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from core.config import settings


# Engine assincrona para o PostgreSQL do Supabase
engine = create_async_engine(settings.database_url)

# Fabrica de sessoes assincronas
async_session = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    # Dependencia de sessao para o FastAPI
    async with async_session() as session:
        yield session
