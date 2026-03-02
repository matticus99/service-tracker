import uuid
from datetime import date, datetime

from pydantic import BaseModel


class OilChangeCreate(BaseModel):
    service_date: date
    facility: str | None = None
    odometer: int
    notes: str | None = None


class OilChangeUpdate(BaseModel):
    service_date: date | None = None
    facility: str | None = None
    odometer: int | None = None
    notes: str | None = None


class OilChangeOut(BaseModel):
    id: uuid.UUID
    vehicle_id: uuid.UUID
    service_date: date
    facility: str | None
    odometer: int
    interval_miles: int | None
    interval_months: float | None
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
