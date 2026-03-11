import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel


class ServiceRecordItemCreate(BaseModel):
    service_definition_id: uuid.UUID | None = None
    custom_service_name: str | None = None
    cost: float | None = None
    display_order: int = 0


class ServiceRecordItemOut(BaseModel):
    id: uuid.UUID
    service_record_id: uuid.UUID
    service_definition_id: uuid.UUID | None = None
    custom_service_name: str | None = None
    cost: float | None = None
    display_order: int

    model_config = {"from_attributes": True}


class ServiceRecordCreate(BaseModel):
    service_date: date
    facility: str | None = None
    odometer: int | None = None
    services_performed: list[str] | None = None
    notes: str | None = None
    shop_id: uuid.UUID | None = None
    total_cost: float | None = None
    shop_fee: float | None = None
    tax: float | None = None
    items: list[ServiceRecordItemCreate] | None = None


class ServiceRecordUpdate(BaseModel):
    service_date: date | None = None
    facility: str | None = None
    odometer: int | None = None
    services_performed: list[str] | None = None
    notes: str | None = None
    shop_id: uuid.UUID | None = None
    total_cost: float | None = None
    shop_fee: float | None = None
    tax: float | None = None


class ServiceRecordOut(BaseModel):
    id: uuid.UUID
    vehicle_id: uuid.UUID
    service_date: date
    facility: str | None
    odometer: int | None
    services_performed: list[str] | None
    notes: str | None
    shop_id: uuid.UUID | None = None
    total_cost: float | None = None
    shop_fee: float | None = None
    tax: float | None = None
    items: list[ServiceRecordItemOut] = []
    linked_observation_ids: list[uuid.UUID] = []
    created_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_record(cls, record):
        out = cls.model_validate(record)
        if hasattr(record, "note_service_links"):
            out.linked_observation_ids = [link.observation_id for link in record.note_service_links]
        return out
