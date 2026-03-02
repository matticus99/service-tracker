import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Vehicle, ServiceRecord
from app.schemas.service_record import ServiceRecordCreate, ServiceRecordUpdate, ServiceRecordOut

router = APIRouter()


async def _get_vehicle(vehicle_id: uuid.UUID, db: AsyncSession) -> Vehicle:
    vehicle = await db.get(Vehicle, vehicle_id)
    if not vehicle:
        raise HTTPException(404, "Vehicle not found")
    return vehicle


@router.get("/{vehicle_id}/service-records", response_model=list[ServiceRecordOut])
async def list_service_records(vehicle_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    await _get_vehicle(vehicle_id, db)
    result = await db.execute(
        select(ServiceRecord)
        .where(ServiceRecord.vehicle_id == vehicle_id)
        .order_by(ServiceRecord.service_date.desc())
    )
    return result.scalars().all()


@router.post("/{vehicle_id}/service-records", response_model=ServiceRecordOut, status_code=201)
async def create_service_record(vehicle_id: uuid.UUID, data: ServiceRecordCreate, db: AsyncSession = Depends(get_db)):
    vehicle = await _get_vehicle(vehicle_id, db)
    record = ServiceRecord(vehicle_id=vehicle_id, **data.model_dump())
    db.add(record)

    # Update vehicle mileage if this reading is higher
    if record.odometer and record.odometer > vehicle.current_mileage:
        vehicle.current_mileage = record.odometer

    await db.commit()
    await db.refresh(record)
    return record


@router.get("/{vehicle_id}/service-records/{record_id}", response_model=ServiceRecordOut)
async def get_service_record(vehicle_id: uuid.UUID, record_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    await _get_vehicle(vehicle_id, db)
    record = await db.get(ServiceRecord, record_id)
    if not record or record.vehicle_id != vehicle_id:
        raise HTTPException(404, "Service record not found")
    return record


@router.patch("/{vehicle_id}/service-records/{record_id}", response_model=ServiceRecordOut)
async def update_service_record(
    vehicle_id: uuid.UUID, record_id: uuid.UUID, data: ServiceRecordUpdate, db: AsyncSession = Depends(get_db)
):
    await _get_vehicle(vehicle_id, db)
    record = await db.get(ServiceRecord, record_id)
    if not record or record.vehicle_id != vehicle_id:
        raise HTTPException(404, "Service record not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(record, key, value)
    await db.commit()
    await db.refresh(record)
    return record


@router.delete("/{vehicle_id}/service-records/{record_id}", status_code=204)
async def delete_service_record(vehicle_id: uuid.UUID, record_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    await _get_vehicle(vehicle_id, db)
    record = await db.get(ServiceRecord, record_id)
    if not record or record.vehicle_id != vehicle_id:
        raise HTTPException(404, "Service record not found")
    await db.delete(record)
    await db.commit()
