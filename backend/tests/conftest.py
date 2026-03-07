import os

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://servicetracker:changeme@localhost:5433/servicetracker_test",
)

# Create test engine with NullPool to avoid asyncpg connection conflicts
test_engine = create_async_engine(TEST_DATABASE_URL, echo=False, poolclass=NullPool)
test_async_session = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

# Patch the database module BEFORE importing the app
import app.database as db_module
from app.database import Base

db_module.engine = test_engine
db_module.async_session = test_async_session

# Now import the app (it will use the patched engine/session)
from app.main import app  # noqa: E402
from app.models import AppSettings

# Track whether tables have been created
_tables_created = False



# Pre-generated test VAPID keys (avoids py_vapid/cryptography compatibility issues in tests)
TEST_VAPID_PRIVATE_KEY = "dGVzdC12YXBpZC1wcml2YXRlLWtleS0xMjM0NTY3OA"
TEST_VAPID_PUBLIC_KEY = "dGVzdC12YXBpZC1wdWJsaWMta2V5LTEyMzQ1Njc4OTAx"


async def _seed_defaults():
    """Seed default app_settings with test VAPID keys (mirrors app lifespan which doesn't run in tests)."""
    async with test_async_session() as session:
        session.add(AppSettings(
            id=1, shop_fee=40.00, tax_rate=0.07,
            vapid_private_key=TEST_VAPID_PRIVATE_KEY,
            vapid_public_key=TEST_VAPID_PUBLIC_KEY,
        ))
        await session.commit()


@pytest_asyncio.fixture(autouse=True)
async def setup_and_clean():
    """Create tables on first run, truncate before each test, then seed defaults."""
    global _tables_created
    if not _tables_created:
        async with test_engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)
        _tables_created = True
    else:
        async with test_engine.begin() as conn:
            for table in reversed(Base.metadata.sorted_tables):
                await conn.execute(text(f"TRUNCATE {table.name} CASCADE"))
    await _seed_defaults()
    yield


@pytest_asyncio.fixture
async def client(setup_and_clean):
    """Async HTTP client for testing FastAPI endpoints."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def vehicle(client) -> dict:
    """Create a test vehicle and return its data dict."""
    resp = await client.post("/api/v1/vehicles", json={
        "year": 2016,
        "make": "Toyota",
        "model": "Tacoma",
        "trim": "2WD Double Cab V6",
        "color": "Gray",
        "vin": "5TFAZ5CN4GX012345",
        "current_mileage": 191083,
    })
    assert resp.status_code == 201
    return resp.json()


PUSH_SUBSCRIPTION_DATA = {
    "endpoint": "https://fcm.googleapis.com/fcm/send/test-sub-123",
    "p256dh": "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls",
    "auth": "tBHItJI5svbpC7v",
    "device_label": "Test Chrome",
}


@pytest_asyncio.fixture
async def push_subscription(client, vehicle) -> dict:
    """Create a test push subscription and return its data dict."""
    resp = await client.post(
        f"/api/v1/vehicles/{vehicle['id']}/push-subscriptions",
        json=PUSH_SUBSCRIPTION_DATA,
    )
    assert resp.status_code == 201
    return resp.json()


@pytest_asyncio.fixture
async def interval_item_overdue(client, vehicle) -> dict:
    """Create an overdue interval item and return its data dict."""
    resp = await client.post(
        f"/api/v1/vehicles/{vehicle['id']}/interval-items",
        json={
            "name": "Oil Change",
            "type": "regular",
            "next_service_miles": 185000,  # below vehicle's 191083
            "estimated_cost": 65.0,
            "due_soon_threshold_miles": 500,
        },
    )
    assert resp.status_code == 201
    return resp.json()


@pytest_asyncio.fixture
async def service_record(client, vehicle) -> dict:
    """Create a test service record and return its data dict."""
    resp = await client.post(
        f"/api/v1/vehicles/{vehicle['id']}/service-records",
        json={
            "service_date": "2025-06-01",
            "facility": "DIY",
            "odometer": 190000,
            "services_performed": ["Brake inspection"],
        },
    )
    assert resp.status_code == 201
    return resp.json()


@pytest_asyncio.fixture
def uploads_dir(tmp_path):
    """Override UPLOADS_DIR to a temporary directory for attachment tests."""
    from app.config import settings
    original = settings.UPLOADS_DIR
    settings.UPLOADS_DIR = str(tmp_path)
    yield tmp_path
    settings.UPLOADS_DIR = original
