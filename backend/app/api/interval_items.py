import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Vehicle, IntervalItem
from app.models.interval_item import IntervalItemType
from app.schemas.interval_item import IntervalItemCreate, IntervalItemUpdate, IntervalItemOut, MarkServicedRequest

router = APIRouter()


def _compute_status(item: IntervalItem, current_mileage: int) -> tuple[str, int | None]:
    """Compute status and miles_remaining for an interval item."""
    if item.type == IntervalItemType.AD_HOC:
        # Check if scheduled
        if item.target_miles is not None:
            remaining = item.target_miles - current_mileage
            threshold = item.due_soon_threshold_miles
            if remaining <= 0:
                return "overdue", remaining
            elif remaining <= threshold:
                return "due_soon", remaining
            else:
                return "ok", remaining
        return "ad_hoc", None

    if item.next_service_miles is None:
        return "ok", None

    remaining = item.next_service_miles - current_mileage
    threshold = item.due_soon_threshold_miles

    if remaining <= 0:
        return "overdue", remaining
    elif remaining <= threshold:
        return "due_soon", remaining
    else:
        return "ok", remaining


async def _get_vehicle(vehicle_id: uuid.UUID, db: AsyncSession) -> Vehicle:
    vehicle = await db.get(Vehicle, vehicle_id)
    if not vehicle:
        raise HTTPException(404, "Vehicle not found")
    return vehicle


def _item_to_out(item: IntervalItem, current_mileage: int) -> IntervalItemOut:
    status, miles_remaining = _compute_status(item, current_mileage)
    out = IntervalItemOut.model_validate(item)
    out.status = status
    out.miles_remaining = miles_remaining
    return out


@router.get("/{vehicle_id}/interval-items", response_model=list[IntervalItemOut])
async def list_interval_items(vehicle_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    vehicle = await _get_vehicle(vehicle_id, db)
    result = await db.execute(
        select(IntervalItem)
        .where(IntervalItem.vehicle_id == vehicle_id)
        .order_by(IntervalItem.name)
    )
    items = result.scalars().all()
    return [_item_to_out(item, vehicle.current_mileage) for item in items]


@router.post("/{vehicle_id}/interval-items", response_model=IntervalItemOut, status_code=201)
async def create_interval_item(vehicle_id: uuid.UUID, data: IntervalItemCreate, db: AsyncSession = Depends(get_db)):
    vehicle = await _get_vehicle(vehicle_id, db)
    item = IntervalItem(vehicle_id=vehicle_id, **data.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return _item_to_out(item, vehicle.current_mileage)


@router.get("/{vehicle_id}/interval-items/{item_id}", response_model=IntervalItemOut)
async def get_interval_item(vehicle_id: uuid.UUID, item_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    vehicle = await _get_vehicle(vehicle_id, db)
    item = await db.get(IntervalItem, item_id)
    if not item or item.vehicle_id != vehicle_id:
        raise HTTPException(404, "Interval item not found")
    return _item_to_out(item, vehicle.current_mileage)


@router.patch("/{vehicle_id}/interval-items/{item_id}", response_model=IntervalItemOut)
async def update_interval_item(
    vehicle_id: uuid.UUID, item_id: uuid.UUID, data: IntervalItemUpdate, db: AsyncSession = Depends(get_db)
):
    vehicle = await _get_vehicle(vehicle_id, db)
    item = await db.get(IntervalItem, item_id)
    if not item or item.vehicle_id != vehicle_id:
        raise HTTPException(404, "Interval item not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    await db.commit()
    await db.refresh(item)
    return _item_to_out(item, vehicle.current_mileage)


@router.post("/{vehicle_id}/interval-items/{item_id}/mark-serviced", response_model=IntervalItemOut)
async def mark_serviced(
    vehicle_id: uuid.UUID, item_id: uuid.UUID, data: MarkServicedRequest, db: AsyncSession = Depends(get_db)
):
    vehicle = await _get_vehicle(vehicle_id, db)
    item = await db.get(IntervalItem, item_id)
    if not item or item.vehicle_id != vehicle_id:
        raise HTTPException(404, "Interval item not found")

    item.last_service_date = data.service_date
    item.last_service_miles = data.odometer

    if item.type == IntervalItemType.REGULAR and item.recommended_interval_miles:
        item.next_service_miles = data.odometer + item.recommended_interval_miles
    elif item.type == IntervalItemType.AD_HOC:
        # Clear one-time targets after servicing
        item.target_date = None
        item.target_miles = None

    # Update vehicle mileage if higher
    if data.odometer > vehicle.current_mileage:
        vehicle.current_mileage = data.odometer

    await db.commit()
    await db.refresh(item)
    return _item_to_out(item, vehicle.current_mileage)


@router.delete("/{vehicle_id}/interval-items/{item_id}", status_code=204)
async def delete_interval_item(vehicle_id: uuid.UUID, item_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    await _get_vehicle(vehicle_id, db)
    item = await db.get(IntervalItem, item_id)
    if not item or item.vehicle_id != vehicle_id:
        raise HTTPException(404, "Interval item not found")
    await db.delete(item)
    await db.commit()
