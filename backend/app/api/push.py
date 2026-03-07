import json
import uuid
import logging
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Vehicle, PushSubscription, AppSettings
from app.schemas.push_subscription import PushSubscriptionCreate, PushSubscriptionOut

logger = logging.getLogger(__name__)

# Global endpoints (no vehicle scope)
router = APIRouter()

# Vehicle-scoped endpoints
subscription_router = APIRouter()


async def _get_vehicle(vehicle_id: uuid.UUID, db: AsyncSession) -> Vehicle:
    vehicle = await db.get(Vehicle, vehicle_id)
    if not vehicle:
        raise HTTPException(404, "Vehicle not found")
    return vehicle


@router.get("/vapid-public-key")
async def get_vapid_public_key(db: AsyncSession = Depends(get_db)):
    """Return the VAPID public key for browser push subscription."""
    settings = await db.get(AppSettings, 1)
    if not settings or not settings.vapid_public_key:
        raise HTTPException(500, "VAPID keys not configured")
    return {"public_key": settings.vapid_public_key}


@subscription_router.get("/{vehicle_id}/push-subscriptions", response_model=list[PushSubscriptionOut])
async def list_push_subscriptions(vehicle_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    await _get_vehicle(vehicle_id, db)
    result = await db.execute(
        select(PushSubscription)
        .where(PushSubscription.vehicle_id == vehicle_id)
        .order_by(PushSubscription.created_at.desc())
    )
    return result.scalars().all()


@subscription_router.post("/{vehicle_id}/push-subscriptions", response_model=PushSubscriptionOut, status_code=201)
async def create_push_subscription(
    vehicle_id: uuid.UUID, data: PushSubscriptionCreate, db: AsyncSession = Depends(get_db)
):
    await _get_vehicle(vehicle_id, db)

    # Upsert: if this endpoint already exists for this vehicle, update keys
    result = await db.execute(
        select(PushSubscription).where(
            PushSubscription.vehicle_id == vehicle_id,
            PushSubscription.endpoint == data.endpoint,
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        existing.p256dh = data.p256dh
        existing.auth = data.auth
        if data.device_label is not None:
            existing.device_label = data.device_label
        await db.commit()
        await db.refresh(existing)
        return existing

    sub = PushSubscription(vehicle_id=vehicle_id, **data.model_dump())
    db.add(sub)
    await db.commit()
    await db.refresh(sub)
    return sub


@subscription_router.delete("/{vehicle_id}/push-subscriptions/{sub_id}", status_code=204)
async def delete_push_subscription(
    vehicle_id: uuid.UUID, sub_id: uuid.UUID, db: AsyncSession = Depends(get_db)
):
    await _get_vehicle(vehicle_id, db)
    sub = await db.get(PushSubscription, sub_id)
    if not sub or sub.vehicle_id != vehicle_id:
        raise HTTPException(404, "Subscription not found")
    await db.delete(sub)
    await db.commit()


@router.post("/test/{subscription_id}")
async def send_test_notification(subscription_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Send a test push notification to a specific subscription."""
    sub = await db.get(PushSubscription, subscription_id)
    if not sub:
        raise HTTPException(404, "Subscription not found")

    settings = await db.get(AppSettings, 1)
    if not settings or not settings.vapid_private_key:
        raise HTTPException(500, "VAPID keys not configured")

    from app.services.notifications import send_push
    payload = {
        "title": "Service Tracker",
        "body": "Test notification — push is working!",
        "tag": "test",
        "url": "/settings",
    }
    success = await send_push(
        sub, payload, settings.vapid_private_key, settings.vapid_claims_email, db
    )
    if not success:
        raise HTTPException(500, "Failed to send notification")
    return {"status": "sent"}


@router.post("/check-notifications")
async def check_notifications(db: AsyncSession = Depends(get_db)):
    """Trigger daily notification check. Meant to be called by cron."""
    from app.services.notifications import check_and_notify, send_weekly_digest, cleanup_old_logs

    result = await check_and_notify(db)

    # Check if today is digest day
    settings = await db.get(AppSettings, 1)
    if settings and settings.weekly_digest_enabled:
        if date.today().weekday() == settings.weekly_digest_day:
            digest_result = await send_weekly_digest(db)
            result["digest"] = digest_result

    # Monthly log cleanup
    if date.today().day == 1:
        cleaned = await cleanup_old_logs(db)
        result["logs_cleaned"] = cleaned

    return result
