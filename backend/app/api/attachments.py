import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models import Attachment
from app.models.attachment import RecordType

router = APIRouter()

ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "application/pdf",
}


@router.get("")
async def list_attachments(
    vehicle_id: uuid.UUID = Query(...),
    record_type: RecordType = Query(...),
    record_id: uuid.UUID = Query(...),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Attachment)
        .where(
            Attachment.vehicle_id == vehicle_id,
            Attachment.record_type == record_type,
            Attachment.record_id == record_id,
        )
        .order_by(Attachment.created_at)
    )
    attachments = result.scalars().all()
    return [
        {
            "id": str(a.id),
            "filename": a.filename,
            "mime_type": a.mime_type,
            "file_size_bytes": a.file_size_bytes,
        }
        for a in attachments
    ]


@router.post("/upload", status_code=201)
async def upload_attachment(
    vehicle_id: uuid.UUID = Form(...),
    record_type: RecordType = Form(...),
    record_id: uuid.UUID = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(400, f"File type {file.content_type} not allowed")

    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(400, "File exceeds maximum size of 10 MB")

    # Build storage path
    relative_path = os.path.join(str(vehicle_id), record_type.value, str(record_id), file.filename)
    full_path = os.path.join(settings.UPLOADS_DIR, relative_path)

    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "wb") as f:
        f.write(content)

    attachment = Attachment(
        vehicle_id=vehicle_id,
        record_type=record_type,
        record_id=record_id,
        filename=file.filename,
        stored_path=relative_path,
        mime_type=file.content_type,
        file_size_bytes=len(content),
    )
    db.add(attachment)
    await db.commit()
    await db.refresh(attachment)

    return {
        "id": str(attachment.id),
        "filename": attachment.filename,
        "mime_type": attachment.mime_type,
        "file_size_bytes": attachment.file_size_bytes,
    }


@router.get("/{attachment_id}")
async def get_attachment(attachment_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    attachment = await db.get(Attachment, attachment_id)
    if not attachment:
        raise HTTPException(404, "Attachment not found")

    full_path = os.path.join(settings.UPLOADS_DIR, attachment.stored_path)
    if not os.path.exists(full_path):
        raise HTTPException(404, "File not found on disk")

    return FileResponse(full_path, media_type=attachment.mime_type, filename=attachment.filename)


@router.delete("/{attachment_id}", status_code=204)
async def delete_attachment(attachment_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    attachment = await db.get(Attachment, attachment_id)
    if not attachment:
        raise HTTPException(404, "Attachment not found")

    full_path = os.path.join(settings.UPLOADS_DIR, attachment.stored_path)
    if os.path.exists(full_path):
        os.remove(full_path)

    await db.delete(attachment)
    await db.commit()
