from pydantic import BaseModel


class SettingsUpdate(BaseModel):
    shop_fee: float | None = None
    tax_rate: float | None = None
    weekly_digest_enabled: bool | None = None
    weekly_digest_day: int | None = None


class SettingsOut(BaseModel):
    id: int
    shop_fee: float
    tax_rate: float
    weekly_digest_enabled: bool
    weekly_digest_day: int

    model_config = {"from_attributes": True}
