import mimetypes
import os
import re
import shutil
from datetime import datetime, timezone
from pathlib import Path
from uuid import UUID

ALLOWED_CONTENT_TYPES = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
}
CHUNK_SIZE = 1024 * 1024
_FILENAME_SANITIZER = re.compile(r"[^A-Za-z0-9._-]+")


class StorageError(Exception):
    pass


def sanitize_filename(filename: str) -> str:
    cleaned = _FILENAME_SANITIZER.sub("_", filename).strip("._")
    return cleaned or "upload"


def _detect_content_type(file_path: Path) -> str | None:
    with file_path.open("rb") as handle:
        header = handle.read(32)

    if header.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if header.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if header.startswith((b"GIF87a", b"GIF89a")):
        return "image/gif"
    if header.startswith(b"RIFF") and header[8:12] == b"WEBP":
        return "image/webp"
    return None


def validate_magic_bytes(file_path: Path, expected_content_type: str) -> None:
    detected = _detect_content_type(file_path)
    if detected != expected_content_type:
        raise StorageError(f"File content does not match declared content type: detected {detected}")


def build_storage_path(file_id: UUID, original_filename: str, content_type: str) -> str:
    now = datetime.now(timezone.utc)
    suffix = Path(original_filename).suffix.lower() or ALLOWED_CONTENT_TYPES.get(content_type) or mimetypes.guess_extension(content_type) or ""
    if not suffix.startswith(".") and suffix:
        suffix = f".{suffix}"
    return f"{now:%Y/%m/%d}/{file_id}{suffix}"


async def persist_upload(upload_file, destination_root: Path, relative_path: str, max_bytes: int) -> tuple[int, str]:
    final_path = destination_root / relative_path
    final_path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = final_path.with_suffix(f"{final_path.suffix}.tmp")

    size = 0
    with temp_path.open("wb") as buffer:
        while True:
            chunk = await upload_file.read(CHUNK_SIZE)
            if not chunk:
                break
            size += len(chunk)
            if size > max_bytes:
                temp_path.unlink(missing_ok=True)
                raise StorageError(f"Upload exceeds configured max size of {max_bytes} bytes")
            buffer.write(chunk)

    if size == 0:
        temp_path.unlink(missing_ok=True)
        raise StorageError("Uploaded file is empty")

    validate_magic_bytes(temp_path, upload_file.content_type)
    os.replace(temp_path, final_path)
    return size, relative_path


def delete_file(destination_root: Path, relative_path: str) -> None:
    (destination_root / relative_path).unlink(missing_ok=True)


def open_for_streaming(destination_root: Path, relative_path: str):
    full_path = destination_root / relative_path
    if not full_path.exists():
        raise FileNotFoundError(relative_path)
    return full_path.open("rb")


def ensure_storage_ready(destination_root: Path) -> None:
    destination_root.mkdir(parents=True, exist_ok=True)
    probe = destination_root / ".healthcheck"
    probe.write_text("ok", encoding="utf-8")
    probe.unlink(missing_ok=True)


def remove_tree(path: Path) -> None:
    shutil.rmtree(path, ignore_errors=True)
