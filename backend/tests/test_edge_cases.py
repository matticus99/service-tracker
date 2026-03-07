"""Edge case tests for existing endpoints that weren't covered by the original test suite."""
from httpx import AsyncClient


class TestVehicleEdgeCases:
    async def test_create_missing_required_fields(self, client: AsyncClient):
        """POST with missing required fields returns 422."""
        resp = await client.post("/api/v1/vehicles", json={})
        assert resp.status_code == 422

    async def test_create_minimal_fields_defaults(self, client: AsyncClient):
        """POST with only required fields gets correct defaults."""
        resp = await client.post("/api/v1/vehicles", json={
            "year": 2022, "make": "Ford", "model": "F-150",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["current_mileage"] == 0
        assert data["trim"] is None
        assert data["color"] is None
        assert data["vin"] is None

    async def test_update_mileage_nonexistent_vehicle(self, client: AsyncClient):
        resp = await client.patch(
            "/api/v1/vehicles/00000000-0000-0000-0000-000000000000/mileage",
            json={"current_mileage": 100000},
        )
        assert resp.status_code == 404

    async def test_delete_vehicle_cascades_related_data(self, client: AsyncClient, vehicle: dict):
        """Deleting a vehicle should cascade-delete its oil changes and interval items."""
        vid = vehicle["id"]
        await client.post(f"/api/v1/vehicles/{vid}/oil-changes", json={
            "service_date": "2025-06-01", "facility": "Shop", "odometer": 190000,
        })
        await client.post(f"/api/v1/vehicles/{vid}/interval-items", json={
            "name": "Test Item", "type": "regular", "next_service_miles": 200000,
        })
        await client.post(f"/api/v1/vehicles/{vid}/observations", json={
            "observation_date": "2025-06-01", "observation": "Test note",
        })

        # Delete vehicle
        resp = await client.delete(f"/api/v1/vehicles/{vid}")
        assert resp.status_code == 204

        # Verify related data is gone
        resp = await client.get(f"/api/v1/vehicles/{vid}/oil-changes")
        assert resp.status_code == 404

        resp = await client.get(f"/api/v1/vehicles/{vid}/interval-items")
        assert resp.status_code == 404


class TestDashboardEdgeCases:
    async def test_dashboard_with_oil_changes_but_no_interval_items(
        self, client: AsyncClient, vehicle: dict
    ):
        """Dashboard should still work with oil changes but zero interval items."""
        await client.post(f"/api/v1/vehicles/{vehicle['id']}/oil-changes", json={
            "service_date": "2025-06-01", "facility": "Take 5", "odometer": 183000,
        })
        await client.post(f"/api/v1/vehicles/{vehicle['id']}/oil-changes", json={
            "service_date": "2025-11-29", "facility": "Take 5", "odometer": 188000,
        })

        resp = await client.get(f"/api/v1/vehicles/{vehicle['id']}/dashboard")
        assert resp.status_code == 200
        data = resp.json()
        assert data["overdue_items"] == []
        assert data["due_soon_items"] == []
        assert data["mileage_stats"]["data_points"] == 2
        assert data["cost_summary"]["subtotal"] == 0
        assert data["cost_summary"]["overdue_count"] == 0
        assert data["cost_summary"]["due_soon_count"] == 0

    async def test_dashboard_mileage_stats_single_data_point(
        self, client: AsyncClient, vehicle: dict
    ):
        """Mileage stats with only 1 oil change should return zeros for rates."""
        await client.post(f"/api/v1/vehicles/{vehicle['id']}/oil-changes", json={
            "service_date": "2025-06-01", "facility": "Take 5", "odometer": 183000,
        })

        resp = await client.get(f"/api/v1/vehicles/{vehicle['id']}/dashboard")
        assert resp.status_code == 200
        stats = resp.json()["mileage_stats"]
        assert stats["data_points"] == 1
        assert stats["daily"] == 0
        assert stats["weekly"] == 0
        assert stats["monthly"] == 0


class TestIntervalItemEdgeCases:
    async def test_create_missing_name_returns_422(self, client: AsyncClient, vehicle: dict):
        resp = await client.post(
            f"/api/v1/vehicles/{vehicle['id']}/interval-items",
            json={"type": "regular", "next_service_miles": 200000},
        )
        assert resp.status_code == 422

    async def test_mark_serviced_nonexistent_item(self, client: AsyncClient, vehicle: dict):
        resp = await client.post(
            f"/api/v1/vehicles/{vehicle['id']}/interval-items/00000000-0000-0000-0000-000000000000/mark-serviced",
            json={"service_date": "2025-12-01", "odometer": 195000},
        )
        assert resp.status_code == 404
