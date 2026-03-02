import pytest
from httpx import AsyncClient


class TestListVehicles:
    async def test_empty_list(self, client: AsyncClient):
        resp = await client.get("/api/v1/vehicles")
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_list_with_vehicle(self, client: AsyncClient, vehicle: dict):
        resp = await client.get("/api/v1/vehicles")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["make"] == "Toyota"


class TestCreateVehicle:
    async def test_create(self, client: AsyncClient):
        resp = await client.post("/api/v1/vehicles", json={
            "year": 2020,
            "make": "Honda",
            "model": "Civic",
            "current_mileage": 50000,
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["year"] == 2020
        assert data["make"] == "Honda"
        assert data["model"] == "Civic"
        assert data["current_mileage"] == 50000
        assert "id" in data

    async def test_create_with_all_fields(self, client: AsyncClient):
        resp = await client.post("/api/v1/vehicles", json={
            "year": 2016,
            "make": "Toyota",
            "model": "Tacoma",
            "trim": "SR5",
            "color": "White",
            "vin": "1ABCDE12345678901",
            "current_mileage": 100000,
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["trim"] == "SR5"
        assert data["color"] == "White"
        assert data["vin"] == "1ABCDE12345678901"


class TestGetVehicle:
    async def test_get_existing(self, client: AsyncClient, vehicle: dict):
        resp = await client.get(f"/api/v1/vehicles/{vehicle['id']}")
        assert resp.status_code == 200
        assert resp.json()["make"] == "Toyota"

    async def test_get_nonexistent(self, client: AsyncClient):
        resp = await client.get("/api/v1/vehicles/00000000-0000-0000-0000-000000000000")
        assert resp.status_code == 404


class TestUpdateVehicle:
    async def test_partial_update(self, client: AsyncClient, vehicle: dict):
        resp = await client.patch(f"/api/v1/vehicles/{vehicle['id']}", json={"color": "Blue"})
        assert resp.status_code == 200
        assert resp.json()["color"] == "Blue"
        assert resp.json()["make"] == "Toyota"  # unchanged

    async def test_update_nonexistent(self, client: AsyncClient):
        resp = await client.patch(
            "/api/v1/vehicles/00000000-0000-0000-0000-000000000000",
            json={"color": "Red"},
        )
        assert resp.status_code == 404


class TestUpdateMileage:
    async def test_update_mileage(self, client: AsyncClient, vehicle: dict):
        resp = await client.patch(
            f"/api/v1/vehicles/{vehicle['id']}/mileage",
            json={"current_mileage": 195000},
        )
        assert resp.status_code == 200
        assert resp.json()["current_mileage"] == 195000


class TestDeleteVehicle:
    async def test_delete(self, client: AsyncClient, vehicle: dict):
        resp = await client.delete(f"/api/v1/vehicles/{vehicle['id']}")
        assert resp.status_code == 204

        resp = await client.get(f"/api/v1/vehicles/{vehicle['id']}")
        assert resp.status_code == 404

    async def test_delete_nonexistent(self, client: AsyncClient):
        resp = await client.delete("/api/v1/vehicles/00000000-0000-0000-0000-000000000000")
        assert resp.status_code == 404
