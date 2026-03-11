import uuid

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Vehicle, OilChange
from app.schemas.oil_change import OilChangeCreate, OilChangeUpdate, OilChangeOut

router = APIRouter()

DEPRECATION_HEADER = "Oil change endpoints are deprecated. Use service records with 'Oil & Filter Change' service instead."


def _add_deprecation_headers(response: Response):
    response.headers["Deprecation"] = "true"
    response.headers["X-Deprecation-Notice"] = DEPRECATION_HEADER


async def _get_vehicle(vehicle_id: uuid.UUID, db: AsyncSession) -> Vehicle:
    vehicle = await db.get(Vehicle, vehicle_id)
    if not vehicle:
        raise HTTPException(404, "Vehicle not found")
    return vehicle


def _calculate_intervals(new_oc: OilChange, prev_oc: OilChange | None):
    """Calculate miles and months since previous oil change."""
    if prev_oc:
        new_oc.interval_miles = new_oc.odometer - prev_oc.odometer
        delta = new_oc.service_date - prev_oc.service_date
        new_oc.interval_months = round(delta.days / 30.44, 1)


@router.get("/{vehicle_id}/oil-changes", response_model=list[OilChangeOut])
async def list_oil_changes(vehicle_id: uuid.UUID, response: Response, db: AsyncSession = Depends(get_db)):
    _add_deprecation_headers(response)
    await _get_vehicle(vehicle_id, db)
    result = await db.execute(
        select(OilChange)
        .where(OilChange.vehicle_id == vehicle_id)
        .order_by(OilChange.service_date.desc())
    )
    return result.scalars().all()


@router.post("/{vehicle_id}/oil-changes", response_model=OilChangeOut, status_code=201)
async def create_oil_change(vehicle_id: uuid.UUID, data: OilChangeCreate, response: Response, db: AsyncSession = Depends(get_db)):
    _add_deprecation_headers(response)
    vehicle = await _get_vehicle(vehicle_id, db)

    oil_change = OilChange(vehicle_id=vehicle_id, **data.model_dump())

    # Find previous oil change to calculate interval
    result = await db.execute(
        select(OilChange)
        .where(OilChange.vehicle_id == vehicle_id, OilChange.service_date < data.service_date)
        .order_by(OilChange.service_date.desc())
        .limit(1)
    )
    prev = result.scalar_one_or_none()
    _calculate_intervals(oil_change, prev)

    db.add(oil_change)

    # Update vehicle mileage if this reading is higher
    if oil_change.odometer > vehicle.current_mileage:
        vehicle.current_mileage = oil_change.odometer

    await db.commit()
    await db.refresh(oil_change)
    return oil_change


@router.get("/{vehicle_id}/oil-changes/{oc_id}", response_model=OilChangeOut)
async def get_oil_change(vehicle_id: uuid.UUID, oc_id: uuid.UUID, response: Response, db: AsyncSession = Depends(get_db)):
    _add_deprecation_headers(response)
    await _get_vehicle(vehicle_id, db)
    oc = await db.get(OilChange, oc_id)
    if not oc or oc.vehicle_id != vehicle_id:
        raise HTTPException(404, "Oil change not found")
    return oc


@router.patch("/{vehicle_id}/oil-changes/{oc_id}", response_model=OilChangeOut)
async def update_oil_change(
    vehicle_id: uuid.UUID, oc_id: uuid.UUID, data: OilChangeUpdate, response: Response, db: AsyncSession = Depends(get_db)
):
    _add_deprecation_headers(response)
    await _get_vehicle(vehicle_id, db)
    oc = await db.get(OilChange, oc_id)
    if not oc or oc.vehicle_id != vehicle_id:
        raise HTTPException(404, "Oil change not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(oc, key, value)
    await db.commit()
    await db.refresh(oc)
    return oc


@router.delete("/{vehicle_id}/oil-changes/{oc_id}", status_code=204)
async def delete_oil_change(vehicle_id: uuid.UUID, oc_id: uuid.UUID, response: Response, db: AsyncSession = Depends(get_db)):
    _add_deprecation_headers(response)
    await _get_vehicle(vehicle_id, db)
    oc = await db.get(OilChange, oc_id)
    if not oc or oc.vehicle_id != vehicle_id:
        raise HTTPException(404, "Oil change not found")
    await db.delete(oc)
    await db.commit()
