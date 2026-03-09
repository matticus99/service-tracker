import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Vehicle, ServiceRecord, ServiceRecordItem, NoteServiceLink, Observation
from app.schemas.service_record import ServiceRecordCreate, ServiceRecordUpdate, ServiceRecordOut
from app.schemas.note_service_link import LinkOut

router = APIRouter()

_EAGER_LOADS = (selectinload(ServiceRecord.items), selectinload(ServiceRecord.note_service_links))


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
        .options(*_EAGER_LOADS)
        .order_by(ServiceRecord.service_date.desc())
    )
    records = result.scalars().unique().all()
    return [ServiceRecordOut.from_record(r) for r in records]


@router.post("/{vehicle_id}/service-records", response_model=ServiceRecordOut, status_code=201)
async def create_service_record(vehicle_id: uuid.UUID, data: ServiceRecordCreate, db: AsyncSession = Depends(get_db)):
    vehicle = await _get_vehicle(vehicle_id, db)

    record_data = data.model_dump(exclude={"items"})
    record = ServiceRecord(vehicle_id=vehicle_id, **record_data)
    db.add(record)
    await db.flush()

    # Create service_record_items if provided
    if data.items:
        for item_data in data.items:
            item = ServiceRecordItem(
                service_record_id=record.id,
                **item_data.model_dump(),
            )
            db.add(item)

    # Update vehicle mileage if this reading is higher
    if record.odometer and record.odometer > vehicle.current_mileage:
        vehicle.current_mileage = record.odometer

    await db.commit()

    # Re-fetch with eager loads
    result = await db.execute(
        select(ServiceRecord)
        .where(ServiceRecord.id == record.id)
        .options(*_EAGER_LOADS)
    )
    return ServiceRecordOut.from_record(result.scalar_one())


@router.get("/{vehicle_id}/service-records/{record_id}", response_model=ServiceRecordOut)
async def get_service_record(vehicle_id: uuid.UUID, record_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    await _get_vehicle(vehicle_id, db)
    result = await db.execute(
        select(ServiceRecord)
        .where(ServiceRecord.id == record_id, ServiceRecord.vehicle_id == vehicle_id)
        .options(*_EAGER_LOADS)
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(404, "Service record not found")
    return ServiceRecordOut.from_record(record)


@router.patch("/{vehicle_id}/service-records/{record_id}", response_model=ServiceRecordOut)
async def update_service_record(
    vehicle_id: uuid.UUID, record_id: uuid.UUID, data: ServiceRecordUpdate, db: AsyncSession = Depends(get_db)
):
    await _get_vehicle(vehicle_id, db)
    result = await db.execute(
        select(ServiceRecord)
        .where(ServiceRecord.id == record_id, ServiceRecord.vehicle_id == vehicle_id)
        .options(*_EAGER_LOADS)
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(404, "Service record not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(record, key, value)
    await db.commit()
    await db.refresh(record)
    return ServiceRecordOut.from_record(record)


@router.delete("/{vehicle_id}/service-records/{record_id}", status_code=204)
async def delete_service_record(vehicle_id: uuid.UUID, record_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    await _get_vehicle(vehicle_id, db)
    record = await db.get(ServiceRecord, record_id)
    if not record or record.vehicle_id != vehicle_id:
        raise HTTPException(404, "Service record not found")
    await db.delete(record)
    await db.commit()


@router.post("/{vehicle_id}/service-records/{record_id}/links", response_model=LinkOut, status_code=201)
async def link_service_record_to_observation(
    vehicle_id: uuid.UUID, record_id: uuid.UUID, observation_id: uuid.UUID, db: AsyncSession = Depends(get_db)
):
    await _get_vehicle(vehicle_id, db)
    record = await db.get(ServiceRecord, record_id)
    if not record or record.vehicle_id != vehicle_id:
        raise HTTPException(404, "Service record not found")

    obs = await db.get(Observation, observation_id)
    if not obs or obs.vehicle_id != vehicle_id:
        raise HTTPException(404, "Observation not found")

    # Check for existing link
    existing = await db.execute(
        select(NoteServiceLink).where(
            NoteServiceLink.observation_id == observation_id,
            NoteServiceLink.service_record_id == record_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(409, "Link already exists")

    link = NoteServiceLink(observation_id=observation_id, service_record_id=record_id)
    db.add(link)
    await db.commit()
    await db.refresh(link)
    return link


@router.delete("/{vehicle_id}/service-records/{record_id}/links/{link_id}", status_code=204)
async def unlink_service_record(
    vehicle_id: uuid.UUID, record_id: uuid.UUID, link_id: uuid.UUID, db: AsyncSession = Depends(get_db)
):
    await _get_vehicle(vehicle_id, db)
    link = await db.get(NoteServiceLink, link_id)
    if not link or link.service_record_id != record_id:
        raise HTTPException(404, "Link not found")
    await db.delete(link)
    await db.commit()
