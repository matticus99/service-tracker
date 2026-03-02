from pydantic import BaseModel


class SettingsUpdate(BaseModel):
    shop_fee: float | None = None
    tax_rate: float | None = None


class SettingsOut(BaseModel):
    id: int
    shop_fee: float
    tax_rate: float

    model_config = {"from_attributes": True}
