import uuid
from datetime import datetime

from pydantic import BaseModel


class VehicleCreate(BaseModel):
    year: int
    make: str
    model: str
    trim: str | None = None
    color: str | None = None
    vin: str | None = None
    current_mileage: int = 0


class VehicleUpdate(BaseModel):
    year: int | None = None
    make: str | None = None
    model: str | None = None
    trim: str | None = None
    color: str | None = None
    vin: str | None = None
    current_mileage: int | None = None


class VehicleOut(BaseModel):
    id: uuid.UUID
    year: int
    make: str
    model: str
    trim: str | None
    color: str | None
    vin: str | None
    current_mileage: int
    created_at: datetime

    model_config = {"from_attributes": True}


class MileageUpdate(BaseModel):
    current_mileage: int
