from base64 import b64decode


PNG_BYTES = b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wn8j3sAAAAASUVORK5CYII="
)


def test_health_and_readiness(client):
    health = client.get("/healthz")
    assert health.status_code == 200
    assert health.json() == {"status": "ok"}

    ready = client.get("/readyz")
    assert ready.status_code == 200
    assert ready.json() == {"status": "ready"}


def test_requires_api_key(client):
    response = client.get("/images")
    assert response.status_code == 401


def test_image_crud_flow(client):
    headers = {"X-API-Key": "test-key"}
    create = client.post(
        "/images",
        headers=headers,
        data={
            "title": "sample",
            "description": "fixture upload",
            "tags": ["demo", "cover"],
        },
        files={"file": ("tiny.png", PNG_BYTES, "image/png")},
    )
    assert create.status_code == 201, create.text

    created = create.json()
    image_id = created["id"]
    assert created["filename"] == "tiny.png"
    assert created["content_type"] == "image/png"
    assert created["size_bytes"] == len(PNG_BYTES)
    assert created["tags"] == ["demo", "cover"]

    listing = client.get("/images", headers=headers)
    assert listing.status_code == 200
    payload = listing.json()
    assert payload["total"] == 1
    assert payload["items"][0]["id"] == image_id

    metadata = client.get(f"/images/{image_id}", headers=headers)
    assert metadata.status_code == 200
    assert metadata.json()["title"] == "sample"

    content = client.get(f"/images/{image_id}/content", headers=headers)
    assert content.status_code == 200
    assert content.headers["content-type"] == "image/png"
    assert content.content == PNG_BYTES
    assert "etag" in content.headers

    updated = client.patch(
        f"/images/{image_id}",
        headers=headers,
        json={"title": "updated", "tags": ["fresh"]},
    )
    assert updated.status_code == 200
    assert updated.json()["title"] == "updated"
    assert updated.json()["tags"] == ["fresh"]

    deleted = client.delete(f"/images/{image_id}", headers=headers)
    assert deleted.status_code == 204

    missing = client.get(f"/images/{image_id}", headers=headers)
    assert missing.status_code == 404


def test_rejects_invalid_content_type(client):
    headers = {"X-API-Key": "test-key"}
    response = client.post(
        "/images",
        headers=headers,
        files={"file": ("notes.txt", b"plain text", "text/plain")},
    )
    assert response.status_code == 415
