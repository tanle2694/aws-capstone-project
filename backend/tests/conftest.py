import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import create_app


@pytest.fixture()
def client(tmp_path: Path) -> TestClient:
    db_path = tmp_path / "test.db"
    images_path = tmp_path / "images"

    os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{db_path}"
    os.environ["EFS_MOUNT_PATH"] = str(images_path)
    os.environ["AUTO_CREATE_TABLES"] = "true"
    os.environ["X_API_KEY"] = "test-key"
    os.environ["CORS_ALLOWED_ORIGINS"] = "http://localhost:5173"

    get_settings.cache_clear()
    app = create_app()
    with TestClient(app) as test_client:
        yield test_client

    get_settings.cache_clear()
