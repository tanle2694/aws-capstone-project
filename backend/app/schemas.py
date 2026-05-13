from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ImageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    owner_id: UUID | None
    filename: str
    content_type: str
    size_bytes: int
    storage_path: str
    title: str | None
    description: str | None
    tags: list[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class ImageListResponse(BaseModel):
    items: list[ImageResponse]
    total: int
    limit: int
    offset: int


class ImageUpdateRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    tags: list[str] | None = None
