from typing import Annotated

from fastapi import Depends, Header, HTTPException, status

from app.config import Settings
from app.deps import get_app_settings


async def require_api_key(
    settings: Annotated[Settings, Depends(get_app_settings)],
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
) -> None:
    if not settings.x_api_key:
        return
    if x_api_key != settings.x_api_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")
