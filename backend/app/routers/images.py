from datetime import timezone
from hashlib import sha256
from pathlib import Path
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Response, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.db import get_db_session
from app.deps import get_app_settings
from app.models import Image
from app.schemas import ImageListResponse, ImageResponse, ImageUpdateRequest
from app.security import require_api_key
from app.storage import ALLOWED_CONTENT_TYPES, StorageError, build_storage_path, delete_file, open_for_streaming, persist_upload, sanitize_filename

router = APIRouter(prefix="/images", tags=["images"])


def _etag_for(image: Image) -> str:
    stamp = image.updated_at.astimezone(timezone.utc).isoformat()
    return sha256(f"{image.id}:{stamp}".encode("utf-8")).hexdigest()


def _parse_tags(tags: list[str] | None) -> list[str]:
    if not tags:
        return []
    parsed: list[str] = []
    for tag in tags:
        for item in tag.split(","):
            value = item.strip()
            if value:
                parsed.append(value)
    return parsed


@router.post("", response_model=ImageResponse, status_code=status.HTTP_201_CREATED)
async def create_image(
    file: UploadFile = File(...),
    title: str | None = Form(default=None),
    description: str | None = Form(default=None),
    tags: list[str] | None = Form(default=None),
    owner_id: UUID | None = Form(default=None),
    session: AsyncSession = Depends(get_db_session),
    settings: Settings = Depends(get_app_settings),
    _: None = Depends(require_api_key),
) -> Image:
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Unsupported image type")

    image_id = uuid4()
    filename = sanitize_filename(file.filename or "upload")
    relative_path = build_storage_path(image_id, filename, file.content_type)

    try:
        size_bytes, storage_path = await persist_upload(
            file,
            Path(settings.efs_mount_path),
            relative_path,
            settings.max_upload_bytes,
        )
    except StorageError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    image = Image(
        id=image_id,
        owner_id=owner_id,
        filename=filename,
        content_type=file.content_type,
        size_bytes=size_bytes,
        storage_path=storage_path,
        title=title,
        description=description,
        tags=_parse_tags(tags),
    )

    session.add(image)
    try:
        await session.commit()
    except Exception:
        await session.rollback()
        delete_file(Path(settings.efs_mount_path), storage_path)
        raise

    await session.refresh(image)
    return image


@router.get("", response_model=ImageListResponse)
async def list_images(
    owner_id: UUID | None = Query(default=None),
    tag: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_db_session),
    settings: Settings = Depends(get_app_settings),
    _: None = Depends(require_api_key),
) -> ImageListResponse:
    del settings
    query = select(Image).order_by(Image.created_at.desc())
    count_query = select(func.count()).select_from(Image)

    if owner_id:
        query = query.where(Image.owner_id == owner_id)
        count_query = count_query.where(Image.owner_id == owner_id)

    if tag:
        query = query.where(Image.tags.contains([tag]))
        count_query = count_query.where(Image.tags.contains([tag]))

    items = (await session.scalars(query.limit(limit).offset(offset))).all()
    total = int((await session.execute(count_query)).scalar_one())
    return ImageListResponse(items=items, total=total, limit=limit, offset=offset)


async def _get_image_or_404(session: AsyncSession, image_id: UUID) -> Image:
    image = await session.get(Image, image_id)
    if not image:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")
    return image


@router.get("/{image_id}", response_model=ImageResponse)
async def get_image(
    image_id: UUID,
    session: AsyncSession = Depends(get_db_session),
    settings: Settings = Depends(get_app_settings),
    _: None = Depends(require_api_key),
) -> Image:
    del settings
    return await _get_image_or_404(session, image_id)


@router.get("/{image_id}/content")
async def get_image_content(
    image_id: UUID,
    session: AsyncSession = Depends(get_db_session),
    settings: Settings = Depends(get_app_settings),
    _: None = Depends(require_api_key),
) -> StreamingResponse:
    image = await _get_image_or_404(session, image_id)
    try:
        stream = open_for_streaming(Path(settings.efs_mount_path), image.storage_path)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image content missing") from exc

    response = StreamingResponse(stream, media_type=image.content_type)
    response.headers["Cache-Control"] = "private, max-age=3600"
    response.headers["ETag"] = _etag_for(image)
    response.headers["Content-Length"] = str(image.size_bytes)
    return response


@router.patch("/{image_id}", response_model=ImageResponse)
async def update_image(
    image_id: UUID,
    payload: ImageUpdateRequest,
    session: AsyncSession = Depends(get_db_session),
    settings: Settings = Depends(get_app_settings),
    _: None = Depends(require_api_key),
) -> Image:
    del settings
    image = await _get_image_or_404(session, image_id)
    changes = payload.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(image, field, value)
    await session.commit()
    await session.refresh(image)
    return image


@router.delete("/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_image_endpoint(
    image_id: UUID,
    session: AsyncSession = Depends(get_db_session),
    settings: Settings = Depends(get_app_settings),
    _: None = Depends(require_api_key),
) -> Response:
    image = await _get_image_or_404(session, image_id)
    storage_path = image.storage_path
    await session.delete(image)
    await session.commit()
    delete_file(Path(settings.efs_mount_path), storage_path)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
