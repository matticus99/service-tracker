from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import AppSettings
from app.schemas.settings import SettingsUpdate, SettingsOut

router = APIRouter()


@router.get("", response_model=SettingsOut)
async def get_settings(db: AsyncSession = Depends(get_db)):
    settings = await db.get(AppSettings, 1)
    if not settings:
        raise HTTPException(404, "Settings not initialized")
    return settings


@router.patch("", response_model=SettingsOut)
async def update_settings(data: SettingsUpdate, db: AsyncSession = Depends(get_db)):
    settings = await db.get(AppSettings, 1)
    if not settings:
        raise HTTPException(404, "Settings not initialized")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(settings, key, value)
    await db.commit()
    await db.refresh(settings)
    return settings
