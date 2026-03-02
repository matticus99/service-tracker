import pytest
from httpx import AsyncClient


class TestObservations:
    async def test_list_empty(self, client: AsyncClient, vehicle: dict):
        resp = await client.get(f"/api/v1/vehicles/{vehicle['id']}/observations")
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_create(self, client: AsyncClient, vehicle: dict):
        resp = await client.post(f"/api/v1/vehicles/{vehicle['id']}/observations", json={
            "observation_date": "2025-10-15",
            "odometer": 186000,
            "observation": "Slight squeak from front brakes when cold",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["observation"] == "Slight squeak from front brakes when cold"
        assert data["resolved"] is False

    async def test_create_without_odometer(self, client: AsyncClient, vehicle: dict):
        resp = await client.post(f"/api/v1/vehicles/{vehicle['id']}/observations", json={
            "observation_date": "2025-10-15",
            "observation": "Noticed a rattle under the dash",
        })
        assert resp.status_code == 201
        assert resp.json()["odometer"] is None

    async def test_mark_resolved(self, client: AsyncClient, vehicle: dict):
        create_resp = await client.post(f"/api/v1/vehicles/{vehicle['id']}/observations", json={
            "observation_date": "2025-10-15",
            "observation": "Squeak from brakes",
        })
        obs_id = create_resp.json()["id"]

        resp = await client.patch(
            f"/api/v1/vehicles/{vehicle['id']}/observations/{obs_id}",
            json={"resolved": True, "resolved_date": "2025-11-01"},
        )
        assert resp.status_code == 200
        assert resp.json()["resolved"] is True
        assert resp.json()["resolved_date"] == "2025-11-01"

    async def test_filter_by_resolved(self, client: AsyncClient, vehicle: dict):
        # Create resolved observation
        await client.post(f"/api/v1/vehicles/{vehicle['id']}/observations", json={
            "observation_date": "2025-09-01",
            "observation": "Resolved issue",
            "resolved": True,
        })
        # Create unresolved observation
        await client.post(f"/api/v1/vehicles/{vehicle['id']}/observations", json={
            "observation_date": "2025-10-15",
            "observation": "Open issue",
        })

        # Filter unresolved
        resp = await client.get(f"/api/v1/vehicles/{vehicle['id']}/observations?resolved=false")
        data = resp.json()
        assert len(data) == 1
        assert data[0]["observation"] == "Open issue"

        # Filter resolved
        resp = await client.get(f"/api/v1/vehicles/{vehicle['id']}/observations?resolved=true")
        data = resp.json()
        assert len(data) == 1
        assert data[0]["observation"] == "Resolved issue"

    async def test_delete(self, client: AsyncClient, vehicle: dict):
        create_resp = await client.post(f"/api/v1/vehicles/{vehicle['id']}/observations", json={
            "observation_date": "2025-10-15",
            "observation": "Test observation",
        })
        obs_id = create_resp.json()["id"]

        resp = await client.delete(f"/api/v1/vehicles/{vehicle['id']}/observations/{obs_id}")
        assert resp.status_code == 204

        resp = await client.get(f"/api/v1/vehicles/{vehicle['id']}/observations/{obs_id}")
        assert resp.status_code == 404
