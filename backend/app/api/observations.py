import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Vehicle, Observation
from app.schemas.observation import ObservationCreate, ObservationUpdate, ObservationOut

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
    query = select(Observation).where(Observation.vehicle_id == vehicle_id)
    if resolved is not None:
        query = query.where(Observation.resolved == resolved)
    query = query.order_by(Observation.observation_date.desc())
    result = await db.execute(query)
    return result.scalars().all()


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
    obs = await db.get(Observation, obs_id)
    if not obs or obs.vehicle_id != vehicle_id:
        raise HTTPException(404, "Observation not found")
    return obs


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
