import pytest
from httpx import AsyncClient


class TestDashboard:
    async def test_empty_dashboard(self, client: AsyncClient, vehicle: dict):
        resp = await client.get(f"/api/v1/vehicles/{vehicle['id']}/dashboard")
        assert resp.status_code == 200
        data = resp.json()
        assert data["vehicle"]["id"] == vehicle["id"]
        assert data["overdue_items"] == []
        assert data["due_soon_items"] == []
        assert data["mileage_stats"]["data_points"] == 0

    async def test_dashboard_with_overdue_item(self, client: AsyncClient, vehicle: dict):
        # Create an overdue interval item
        await client.post(f"/api/v1/vehicles/{vehicle['id']}/interval-items", json={
            "name": "Spark Plugs",
            "type": "regular",
            "next_service_miles": 188200,  # behind 191083
            "due_soon_threshold_miles": 500,
            "estimated_cost": 85.0,
        })

        resp = await client.get(f"/api/v1/vehicles/{vehicle['id']}/dashboard")
        data = resp.json()
        assert len(data["overdue_items"]) == 1
        assert data["overdue_items"][0]["name"] == "Spark Plugs"
        assert data["cost_summary"]["overdue_count"] == 1
        assert data["cost_summary"]["overdue_total"] == 85.0

    async def test_dashboard_with_due_soon_item(self, client: AsyncClient, vehicle: dict):
        await client.post(f"/api/v1/vehicles/{vehicle['id']}/interval-items", json={
            "name": "Oil Change",
            "type": "regular",
            "next_service_miles": 191500,  # 417 miles ahead, within 1000 threshold
            "due_soon_threshold_miles": 1000,
            "estimated_cost": 65.0,
        })

        resp = await client.get(f"/api/v1/vehicles/{vehicle['id']}/dashboard")
        data = resp.json()
        assert len(data["due_soon_items"]) == 1
        assert data["cost_summary"]["due_soon_count"] == 1

    async def test_dashboard_cost_summary(self, client: AsyncClient, vehicle: dict):
        """Cost summary should include shop fee and tax."""
        # Overdue item: $85
        await client.post(f"/api/v1/vehicles/{vehicle['id']}/interval-items", json={
            "name": "Spark Plugs", "type": "regular",
            "next_service_miles": 188200, "due_soon_threshold_miles": 500,
            "estimated_cost": 85.0,
        })
        # Due soon item: $65
        await client.post(f"/api/v1/vehicles/{vehicle['id']}/interval-items", json={
            "name": "Oil Change", "type": "regular",
            "next_service_miles": 191500, "due_soon_threshold_miles": 1000,
            "estimated_cost": 65.0,
        })

        resp = await client.get(f"/api/v1/vehicles/{vehicle['id']}/dashboard")
        cost = resp.json()["cost_summary"]
        assert cost["overdue_total"] == 85.0
        assert cost["due_soon_total"] == 65.0
        assert cost["subtotal"] == 150.0
        assert cost["shop_fee"] == 40.0
        # Tax = (150 + 40) * 0.07 = 13.3
        assert cost["tax"] == 13.3
        assert cost["total"] == 203.3

    async def test_dashboard_mileage_stats(self, client: AsyncClient, vehicle: dict):
        """Mileage stats should be calculated from oil change history."""
        # Create two oil changes 181 days apart, 5000 miles
        await client.post(f"/api/v1/vehicles/{vehicle['id']}/oil-changes", json={
            "service_date": "2025-06-01", "facility": "Take 5", "odometer": 183000,
        })
        await client.post(f"/api/v1/vehicles/{vehicle['id']}/oil-changes", json={
            "service_date": "2025-11-29", "facility": "Take 5", "odometer": 188000,
        })

        resp = await client.get(f"/api/v1/vehicles/{vehicle['id']}/dashboard")
        stats = resp.json()["mileage_stats"]
        assert stats["data_points"] == 2
        assert stats["daily"] > 0
        assert stats["weekly"] > 0
        assert stats["monthly"] > 0

    async def test_dashboard_next_oil_change(self, client: AsyncClient, vehicle: dict):
        """Next oil change should link to the oil change interval item."""
        await client.post(f"/api/v1/vehicles/{vehicle['id']}/oil-changes", json={
            "service_date": "2025-11-29", "facility": "Take 5", "odometer": 188321,
        })
        await client.post(f"/api/v1/vehicles/{vehicle['id']}/interval-items", json={
            "name": "Oil Change", "type": "regular",
            "recommended_interval_miles": 5000, "next_service_miles": 193321,
        })

        resp = await client.get(f"/api/v1/vehicles/{vehicle['id']}/dashboard")
        noc = resp.json()["next_oil_change"]
        assert noc["due_at_miles"] == 193321
        assert noc["miles_remaining"] == 193321 - vehicle["current_mileage"]
        assert noc["last_date"] == "2025-11-29"
        assert noc["last_facility"] == "Take 5"

    async def test_dashboard_vehicle_not_found(self, client: AsyncClient):
        resp = await client.get("/api/v1/vehicles/00000000-0000-0000-0000-000000000000/dashboard")
        assert resp.status_code == 404
