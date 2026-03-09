import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Vehicle, IntervalItem, OilChange, ServiceRecord
from app.models.interval_item import IntervalItemType
from app.schemas.interval_item import IntervalItemCreate, IntervalItemUpdate, IntervalItemOut, MarkServicedRequest
from app.services.interval_status import compute_status, item_to_out

router = APIRouter()

# Keep module-level aliases for backward compatibility with dashboard import
_compute_status = compute_status
_item_to_out = item_to_out


async def _get_vehicle(vehicle_id: uuid.UUID, db: AsyncSession) -> Vehicle:
    vehicle = await db.get(Vehicle, vehicle_id)
    if not vehicle:
        raise HTTPException(404, "Vehicle not found")
    return vehicle


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


def _resolve_record_type(item: IntervalItem) -> str:
    """Determine which history record type to create for this interval item."""
    if item.record_type:
        return item.record_type
    # Auto-detect: if the name contains "oil", treat as oil change
    if "oil" in item.name.lower():
        return "oil_change"
    return "service_record"


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

    # Create a history record so the service appears on the History page
    record_type = _resolve_record_type(item)

    if record_type == "oil_change":
        oil_change = OilChange(
            vehicle_id=vehicle_id,
            service_date=data.service_date,
            facility=data.facility,
            odometer=data.odometer,
        )
        # Calculate interval from previous oil change
        result = await db.execute(
            select(OilChange)
            .where(OilChange.vehicle_id == vehicle_id, OilChange.service_date < data.service_date)
            .order_by(OilChange.service_date.desc())
            .limit(1)
        )
        prev = result.scalar_one_or_none()
        if prev:
            oil_change.interval_miles = oil_change.odometer - prev.odometer
            delta = oil_change.service_date - prev.service_date
            oil_change.interval_months = round(delta.days / 30.44, 1)
        db.add(oil_change)
    else:
        service_record = ServiceRecord(
            vehicle_id=vehicle_id,
            service_date=data.service_date,
            facility=data.facility,
            odometer=data.odometer,
            services_performed=[item.name],
        )
        db.add(service_record)

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
