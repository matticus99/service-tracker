import uuid
from datetime import date, datetime

from pydantic import BaseModel

from app.models.interval_item import IntervalItemType


class IntervalItemCreate(BaseModel):
    name: str
    type: IntervalItemType = IntervalItemType.REGULAR
    last_service_date: date | None = None
    last_service_miles: int | None = None
    recommended_interval_miles: int | None = None
    next_service_miles: int | None = None
    due_soon_threshold_miles: int = 500
    estimated_cost: float | None = None
    notes: str | None = None
    target_date: date | None = None
    target_miles: int | None = None


class IntervalItemUpdate(BaseModel):
    name: str | None = None
    type: IntervalItemType | None = None
    last_service_date: date | None = None
    last_service_miles: int | None = None
    recommended_interval_miles: int | None = None
    next_service_miles: int | None = None
    due_soon_threshold_miles: int | None = None
    estimated_cost: float | None = None
    notes: str | None = None
    target_date: date | None = None
    target_miles: int | None = None


class MarkServicedRequest(BaseModel):
    service_date: date
    odometer: int


class IntervalItemOut(BaseModel):
    id: uuid.UUID
    vehicle_id: uuid.UUID
    name: str
    type: IntervalItemType
    last_service_date: date | None
    last_service_miles: int | None
    recommended_interval_miles: int | None
    next_service_miles: int | None
    due_soon_threshold_miles: int
    estimated_cost: float | None
    notes: str | None
    target_date: date | None
    target_miles: int | None
    status: str | None = None
    miles_remaining: int | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
