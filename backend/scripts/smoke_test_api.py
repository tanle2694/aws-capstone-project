from __future__ import annotations

import base64
import os
import sys

import httpx


PNG_BYTES = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wn8j3sAAAAASUVORK5CYII="
)


def main() -> int:
    api_base_url = os.environ.get("API_BASE_URL", "http://127.0.0.1:8000")
    api_key = os.environ.get("API_KEY", "local-dev-key")
    headers = {"X-API-Key": api_key}

    with httpx.Client(base_url=api_base_url, headers=headers, timeout=30.0) as client:
        health = client.get("/healthz")
        health.raise_for_status()

        ready = client.get("/readyz")
        ready.raise_for_status()

        create = client.post(
            "/images",
            data={
                "title": "compose smoke test",
                "description": "verifies docker-compose backend",
                "tags": ["compose", "smoke"],
            },
            files={"file": ("tiny.png", PNG_BYTES, "image/png")},
        )
        create.raise_for_status()
        image = create.json()
        image_id = image["id"]

        listing = client.get("/images")
        listing.raise_for_status()
        if not any(item["id"] == image_id for item in listing.json()["items"]):
            raise RuntimeError("Created image not found in list response")

        metadata = client.get(f"/images/{image_id}")
        metadata.raise_for_status()
        if metadata.json()["title"] != "compose smoke test":
            raise RuntimeError("Metadata title mismatch after create")

        content = client.get(f"/images/{image_id}/content")
        content.raise_for_status()
        if content.content != PNG_BYTES:
            raise RuntimeError("Downloaded image does not match uploaded image")

        patch = client.patch(
            f"/images/{image_id}",
            json={"title": "updated by smoke test", "tags": ["compose", "updated"]},
        )
        patch.raise_for_status()
        if patch.json()["title"] != "updated by smoke test":
            raise RuntimeError("Patch response did not return updated title")

        delete = client.delete(f"/images/{image_id}")
        delete.raise_for_status()

        missing = client.get(f"/images/{image_id}")
        if missing.status_code != 404:
            raise RuntimeError(f"Expected 404 after delete, got {missing.status_code}")

    print(f"Smoke test passed for image {image_id}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
