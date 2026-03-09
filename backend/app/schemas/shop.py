from uuid import UUID
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ShopCreate(BaseModel):
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    hours: Optional[str] = None
    google_place_id: Optional[str] = None


class ShopUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    hours: Optional[str] = None
    google_place_id: Optional[str] = None


class ShopOut(BaseModel):
    id: UUID
    vehicle_id: UUID
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    hours: Optional[str] = None
    google_place_id: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}
