from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import Settings, get_settings


class Base(DeclarativeBase):
    pass


_engine = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def configure_database(settings: Settings | None = None) -> None:
    global _engine, _session_factory

    current = settings or get_settings()
    _engine = create_async_engine(current.database_url, future=True)
    _session_factory = async_sessionmaker(_engine, expire_on_commit=False)


def get_engine():
    if _engine is None:
        configure_database()
    return _engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    if _session_factory is None:
        configure_database()
    assert _session_factory is not None
    return _session_factory


async def get_db_session() -> AsyncIterator[AsyncSession]:
    session_factory = get_session_factory()
    async with session_factory() as session:
        yield session
