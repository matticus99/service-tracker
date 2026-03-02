import pytest
from httpx import AsyncClient


class TestServiceRecords:
    async def test_list_empty(self, client: AsyncClient, vehicle: dict):
        resp = await client.get(f"/api/v1/vehicles/{vehicle['id']}/service-records")
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_create(self, client: AsyncClient, vehicle: dict):
        resp = await client.post(f"/api/v1/vehicles/{vehicle['id']}/service-records", json={
            "service_date": "2025-05-01",
            "facility": "Bass Auto Care",
            "odometer": 182998,
            "services_performed": ["Brake pads replaced", "Rotors resurfaced"],
            "notes": "Front brakes only",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["facility"] == "Bass Auto Care"
        assert len(data["services_performed"]) == 2

    async def test_create_with_null_odometer(self, client: AsyncClient, vehicle: dict):
        """Odometer can be NULL (spec: some records had 'Unknown')."""
        resp = await client.post(f"/api/v1/vehicles/{vehicle['id']}/service-records", json={
            "service_date": "2020-03-15",
            "facility": "Unknown Shop",
            "services_performed": ["General inspection"],
        })
        assert resp.status_code == 201
        assert resp.json()["odometer"] is None

    async def test_auto_updates_vehicle_mileage(self, client: AsyncClient, vehicle: dict):
        new_odometer = vehicle["current_mileage"] + 2000
        await client.post(f"/api/v1/vehicles/{vehicle['id']}/service-records", json={
            "service_date": "2026-03-01",
            "facility": "DIY",
            "odometer": new_odometer,
            "services_performed": ["Air filter replaced"],
        })
        resp = await client.get(f"/api/v1/vehicles/{vehicle['id']}")
        assert resp.json()["current_mileage"] == new_odometer

    async def test_null_odometer_does_not_update_mileage(self, client: AsyncClient, vehicle: dict):
        original_mileage = vehicle["current_mileage"]
        await client.post(f"/api/v1/vehicles/{vehicle['id']}/service-records", json={
            "service_date": "2026-03-01",
            "facility": "DIY",
            "services_performed": ["Something"],
        })
        resp = await client.get(f"/api/v1/vehicles/{vehicle['id']}")
        assert resp.json()["current_mileage"] == original_mileage

    async def test_get(self, client: AsyncClient, vehicle: dict):
        create_resp = await client.post(f"/api/v1/vehicles/{vehicle['id']}/service-records", json={
            "service_date": "2025-05-01",
            "facility": "DIY",
            "odometer": 180000,
            "services_performed": ["Oil filter"],
        })
        record_id = create_resp.json()["id"]

        resp = await client.get(f"/api/v1/vehicles/{vehicle['id']}/service-records/{record_id}")
        assert resp.status_code == 200

    async def test_update(self, client: AsyncClient, vehicle: dict):
        create_resp = await client.post(f"/api/v1/vehicles/{vehicle['id']}/service-records", json={
            "service_date": "2025-05-01",
            "facility": "DIY",
            "odometer": 180000,
            "services_performed": ["Oil filter"],
        })
        record_id = create_resp.json()["id"]

        resp = await client.patch(
            f"/api/v1/vehicles/{vehicle['id']}/service-records/{record_id}",
            json={"notes": "Used K&N filter"},
        )
        assert resp.status_code == 200
        assert resp.json()["notes"] == "Used K&N filter"

    async def test_delete(self, client: AsyncClient, vehicle: dict):
        create_resp = await client.post(f"/api/v1/vehicles/{vehicle['id']}/service-records", json={
            "service_date": "2025-05-01",
            "facility": "DIY",
            "odometer": 180000,
            "services_performed": ["Oil filter"],
        })
        record_id = create_resp.json()["id"]

        resp = await client.delete(f"/api/v1/vehicles/{vehicle['id']}/service-records/{record_id}")
        assert resp.status_code == 204
