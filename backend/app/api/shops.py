import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Shop
from app.schemas.shop import ShopCreate, ShopUpdate, ShopOut

router = APIRouter()


@router.get("/{vehicle_id}/shops", response_model=list[ShopOut])
async def list_shops(vehicle_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Shop)
        .where(Shop.vehicle_id == vehicle_id)
        .order_by(Shop.name)
    )
    return result.scalars().all()


@router.post("/{vehicle_id}/shops", response_model=ShopOut, status_code=201)
async def create_shop(
    vehicle_id: uuid.UUID,
    data: ShopCreate,
    db: AsyncSession = Depends(get_db),
):
    shop = Shop(vehicle_id=vehicle_id, **data.model_dump())
    db.add(shop)
    await db.commit()
    await db.refresh(shop)
    return shop


@router.get("/{vehicle_id}/shops/{shop_id}", response_model=ShopOut)
async def get_shop(
    vehicle_id: uuid.UUID,
    shop_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Shop).where(Shop.id == shop_id, Shop.vehicle_id == vehicle_id)
    )
    shop = result.scalar_one_or_none()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    return shop


@router.patch("/{vehicle_id}/shops/{shop_id}", response_model=ShopOut)
async def update_shop(
    vehicle_id: uuid.UUID,
    shop_id: uuid.UUID,
    data: ShopUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Shop).where(Shop.id == shop_id, Shop.vehicle_id == vehicle_id)
    )
    shop = result.scalar_one_or_none()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(shop, field, value)

    await db.commit()
    await db.refresh(shop)
    return shop


@router.delete("/{vehicle_id}/shops/{shop_id}", status_code=204)
async def delete_shop(
    vehicle_id: uuid.UUID,
    shop_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Shop).where(Shop.id == shop_id, Shop.vehicle_id == vehicle_id)
    )
    shop = result.scalar_one_or_none()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")

    await db.delete(shop)
    await db.commit()
