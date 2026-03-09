import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Vehicle, Observation, NoteServiceLink, ServiceRecord
from app.schemas.observation import ObservationCreate, ObservationUpdate, ObservationOut
from app.schemas.note_service_link import LinkOut

router = APIRouter()


async def _get_vehicle(vehicle_id: uuid.UUID, db: AsyncSession) -> Vehicle:
    vehicle = await db.get(Vehicle, vehicle_id)
    if not vehicle:
        raise HTTPException(404, "Vehicle not found")
    return vehicle


@router.get("/{vehicle_id}/observations", response_model=list[ObservationOut])
async def list_observations(
    vehicle_id: uuid.UUID,
    resolved: bool | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    await _get_vehicle(vehicle_id, db)
    query = (
        select(Observation)
        .where(Observation.vehicle_id == vehicle_id)
        .options(selectinload(Observation.note_service_links))
    )
    if resolved is not None:
        query = query.where(Observation.resolved == resolved)
    query = query.order_by(Observation.observation_date.desc())
    result = await db.execute(query)
    observations = result.scalars().unique().all()
    return [ObservationOut.from_observation(obs) for obs in observations]


@router.post("/{vehicle_id}/observations", response_model=ObservationOut, status_code=201)
async def create_observation(vehicle_id: uuid.UUID, data: ObservationCreate, db: AsyncSession = Depends(get_db)):
    await _get_vehicle(vehicle_id, db)
    obs = Observation(vehicle_id=vehicle_id, **data.model_dump())
    db.add(obs)
    await db.commit()
    await db.refresh(obs)
    return obs


@router.get("/{vehicle_id}/observations/{obs_id}", response_model=ObservationOut)
async def get_observation(vehicle_id: uuid.UUID, obs_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    await _get_vehicle(vehicle_id, db)
    result = await db.execute(
        select(Observation)
        .where(Observation.id == obs_id, Observation.vehicle_id == vehicle_id)
        .options(selectinload(Observation.note_service_links))
    )
    obs = result.scalar_one_or_none()
    if not obs:
        raise HTTPException(404, "Observation not found")
    return ObservationOut.from_observation(obs)


@router.patch("/{vehicle_id}/observations/{obs_id}", response_model=ObservationOut)
async def update_observation(
    vehicle_id: uuid.UUID, obs_id: uuid.UUID, data: ObservationUpdate, db: AsyncSession = Depends(get_db)
):
    await _get_vehicle(vehicle_id, db)
    obs = await db.get(Observation, obs_id)
    if not obs or obs.vehicle_id != vehicle_id:
        raise HTTPException(404, "Observation not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(obs, key, value)
    await db.commit()
    await db.refresh(obs)
    return obs


@router.delete("/{vehicle_id}/observations/{obs_id}", status_code=204)
async def delete_observation(vehicle_id: uuid.UUID, obs_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    await _get_vehicle(vehicle_id, db)
    obs = await db.get(Observation, obs_id)
    if not obs or obs.vehicle_id != vehicle_id:
        raise HTTPException(404, "Observation not found")
    await db.delete(obs)
    await db.commit()


@router.post("/{vehicle_id}/observations/{obs_id}/links", response_model=LinkOut, status_code=201)
async def link_observation_to_service_record(
    vehicle_id: uuid.UUID, obs_id: uuid.UUID, service_record_id: uuid.UUID, db: AsyncSession = Depends(get_db)
):
    await _get_vehicle(vehicle_id, db)
    obs = await db.get(Observation, obs_id)
    if not obs or obs.vehicle_id != vehicle_id:
        raise HTTPException(404, "Observation not found")

    record = await db.get(ServiceRecord, service_record_id)
    if not record or record.vehicle_id != vehicle_id:
        raise HTTPException(404, "Service record not found")

    # Check for existing link
    existing = await db.execute(
        select(NoteServiceLink).where(
            NoteServiceLink.observation_id == obs_id,
            NoteServiceLink.service_record_id == service_record_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(409, "Link already exists")

    link = NoteServiceLink(observation_id=obs_id, service_record_id=service_record_id)
    db.add(link)
    await db.commit()
    await db.refresh(link)
    return link


@router.delete("/{vehicle_id}/observations/{obs_id}/links/{link_id}", status_code=204)
async def unlink_observation(
    vehicle_id: uuid.UUID, obs_id: uuid.UUID, link_id: uuid.UUID, db: AsyncSession = Depends(get_db)
):
    await _get_vehicle(vehicle_id, db)
    link = await db.get(NoteServiceLink, link_id)
    if not link or link.observation_id != obs_id:
        raise HTTPException(404, "Link not found")
    await db.delete(link)
    await db.commit()
