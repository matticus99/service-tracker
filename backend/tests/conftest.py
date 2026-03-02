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


async def _seed_defaults():
    """Seed default app_settings (mirrors app lifespan which doesn't run in tests)."""
    async with test_async_session() as session:
        session.add(AppSettings(id=1, shop_fee=40.00, tax_rate=0.07))
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
