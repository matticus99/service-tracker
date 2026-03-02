import uuid
from datetime import date, datetime

from pydantic import BaseModel


class ServiceRecordCreate(BaseModel):
    service_date: date
    facility: str | None = None
    odometer: int | None = None
    services_performed: list[str] | None = None
    notes: str | None = None


class ServiceRecordUpdate(BaseModel):
    service_date: date | None = None
    facility: str | None = None
    odometer: int | None = None
    services_performed: list[str] | None = None
    notes: str | None = None


class ServiceRecordOut(BaseModel):
    id: uuid.UUID
    vehicle_id: uuid.UUID
    service_date: date
    facility: str | None
    odometer: int | None
    services_performed: list[str] | None
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
