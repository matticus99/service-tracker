"""Tests for push notification sending, check_and_notify, weekly digest, and log cleanup."""
import uuid
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

from httpx import AsyncClient
from pywebpush import WebPushException
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from sqlalchemy.pool import NullPool

from app.models import NotificationLog, PushSubscription, AppSettings

# Import the test session factory directly from the conftest module's engine
import app.database as db_module
_test_async_session = async_sessionmaker(db_module.engine, class_=AsyncSession, expire_on_commit=False)


class TestSendTestNotification:
    async def test_send_success(self, client: AsyncClient, push_subscription: dict):
        with patch("app.services.notifications.webpush") as mock_webpush:
            mock_webpush.return_value = MagicMock()
            resp = await client.post(f"/api/v1/push/test/{push_subscription['id']}")
            assert resp.status_code == 200
            assert resp.json()["status"] == "sent"
            mock_webpush.assert_called_once()

    async def test_send_not_found(self, client: AsyncClient):
        resp = await client.post(f"/api/v1/push/test/{uuid.uuid4()}")
        assert resp.status_code == 404

    async def test_send_push_failure(self, client: AsyncClient, push_subscription: dict):
        with patch("app.services.notifications.webpush") as mock_webpush:
            mock_webpush.side_effect = WebPushException("Push failed")
            resp = await client.post(f"/api/v1/push/test/{push_subscription['id']}")
            assert resp.status_code == 500


class TestSendPushFunction:
    async def test_success(self, client: AsyncClient, push_subscription: dict):
        from app.services.notifications import send_push

        async with _test_async_session() as db:
            sub = await db.get(PushSubscription, uuid.UUID(push_subscription["id"]))
            settings = await db.get(AppSettings, 1)

            with patch("app.services.notifications.webpush") as mock_webpush:
                result = await send_push(
                    sub, {"title": "Test"}, settings.vapid_private_key,
                    "mailto:test@example.com", db,
                )
                assert result is True
                mock_webpush.assert_called_once()

    async def test_410_auto_deletes_subscription(self, client: AsyncClient, push_subscription: dict):
        from app.services.notifications import send_push

        async with _test_async_session() as db:
            sub = await db.get(PushSubscription, uuid.UUID(push_subscription["id"]))
            settings = await db.get(AppSettings, 1)

            mock_response = MagicMock()
            mock_response.status_code = 410

            with patch("app.services.notifications.webpush") as mock_webpush:
                mock_webpush.side_effect = WebPushException("Gone", response=mock_response)
                result = await send_push(
                    sub, {"title": "Test"}, settings.vapid_private_key,
                    "mailto:test@example.com", db,
                )
                assert result is False
                await db.commit()

            # Verify subscription was deleted
            check = await db.get(PushSubscription, uuid.UUID(push_subscription["id"]))
            assert check is None

    async def test_other_webpush_error(self, client: AsyncClient, push_subscription: dict):
        from app.services.notifications import send_push

        async with _test_async_session() as db:
            sub = await db.get(PushSubscription, uuid.UUID(push_subscription["id"]))
            settings = await db.get(AppSettings, 1)

            mock_response = MagicMock()
            mock_response.status_code = 403

            with patch("app.services.notifications.webpush") as mock_webpush:
                mock_webpush.side_effect = WebPushException("Forbidden", response=mock_response)
                result = await send_push(
                    sub, {"title": "Test"}, settings.vapid_private_key,
                    "mailto:test@example.com", db,
                )
                assert result is False

            # Subscription should still exist
            check = await db.get(PushSubscription, uuid.UUID(push_subscription["id"]))
            assert check is not None

    async def test_generic_exception(self, client: AsyncClient, push_subscription: dict):
        from app.services.notifications import send_push

        async with _test_async_session() as db:
            sub = await db.get(PushSubscription, uuid.UUID(push_subscription["id"]))
            settings = await db.get(AppSettings, 1)

            with patch("app.services.notifications.webpush") as mock_webpush:
                mock_webpush.side_effect = RuntimeError("Network error")
                result = await send_push(
                    sub, {"title": "Test"}, settings.vapid_private_key,
                    "mailto:test@example.com", db,
                )
                assert result is False


class TestCheckAndNotify:
    async def test_no_subscriptions(self, client: AsyncClient, vehicle: dict):
        """No subscriptions = no vehicles checked."""
        from app.services.notifications import check_and_notify

        async with _test_async_session() as db:
            result = await check_and_notify(db)
            assert result["vehicles_checked"] == 0
            assert result["notifications_sent"] == 0

    async def test_overdue_item_sends_notification(
        self, client: AsyncClient, vehicle: dict, push_subscription: dict, interval_item_overdue: dict
    ):
        from app.services.notifications import check_and_notify

        with patch("app.services.notifications.webpush"):
            async with _test_async_session() as db:
                result = await check_and_notify(db)
                assert result["vehicles_checked"] == 1
                assert result["notifications_sent"] == 1
                assert result["errors"] == 0

    async def test_ok_item_no_notification(
        self, client: AsyncClient, vehicle: dict, push_subscription: dict
    ):
        """An item with OK status should not trigger a notification."""
        await client.post(
            f"/api/v1/vehicles/{vehicle['id']}/interval-items",
            json={
                "name": "Tire Rotation",
                "type": "regular",
                "next_service_miles": 250000,  # far ahead
                "estimated_cost": 30.0,
            },
        )

        from app.services.notifications import check_and_notify

        with patch("app.services.notifications.webpush"):
            async with _test_async_session() as db:
                result = await check_and_notify(db)
                assert result["notifications_sent"] == 0

    async def test_duplicate_prevention(
        self, client: AsyncClient, vehicle: dict, push_subscription: dict, interval_item_overdue: dict
    ):
        """Second call should not re-send for the same item+status."""
        from app.services.notifications import check_and_notify

        with patch("app.services.notifications.webpush"):
            async with _test_async_session() as db:
                result1 = await check_and_notify(db)
                assert result1["notifications_sent"] == 1

            # Second call with fresh session
            async with _test_async_session() as db:
                result2 = await check_and_notify(db)
                assert result2["notifications_sent"] == 0  # Already notified

    async def test_due_soon_item_sends_notification(
        self, client: AsyncClient, vehicle: dict, push_subscription: dict
    ):
        """A due_soon item should trigger a notification."""
        await client.post(
            f"/api/v1/vehicles/{vehicle['id']}/interval-items",
            json={
                "name": "Air Filter",
                "type": "regular",
                "next_service_miles": 191500,  # within 500 threshold
                "due_soon_threshold_miles": 500,
                "estimated_cost": 25.0,
            },
        )

        from app.services.notifications import check_and_notify

        with patch("app.services.notifications.webpush"):
            async with _test_async_session() as db:
                result = await check_and_notify(db)
                assert result["notifications_sent"] == 1


class TestWeeklyDigest:
    async def test_digest_with_overdue_items(
        self, client: AsyncClient, vehicle: dict, push_subscription: dict, interval_item_overdue: dict
    ):
        from app.services.notifications import send_weekly_digest

        with patch("app.services.notifications.webpush"):
            async with _test_async_session() as db:
                result = await send_weekly_digest(db)
                assert result["digests_sent"] == 1

    async def test_digest_all_ok_skipped(
        self, client: AsyncClient, vehicle: dict, push_subscription: dict
    ):
        """Vehicle with only OK items should not get a digest."""
        await client.post(
            f"/api/v1/vehicles/{vehicle['id']}/interval-items",
            json={
                "name": "Tire Rotation",
                "type": "regular",
                "next_service_miles": 250000,
            },
        )

        from app.services.notifications import send_weekly_digest

        with patch("app.services.notifications.webpush"):
            async with _test_async_session() as db:
                result = await send_weekly_digest(db)
                assert result["digests_sent"] == 0

    async def test_digest_no_subscriptions(self, client: AsyncClient, vehicle: dict):
        from app.services.notifications import send_weekly_digest

        async with _test_async_session() as db:
            result = await send_weekly_digest(db)
            assert result["digests_sent"] == 0


class TestCleanupOldLogs:
    async def test_deletes_old_logs(
        self, client: AsyncClient, vehicle: dict, push_subscription: dict, interval_item_overdue: dict
    ):
        from app.services.notifications import cleanup_old_logs

        # Create an old notification log entry
        async with _test_async_session() as db:
            old_log = NotificationLog(
                vehicle_id=uuid.UUID(vehicle["id"]),
                subscription_id=uuid.UUID(push_subscription["id"]),
                interval_item_id=uuid.UUID(interval_item_overdue["id"]),
                notification_type="overdue",
                status_snapshot="overdue",
                sent_at=datetime.utcnow() - timedelta(days=100),
            )
            db.add(old_log)
            await db.commit()

        async with _test_async_session() as db:
            deleted = await cleanup_old_logs(db)
            assert deleted == 1

    async def test_keeps_recent_logs(
        self, client: AsyncClient, vehicle: dict, push_subscription: dict, interval_item_overdue: dict
    ):
        from app.services.notifications import cleanup_old_logs

        # Create a recent notification log entry
        async with _test_async_session() as db:
            recent_log = NotificationLog(
                vehicle_id=uuid.UUID(vehicle["id"]),
                subscription_id=uuid.UUID(push_subscription["id"]),
                interval_item_id=uuid.UUID(interval_item_overdue["id"]),
                notification_type="overdue",
                status_snapshot="overdue",
                sent_at=datetime.utcnow() - timedelta(days=30),
            )
            db.add(recent_log)
            await db.commit()

        async with _test_async_session() as db:
            deleted = await cleanup_old_logs(db)
            assert deleted == 0


class TestCheckNotificationsEndpoint:
    async def test_basic_check(self, client: AsyncClient):
        """POST /push/check-notifications returns a summary."""
        with patch("app.services.notifications.webpush"):
            resp = await client.post("/api/v1/push/check-notifications")
            assert resp.status_code == 200
            data = resp.json()
            assert "vehicles_checked" in data
            assert "notifications_sent" in data

    async def test_check_with_overdue_sends(
        self, client: AsyncClient, vehicle: dict, push_subscription: dict, interval_item_overdue: dict
    ):
        with patch("app.services.notifications.webpush"):
            resp = await client.post("/api/v1/push/check-notifications")
            assert resp.status_code == 200
            assert resp.json()["notifications_sent"] == 1
