import uuid
from datetime import date, datetime

from pydantic import BaseModel


class ObservationCreate(BaseModel):
    observation_date: date
    odometer: int | None = None
    observation: str
    resolved: bool = False
    resolved_date: date | None = None


class ObservationUpdate(BaseModel):
    observation_date: date | None = None
    odometer: int | None = None
    observation: str | None = None
    resolved: bool | None = None
    resolved_date: date | None = None


class ObservationOut(BaseModel):
    id: uuid.UUID
    vehicle_id: uuid.UUID
    observation_date: date
    odometer: int | None
    observation: str
    resolved: bool
    resolved_date: date | None
    linked_service_record_ids: list[uuid.UUID] = []
    created_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_observation(cls, obs, links=None):
        out = cls.model_validate(obs)
        if links is not None:
            out.linked_service_record_ids = [link.service_record_id for link in links]
        elif hasattr(obs, "note_service_links"):
            out.linked_service_record_ids = [link.service_record_id for link in obs.note_service_links]
        return out
