"""Tests for the attachments API (upload, download, list, delete)."""
import uuid

from httpx import AsyncClient


class TestAttachmentUpload:
    async def test_upload_jpeg(self, client: AsyncClient, vehicle: dict, service_record: dict, uploads_dir):
        resp = await client.post(
            "/api/v1/attachments/upload",
            data={
                "vehicle_id": vehicle["id"],
                "record_type": "service_record",
                "record_id": service_record["id"],
            },
            files={"file": ("photo.jpg", b"\xff\xd8\xff\xe0" + b"\x00" * 100, "image/jpeg")},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["filename"] == "photo.jpg"
        assert data["mime_type"] == "image/jpeg"
        assert data["file_size_bytes"] == 104
        assert "id" in data

    async def test_upload_pdf(self, client: AsyncClient, vehicle: dict, service_record: dict, uploads_dir):
        resp = await client.post(
            "/api/v1/attachments/upload",
            data={
                "vehicle_id": vehicle["id"],
                "record_type": "service_record",
                "record_id": service_record["id"],
            },
            files={"file": ("receipt.pdf", b"%PDF-1.4" + b"\x00" * 50, "application/pdf")},
        )
        assert resp.status_code == 201
        assert resp.json()["mime_type"] == "application/pdf"

    async def test_upload_png(self, client: AsyncClient, vehicle: dict, service_record: dict, uploads_dir):
        resp = await client.post(
            "/api/v1/attachments/upload",
            data={
                "vehicle_id": vehicle["id"],
                "record_type": "service_record",
                "record_id": service_record["id"],
            },
            files={"file": ("image.png", b"\x89PNG" + b"\x00" * 50, "image/png")},
        )
        assert resp.status_code == 201
        assert resp.json()["mime_type"] == "image/png"

    async def test_upload_rejects_invalid_mime_type(
        self, client: AsyncClient, vehicle: dict, service_record: dict, uploads_dir
    ):
        resp = await client.post(
            "/api/v1/attachments/upload",
            data={
                "vehicle_id": vehicle["id"],
                "record_type": "service_record",
                "record_id": service_record["id"],
            },
            files={"file": ("data.txt", b"hello world", "text/plain")},
        )
        assert resp.status_code == 400
        assert "not allowed" in resp.json()["detail"]

    async def test_upload_rejects_oversized_file(
        self, client: AsyncClient, vehicle: dict, service_record: dict, uploads_dir
    ):
        # Create content larger than 10 MB
        big_content = b"\x00" * (10 * 1024 * 1024 + 1)
        resp = await client.post(
            "/api/v1/attachments/upload",
            data={
                "vehicle_id": vehicle["id"],
                "record_type": "service_record",
                "record_id": service_record["id"],
            },
            files={"file": ("big.jpg", big_content, "image/jpeg")},
        )
        assert resp.status_code == 400
        assert "maximum size" in resp.json()["detail"]


class TestAttachmentList:
    async def test_list_empty(self, client: AsyncClient, vehicle: dict, service_record: dict, uploads_dir):
        resp = await client.get(
            "/api/v1/attachments",
            params={
                "vehicle_id": vehicle["id"],
                "record_type": "service_record",
                "record_id": service_record["id"],
            },
        )
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_list_after_upload(self, client: AsyncClient, vehicle: dict, service_record: dict, uploads_dir):
        # Upload a file first
        await client.post(
            "/api/v1/attachments/upload",
            data={
                "vehicle_id": vehicle["id"],
                "record_type": "service_record",
                "record_id": service_record["id"],
            },
            files={"file": ("photo.jpg", b"\xff\xd8\xff\xe0" + b"\x00" * 50, "image/jpeg")},
        )

        resp = await client.get(
            "/api/v1/attachments",
            params={
                "vehicle_id": vehicle["id"],
                "record_type": "service_record",
                "record_id": service_record["id"],
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["filename"] == "photo.jpg"

    async def test_list_filters_by_record(
        self, client: AsyncClient, vehicle: dict, service_record: dict, uploads_dir
    ):
        """Attachments for a different record_id should not appear."""
        # Upload to our record
        await client.post(
            "/api/v1/attachments/upload",
            data={
                "vehicle_id": vehicle["id"],
                "record_type": "service_record",
                "record_id": service_record["id"],
            },
            files={"file": ("photo.jpg", b"\xff\xd8\xff\xe0" + b"\x00" * 50, "image/jpeg")},
        )

        # List with a different record_id should return empty
        other_record_id = str(uuid.uuid4())
        resp = await client.get(
            "/api/v1/attachments",
            params={
                "vehicle_id": vehicle["id"],
                "record_type": "service_record",
                "record_id": other_record_id,
            },
        )
        assert resp.status_code == 200
        assert resp.json() == []


class TestAttachmentDownload:
    async def test_download_existing(self, client: AsyncClient, vehicle: dict, service_record: dict, uploads_dir):
        file_content = b"\xff\xd8\xff\xe0" + b"\x00" * 100
        upload_resp = await client.post(
            "/api/v1/attachments/upload",
            data={
                "vehicle_id": vehicle["id"],
                "record_type": "service_record",
                "record_id": service_record["id"],
            },
            files={"file": ("photo.jpg", file_content, "image/jpeg")},
        )
        attachment_id = upload_resp.json()["id"]

        resp = await client.get(f"/api/v1/attachments/{attachment_id}")
        assert resp.status_code == 200
        assert resp.content == file_content

    async def test_download_nonexistent(self, client: AsyncClient):
        resp = await client.get(f"/api/v1/attachments/{uuid.uuid4()}")
        assert resp.status_code == 404


class TestAttachmentDelete:
    async def test_delete_existing(self, client: AsyncClient, vehicle: dict, service_record: dict, uploads_dir):
        upload_resp = await client.post(
            "/api/v1/attachments/upload",
            data={
                "vehicle_id": vehicle["id"],
                "record_type": "service_record",
                "record_id": service_record["id"],
            },
            files={"file": ("photo.jpg", b"\xff\xd8\xff\xe0" + b"\x00" * 50, "image/jpeg")},
        )
        attachment_id = upload_resp.json()["id"]

        resp = await client.delete(f"/api/v1/attachments/{attachment_id}")
        assert resp.status_code == 204

        # Verify it's gone
        resp = await client.get(f"/api/v1/attachments/{attachment_id}")
        assert resp.status_code == 404

    async def test_delete_nonexistent(self, client: AsyncClient):
        resp = await client.delete(f"/api/v1/attachments/{uuid.uuid4()}")
        assert resp.status_code == 404
