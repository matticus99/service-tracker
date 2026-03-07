"""Push notification evaluation and sending service."""
import json
import logging
from datetime import datetime, timedelta

from pywebpush import webpush, WebPushException
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings as app_config
from app.models import Vehicle, IntervalItem, PushSubscription, AppSettings, NotificationLog
from app.services.interval_status import compute_status

logger = logging.getLogger(__name__)


async def send_push(
    subscription: PushSubscription,
    payload: dict,
    vapid_private_key: str,
    vapid_claims_email: str,
    db: AsyncSession,
) -> bool:
    """Send a single push notification. Returns True if successful.
    Auto-deletes subscription on 410 Gone (browser unsubscribed).
    """
    try:
        webpush(
            subscription_info={
                "endpoint": subscription.endpoint,
                "keys": {
                    "p256dh": subscription.p256dh,
                    "auth": subscription.auth,
                },
            },
            data=json.dumps(payload),
            vapid_private_key=vapid_private_key,
            vapid_claims={"sub": vapid_claims_email},
        )
        return True
    except WebPushException as e:
        if e.response is not None and e.response.status_code == 410:
            logger.info("Subscription %s expired (410 Gone), removing", subscription.id)
            await db.delete(subscription)
            await db.flush()
        else:
            logger.error("Push failed for %s: %s", subscription.id, e)
        return False
    except Exception as e:
        logger.error("Unexpected push error for %s: %s", subscription.id, e)
        return False


async def check_and_notify(db: AsyncSession) -> dict:
    """Evaluate all vehicles' interval items and send notifications for new status transitions.
    Returns summary of actions taken.
    """
    app_settings = await db.get(AppSettings, 1)
    if not app_settings or not app_settings.vapid_private_key:
        return {"error": "VAPID keys not configured", "notifications_sent": 0}

    vapid_key = app_settings.vapid_private_key
    vapid_email = app_config.VAPID_CLAIMS_EMAIL

    # Get all vehicles that have at least one push subscription
    vehicles_result = await db.execute(
        select(Vehicle).where(
            Vehicle.id.in_(select(PushSubscription.vehicle_id).distinct())
        )
    )
    vehicles = vehicles_result.scalars().all()

    total_sent = 0
    errors = 0

    for vehicle in vehicles:
        # Load interval items
        items_result = await db.execute(
            select(IntervalItem).where(IntervalItem.vehicle_id == vehicle.id)
        )
        items = items_result.scalars().all()

        # Load subscriptions for this vehicle
        subs_result = await db.execute(
            select(PushSubscription).where(PushSubscription.vehicle_id == vehicle.id)
        )
        subscriptions = subs_result.scalars().all()

        for item in items:
            status, miles_remaining = compute_status(item, vehicle.current_mileage)
            if status not in ("overdue", "due_soon"):
                continue

            # Check if we already notified about this status for this item
            for sub in subscriptions:
                log_result = await db.execute(
                    select(NotificationLog).where(
                        NotificationLog.vehicle_id == vehicle.id,
                        NotificationLog.subscription_id == sub.id,
                        NotificationLog.interval_item_id == item.id,
                        NotificationLog.notification_type == status,
                    )
                )
                if log_result.scalar_one_or_none() is not None:
                    continue  # Already notified

                # Build notification
                if status == "overdue":
                    title = "Overdue Service"
                    body = f"{item.name} is overdue by {abs(miles_remaining)} miles"
                else:
                    title = "Service Due Soon"
                    body = f"{item.name} is due in {miles_remaining} miles"

                payload = {
                    "title": title,
                    "body": body,
                    "tag": f"{status}-{item.id}",
                    "url": "/tracker",
                }

                success = await send_push(sub, payload, vapid_key, vapid_email, db)
                if success:
                    db.add(NotificationLog(
                        vehicle_id=vehicle.id,
                        subscription_id=sub.id,
                        interval_item_id=item.id,
                        notification_type=status,
                        status_snapshot=status,
                    ))
                    total_sent += 1
                else:
                    errors += 1

    await db.commit()
    return {
        "vehicles_checked": len(vehicles),
        "notifications_sent": total_sent,
        "errors": errors,
    }


async def send_weekly_digest(db: AsyncSession) -> dict:
    """Send weekly digest notification summarizing overdue and due-soon items."""
    app_settings = await db.get(AppSettings, 1)
    if not app_settings or not app_settings.vapid_private_key:
        return {"error": "VAPID keys not configured"}

    vapid_key = app_settings.vapid_private_key
    vapid_email = app_config.VAPID_CLAIMS_EMAIL

    vehicles_result = await db.execute(
        select(Vehicle).where(
            Vehicle.id.in_(select(PushSubscription.vehicle_id).distinct())
        )
    )
    vehicles = vehicles_result.scalars().all()

    total_sent = 0

    for vehicle in vehicles:
        items_result = await db.execute(
            select(IntervalItem).where(IntervalItem.vehicle_id == vehicle.id)
        )
        items = items_result.scalars().all()

        overdue_count = 0
        due_soon_count = 0
        for item in items:
            status, _ = compute_status(item, vehicle.current_mileage)
            if status == "overdue":
                overdue_count += 1
            elif status == "due_soon":
                due_soon_count += 1

        if overdue_count == 0 and due_soon_count == 0:
            continue

        parts = []
        if overdue_count > 0:
            parts.append(f"{overdue_count} overdue")
        if due_soon_count > 0:
            parts.append(f"{due_soon_count} due soon")

        payload = {
            "title": f"Weekly Summary — {vehicle.year} {vehicle.make} {vehicle.model}",
            "body": f"You have {' and '.join(parts)} service items",
            "tag": "weekly-digest",
            "url": "/tracker",
        }

        subs_result = await db.execute(
            select(PushSubscription).where(PushSubscription.vehicle_id == vehicle.id)
        )
        for sub in subs_result.scalars().all():
            success = await send_push(sub, payload, vapid_key, vapid_email, db)
            if success:
                db.add(NotificationLog(
                    vehicle_id=vehicle.id,
                    subscription_id=sub.id,
                    notification_type="digest",
                    status_snapshot=f"overdue={overdue_count},due_soon={due_soon_count}",
                ))
                total_sent += 1

    await db.commit()
    return {"digests_sent": total_sent}


async def cleanup_old_logs(db: AsyncSession, days: int = 90) -> int:
    """Delete notification log entries older than N days. Returns count deleted."""
    cutoff = datetime.utcnow() - timedelta(days=days)
    result = await db.execute(
        delete(NotificationLog).where(NotificationLog.sent_at < cutoff)
    )
    await db.commit()
    return result.rowcount
