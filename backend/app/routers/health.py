from pathlib import Path

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.db import get_db_session
from app.deps import get_app_settings
from app.storage import ensure_storage_ready

router = APIRouter(tags=["health"])


@router.get("/healthz")
async def healthz() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/readyz")
async def readyz(
    session: AsyncSession = Depends(get_db_session),
    settings: Settings = Depends(get_app_settings),
) -> dict[str, str]:
    await session.execute(text("SELECT 1"))
    ensure_storage_ready(Path(settings.efs_mount_path))
    return {"status": "ready"}
