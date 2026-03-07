from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.database import async_session
from app.models import AppSettings
from app.api.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure default settings row exists and VAPID keys are generated
    async with async_session() as session:
        result = await session.execute(select(AppSettings).where(AppSettings.id == 1))
        app_settings = result.scalar_one_or_none()
        if app_settings is None:
            app_settings = AppSettings(id=1, shop_fee=40.00, tax_rate=0.07)
            session.add(app_settings)
            await session.flush()

        # Auto-generate VAPID keys if not set
        if not app_settings.vapid_private_key:
            from app.services.vapid import generate_vapid_keys
            priv, pub = generate_vapid_keys()
            app_settings.vapid_private_key = priv
            app_settings.vapid_public_key = pub

        await session.commit()
    yield


app = FastAPI(
    title="Vehicle Service Tracker",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok"}
