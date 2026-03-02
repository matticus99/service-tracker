import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Vehicle, OilChange, ServiceRecord, IntervalItem, Observation, AppSettings
from app.schemas.vehicle import VehicleOut
from app.schemas.oil_change import OilChangeOut
from app.schemas.service_record import ServiceRecordOut
from app.schemas.interval_item import IntervalItemOut
from app.schemas.observation import ObservationOut
from app.schemas.settings import SettingsOut

router = APIRouter()


@router.get("")
async def export_all(db: AsyncSession = Depends(get_db)):
    """Export all data as JSON."""
    vehicles_result = await db.execute(select(Vehicle))
    vehicles = vehicles_result.scalars().all()

    data = {"vehicles": []}

    for vehicle in vehicles:
        v_data = VehicleOut.model_validate(vehicle).model_dump(mode="json")

        oc_result = await db.execute(
            select(OilChange).where(OilChange.vehicle_id == vehicle.id).order_by(OilChange.service_date)
        )
        v_data["oil_changes"] = [OilChangeOut.model_validate(oc).model_dump(mode="json") for oc in oc_result.scalars()]

        sr_result = await db.execute(
            select(ServiceRecord).where(ServiceRecord.vehicle_id == vehicle.id).order_by(ServiceRecord.service_date)
        )
        v_data["service_records"] = [ServiceRecordOut.model_validate(sr).model_dump(mode="json") for sr in sr_result.scalars()]

        ii_result = await db.execute(
            select(IntervalItem).where(IntervalItem.vehicle_id == vehicle.id).order_by(IntervalItem.name)
        )
        v_data["interval_items"] = [IntervalItemOut.model_validate(ii).model_dump(mode="json") for ii in ii_result.scalars()]

        obs_result = await db.execute(
            select(Observation).where(Observation.vehicle_id == vehicle.id).order_by(Observation.observation_date)
        )
        v_data["observations"] = [ObservationOut.model_validate(o).model_dump(mode="json") for o in obs_result.scalars()]

        data["vehicles"].append(v_data)

    settings = await db.get(AppSettings, 1)
    if settings:
        data["settings"] = SettingsOut.model_validate(settings).model_dump(mode="json")

    return data
