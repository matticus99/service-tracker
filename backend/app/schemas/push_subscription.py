import uuid
from datetime import datetime

from pydantic import BaseModel


class PushSubscriptionCreate(BaseModel):
    endpoint: str
    p256dh: str
    auth: str
    device_label: str | None = None


class PushSubscriptionOut(BaseModel):
    id: uuid.UUID
    vehicle_id: uuid.UUID
    endpoint: str
    device_label: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
