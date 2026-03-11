import uuid

from pydantic import BaseModel


class LinkCreate(BaseModel):
    observation_id: uuid.UUID | None = None
    service_record_id: uuid.UUID | None = None


class LinkOut(BaseModel):
    id: uuid.UUID
    observation_id: uuid.UUID
    service_record_id: uuid.UUID

    model_config = {"from_attributes": True}
