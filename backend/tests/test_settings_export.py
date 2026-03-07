import pytest
from httpx import AsyncClient


class TestSettings:
    async def test_get_defaults(self, client: AsyncClient):
        resp = await client.get("/api/v1/settings")
        assert resp.status_code == 200
        data = resp.json()
        assert data["shop_fee"] == 40.0
        assert data["tax_rate"] == 0.07

    async def test_update_shop_fee(self, client: AsyncClient):
        resp = await client.patch("/api/v1/settings", json={"shop_fee": 50.0})
        assert resp.status_code == 200
        assert resp.json()["shop_fee"] == 50.0
        assert resp.json()["tax_rate"] == 0.07  # unchanged

    async def test_update_tax_rate(self, client: AsyncClient):
        resp = await client.patch("/api/v1/settings", json={"tax_rate": 0.08})
        assert resp.status_code == 200
        assert resp.json()["tax_rate"] == 0.08

    async def test_update_both(self, client: AsyncClient):
        resp = await client.patch("/api/v1/settings", json={"shop_fee": 60.0, "tax_rate": 0.065})
        assert resp.status_code == 200
        assert resp.json()["shop_fee"] == 60.0
        assert resp.json()["tax_rate"] == 0.065

    async def test_get_settings_includes_notification_fields(self, client: AsyncClient):
        resp = await client.get("/api/v1/settings")
        assert resp.status_code == 200
        data = resp.json()
        assert data["weekly_digest_enabled"] is False
        assert data["weekly_digest_day"] == 1

    async def test_update_weekly_digest_enabled(self, client: AsyncClient):
        resp = await client.patch("/api/v1/settings", json={"weekly_digest_enabled": True})
        assert resp.status_code == 200
        assert resp.json()["weekly_digest_enabled"] is True

    async def test_update_weekly_digest_day(self, client: AsyncClient):
        resp = await client.patch("/api/v1/settings", json={"weekly_digest_day": 5})
        assert resp.status_code == 200
        assert resp.json()["weekly_digest_day"] == 5

    async def test_update_notification_settings_preserves_others(self, client: AsyncClient):
        resp = await client.patch("/api/v1/settings", json={"weekly_digest_enabled": True})
        assert resp.status_code == 200
        data = resp.json()
        assert data["weekly_digest_enabled"] is True
        assert data["shop_fee"] == 40.0
        assert data["tax_rate"] == 0.07


class TestExport:
    async def test_export_empty(self, client: AsyncClient):
        resp = await client.get("/api/v1/export")
        assert resp.status_code == 200
        data = resp.json()
        assert "vehicles" in data
        assert "settings" in data

    async def test_export_with_data(self, client: AsyncClient, vehicle: dict):
        # Add some data
        await client.post(f"/api/v1/vehicles/{vehicle['id']}/oil-changes", json={
            "service_date": "2025-11-29", "facility": "Take 5", "odometer": 188321,
        })
        await client.post(f"/api/v1/vehicles/{vehicle['id']}/service-records", json={
            "service_date": "2025-05-01", "facility": "DIY", "odometer": 182000,
            "services_performed": ["Air filter replaced"],
        })
        await client.post(f"/api/v1/vehicles/{vehicle['id']}/interval-items", json={
            "name": "Oil Change", "type": "regular",
            "next_service_miles": 193321, "estimated_cost": 65.0,
        })
        await client.post(f"/api/v1/vehicles/{vehicle['id']}/observations", json={
            "observation_date": "2025-10-15", "observation": "Squeak from brakes",
        })

        resp = await client.get("/api/v1/export")
        assert resp.status_code == 200
        data = resp.json()

        assert len(data["vehicles"]) == 1
        v = data["vehicles"][0]
        assert v["make"] == "Toyota"
        assert len(v["oil_changes"]) == 1
        assert len(v["service_records"]) == 1
        assert len(v["interval_items"]) == 1
        assert len(v["observations"]) == 1

    async def test_export_settings_include_notification_fields(self, client: AsyncClient):
        resp = await client.get("/api/v1/export")
        assert resp.status_code == 200
        settings = resp.json()["settings"]
        assert "weekly_digest_enabled" in settings
        assert "weekly_digest_day" in settings

    async def test_export_settings_after_update(self, client: AsyncClient):
        await client.patch("/api/v1/settings", json={
            "weekly_digest_enabled": True,
            "weekly_digest_day": 4,
        })
        resp = await client.get("/api/v1/export")
        settings = resp.json()["settings"]
        assert settings["weekly_digest_enabled"] is True
        assert settings["weekly_digest_day"] == 4
