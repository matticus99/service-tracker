import uuid
from datetime import date

from pydantic import BaseModel

from app.schemas.vehicle import VehicleOut
from app.schemas.interval_item import IntervalItemOut
from app.schemas.oil_change import OilChangeOut


class MileageStats(BaseModel):
    daily: float
    weekly: float
    monthly: float
    data_points: int


class NextOilChange(BaseModel):
    due_at_miles: int | None
    miles_remaining: int | None
    estimated_weeks: float | None
    last_date: date | None
    last_facility: str | None


class CostSummary(BaseModel):
    overdue_count: int
    overdue_total: float
    due_soon_count: int
    due_soon_total: float
    subtotal: float
    shop_fee: float
    tax: float
    total: float


class DashboardOut(BaseModel):
    vehicle: VehicleOut
    overdue_items: list[IntervalItemOut]
    due_soon_items: list[IntervalItemOut]
    next_oil_change: NextOilChange
    cost_summary: CostSummary
    mileage_stats: MileageStats
