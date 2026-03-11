from uuid import UUID
from datetime import datetime

from pydantic import BaseModel


class ServiceDefinitionOut(BaseModel):
    id: UUID
    category_id: UUID
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}


class CategoryOut(BaseModel):
    id: UUID
    name: str
    display_order: int
    services: list[ServiceDefinitionOut] = []
    created_at: datetime

    model_config = {"from_attributes": True}
