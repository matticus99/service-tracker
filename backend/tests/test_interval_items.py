import pytest
from httpx import AsyncClient


class TestIntervalItemsCRUD:
    async def test_list_empty(self, client: AsyncClient, vehicle: dict):
        resp = await client.get(f"/api/v1/vehicles/{vehicle['id']}/interval-items")
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_create_regular(self, client: AsyncClient, vehicle: dict):
        resp = await client.post(f"/api/v1/vehicles/{vehicle['id']}/interval-items", json={
            "name": "Oil Change",
            "type": "regular",
            "last_service_date": "2025-11-29",
            "last_service_miles": 188321,
            "recommended_interval_miles": 5000,
            "next_service_miles": 193321,
            "due_soon_threshold_miles": 1000,
            "estimated_cost": 65.0,
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Oil Change"
        assert data["type"] == "regular"
        assert data["status"] is not None

    async def test_create_ad_hoc(self, client: AsyncClient, vehicle: dict):
        resp = await client.post(f"/api/v1/vehicles/{vehicle['id']}/interval-items", json={
            "name": "Serpentine Belt",
            "type": "ad_hoc",
            "estimated_cost": 45.0,
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["type"] == "ad_hoc"
        assert data["status"] == "ad_hoc"
        assert data["next_service_miles"] is None

    async def test_get(self, client: AsyncClient, vehicle: dict):
        create_resp = await client.post(f"/api/v1/vehicles/{vehicle['id']}/interval-items", json={
            "name": "Spark Plugs",
            "type": "regular",
            "recommended_interval_miles": 30000,
            "next_service_miles": 200000,
            "estimated_cost": 85.0,
        })
        item_id = create_resp.json()["id"]

        resp = await client.get(f"/api/v1/vehicles/{vehicle['id']}/interval-items/{item_id}")
        assert resp.status_code == 200
        assert resp.json()["name"] == "Spark Plugs"

    async def test_update(self, client: AsyncClient, vehicle: dict):
        create_resp = await client.post(f"/api/v1/vehicles/{vehicle['id']}/interval-items", json={
            "name": "Spark Plugs",
            "type": "regular",
            "estimated_cost": 85.0,
        })
        item_id = create_resp.json()["id"]

        resp = await client.patch(
            f"/api/v1/vehicles/{vehicle['id']}/interval-items/{item_id}",
            json={"estimated_cost": 95.0, "notes": "NGK Iridium"},
        )
        assert resp.status_code == 200
        assert resp.json()["estimated_cost"] == 95.0
        assert resp.json()["notes"] == "NGK Iridium"

    async def test_delete(self, client: AsyncClient, vehicle: dict):
        create_resp = await client.post(f"/api/v1/vehicles/{vehicle['id']}/interval-items", json={
            "name": "Test Item",
            "type": "regular",
        })
        item_id = create_resp.json()["id"]

        resp = await client.delete(f"/api/v1/vehicles/{vehicle['id']}/interval-items/{item_id}")
        assert resp.status_code == 204

        resp = await client.get(f"/api/v1/vehicles/{vehicle['id']}/interval-items/{item_id}")
        assert resp.status_code == 404


class TestStatusComputation:
    """Test that interval item status is correctly computed based on current mileage."""

    async def test_status_ok(self, client: AsyncClient, vehicle: dict):
        """Item with next_service_miles well ahead of current mileage should be 'ok'."""
        resp = await client.post(f"/api/v1/vehicles/{vehicle['id']}/interval-items", json={
            "name": "Differential Fluid",
            "type": "regular",
            "next_service_miles": 205000,  # well ahead of 191083
            "due_soon_threshold_miles": 500,
            "estimated_cost": 90.0,
        })
        data = resp.json()
        assert data["status"] == "ok"
        assert data["miles_remaining"] == 205000 - 191083

    async def test_status_due_soon(self, client: AsyncClient, vehicle: dict):
        """Item within threshold should be 'due_soon'."""
        resp = await client.post(f"/api/v1/vehicles/{vehicle['id']}/interval-items", json={
            "name": "Oil Change",
            "type": "regular",
            "next_service_miles": 191500,  # only 417 miles ahead with 500 threshold
            "due_soon_threshold_miles": 500,
        })
        data = resp.json()
        assert data["status"] == "due_soon"
        assert data["miles_remaining"] == 417

    async def test_status_overdue(self, client: AsyncClient, vehicle: dict):
        """Item past due should be 'overdue'."""
        resp = await client.post(f"/api/v1/vehicles/{vehicle['id']}/interval-items", json={
            "name": "Spark Plugs",
            "type": "regular",
            "next_service_miles": 188200,  # behind current 191083
            "due_soon_threshold_miles": 500,
        })
        data = resp.json()
        assert data["status"] == "overdue"
        assert data["miles_remaining"] == 188200 - 191083  # negative

    async def test_status_ad_hoc_unscheduled(self, client: AsyncClient, vehicle: dict):
        """Unscheduled ad-hoc items should have status 'ad_hoc'."""
        resp = await client.post(f"/api/v1/vehicles/{vehicle['id']}/interval-items", json={
            "name": "Serpentine Belt",
            "type": "ad_hoc",
        })
        data = resp.json()
        assert data["status"] == "ad_hoc"
        assert data["miles_remaining"] is None

    async def test_status_ad_hoc_scheduled(self, client: AsyncClient, vehicle: dict):
        """Scheduled ad-hoc items should compute status from target_miles."""
        resp = await client.post(f"/api/v1/vehicles/{vehicle['id']}/interval-items", json={
            "name": "Battery Replacement",
            "type": "ad_hoc",
            "target_miles": 200000,
            "due_soon_threshold_miles": 1000,
        })
        data = resp.json()
        assert data["status"] == "ok"
        assert data["miles_remaining"] == 200000 - 191083


class TestMarkServiced:
    async def test_mark_regular_item_serviced(self, client: AsyncClient, vehicle: dict):
        """Mark-serviced should recalculate next_service_miles for regular items."""
        create_resp = await client.post(f"/api/v1/vehicles/{vehicle['id']}/interval-items", json={
            "name": "Oil Change",
            "type": "regular",
            "recommended_interval_miles": 5000,
            "next_service_miles": 188000,
        })
        item_id = create_resp.json()["id"]

        resp = await client.post(
            f"/api/v1/vehicles/{vehicle['id']}/interval-items/{item_id}/mark-serviced",
            json={"service_date": "2026-03-01", "odometer": 191500},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["last_service_date"] == "2026-03-01"
        assert data["last_service_miles"] == 191500
        assert data["next_service_miles"] == 196500  # 191500 + 5000

    async def test_mark_serviced_updates_vehicle_mileage(self, client: AsyncClient, vehicle: dict):
        """Mark-serviced should update vehicle mileage if odometer is higher."""
        create_resp = await client.post(f"/api/v1/vehicles/{vehicle['id']}/interval-items", json={
            "name": "Brakes",
            "type": "regular",
            "recommended_interval_miles": 30000,
        })
        item_id = create_resp.json()["id"]

        new_odometer = vehicle["current_mileage"] + 1000
        await client.post(
            f"/api/v1/vehicles/{vehicle['id']}/interval-items/{item_id}/mark-serviced",
            json={"service_date": "2026-03-01", "odometer": new_odometer},
        )

        resp = await client.get(f"/api/v1/vehicles/{vehicle['id']}")
        assert resp.json()["current_mileage"] == new_odometer

    async def test_mark_ad_hoc_serviced_clears_targets(self, client: AsyncClient, vehicle: dict):
        """Mark-serviced on ad-hoc should clear target_date and target_miles."""
        create_resp = await client.post(f"/api/v1/vehicles/{vehicle['id']}/interval-items", json={
            "name": "Battery",
            "type": "ad_hoc",
            "target_miles": 200000,
            "target_date": "2027-01-01",
        })
        item_id = create_resp.json()["id"]

        resp = await client.post(
            f"/api/v1/vehicles/{vehicle['id']}/interval-items/{item_id}/mark-serviced",
            json={"service_date": "2026-03-01", "odometer": 191500},
        )
        data = resp.json()
        assert data["target_miles"] is None
        assert data["target_date"] is None
        assert data["last_service_miles"] == 191500
