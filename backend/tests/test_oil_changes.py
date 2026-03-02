import pytest
from httpx import AsyncClient


class TestOilChanges:
    async def test_list_empty(self, client: AsyncClient, vehicle: dict):
        resp = await client.get(f"/api/v1/vehicles/{vehicle['id']}/oil-changes")
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_list_vehicle_not_found(self, client: AsyncClient):
        resp = await client.get("/api/v1/vehicles/00000000-0000-0000-0000-000000000000/oil-changes")
        assert resp.status_code == 404

    async def test_create(self, client: AsyncClient, vehicle: dict):
        resp = await client.post(f"/api/v1/vehicles/{vehicle['id']}/oil-changes", json={
            "service_date": "2025-11-29",
            "facility": "Take 5",
            "odometer": 188321,
            "notes": "Full synthetic 0W-20",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["facility"] == "Take 5"
        assert data["odometer"] == 188321
        assert data["interval_miles"] is None  # first oil change, no previous

    async def test_interval_calculation(self, client: AsyncClient, vehicle: dict):
        # Create first oil change
        await client.post(f"/api/v1/vehicles/{vehicle['id']}/oil-changes", json={
            "service_date": "2025-06-01",
            "facility": "Take 5",
            "odometer": 183000,
        })
        # Create second oil change
        resp = await client.post(f"/api/v1/vehicles/{vehicle['id']}/oil-changes", json={
            "service_date": "2025-11-29",
            "facility": "Take 5",
            "odometer": 188321,
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["interval_miles"] == 5321
        assert data["interval_months"] is not None

    async def test_auto_updates_vehicle_mileage(self, client: AsyncClient, vehicle: dict):
        """Adding an oil change with higher odometer should update vehicle mileage."""
        new_odometer = vehicle["current_mileage"] + 5000
        await client.post(f"/api/v1/vehicles/{vehicle['id']}/oil-changes", json={
            "service_date": "2026-03-01",
            "facility": "DIY",
            "odometer": new_odometer,
        })
        # Check vehicle mileage was updated
        resp = await client.get(f"/api/v1/vehicles/{vehicle['id']}")
        assert resp.json()["current_mileage"] == new_odometer

    async def test_get(self, client: AsyncClient, vehicle: dict):
        create_resp = await client.post(f"/api/v1/vehicles/{vehicle['id']}/oil-changes", json={
            "service_date": "2025-11-29",
            "facility": "Take 5",
            "odometer": 188321,
        })
        oc_id = create_resp.json()["id"]

        resp = await client.get(f"/api/v1/vehicles/{vehicle['id']}/oil-changes/{oc_id}")
        assert resp.status_code == 200
        assert resp.json()["id"] == oc_id

    async def test_update(self, client: AsyncClient, vehicle: dict):
        create_resp = await client.post(f"/api/v1/vehicles/{vehicle['id']}/oil-changes", json={
            "service_date": "2025-11-29",
            "facility": "Take 5",
            "odometer": 188321,
        })
        oc_id = create_resp.json()["id"]

        resp = await client.patch(
            f"/api/v1/vehicles/{vehicle['id']}/oil-changes/{oc_id}",
            json={"facility": "Jiffy Lube"},
        )
        assert resp.status_code == 200
        assert resp.json()["facility"] == "Jiffy Lube"

    async def test_delete(self, client: AsyncClient, vehicle: dict):
        create_resp = await client.post(f"/api/v1/vehicles/{vehicle['id']}/oil-changes", json={
            "service_date": "2025-11-29",
            "facility": "Take 5",
            "odometer": 188321,
        })
        oc_id = create_resp.json()["id"]

        resp = await client.delete(f"/api/v1/vehicles/{vehicle['id']}/oil-changes/{oc_id}")
        assert resp.status_code == 204

        resp = await client.get(f"/api/v1/vehicles/{vehicle['id']}/oil-changes/{oc_id}")
        assert resp.status_code == 404
