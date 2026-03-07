import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Vehicle, OilChange, IntervalItem, AppSettings
from app.models.interval_item import IntervalItemType
from app.services.interval_status import compute_status as _compute_status
from app.schemas.interval_item import IntervalItemOut
from app.schemas.vehicle import VehicleOut
from app.schemas.dashboard import DashboardOut, MileageStats, NextOilChange, CostSummary

router = APIRouter()


@router.get("/{vehicle_id}/dashboard", response_model=DashboardOut)
async def get_dashboard(vehicle_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    vehicle = await db.get(Vehicle, vehicle_id)
    if not vehicle:
        raise HTTPException(404, "Vehicle not found")

    settings = await db.get(AppSettings, 1)

    # Get all interval items with computed status
    result = await db.execute(
        select(IntervalItem).where(IntervalItem.vehicle_id == vehicle_id)
    )
    items = result.scalars().all()

    overdue = []
    due_soon = []
    for item in items:
        status, miles_remaining = _compute_status(item, vehicle.current_mileage)
        out = IntervalItemOut.model_validate(item)
        out.status = status
        out.miles_remaining = miles_remaining
        if status == "overdue":
            overdue.append(out)
        elif status == "due_soon":
            due_soon.append(out)

    # Mileage stats from oil change history
    oil_changes_result = await db.execute(
        select(OilChange)
        .where(OilChange.vehicle_id == vehicle_id)
        .order_by(OilChange.service_date.asc())
    )
    oil_changes = oil_changes_result.scalars().all()

    mileage_stats = MileageStats(daily=0, weekly=0, monthly=0, data_points=len(oil_changes))

    if len(oil_changes) >= 2:
        first = oil_changes[0]
        last = oil_changes[-1]
        total_miles = last.odometer - first.odometer
        total_days = (last.service_date - first.service_date).days
        if total_days > 0:
            daily = total_miles / total_days
            mileage_stats.daily = round(daily, 1)
            mileage_stats.weekly = round(daily * 7, 1)
            mileage_stats.monthly = round(daily * 30.44, 1)

    # Next oil change
    next_oil = NextOilChange(
        due_at_miles=None,
        miles_remaining=None,
        estimated_weeks=None,
        last_date=None,
        last_facility=None,
    )

    # Find the oil change interval item
    oil_interval = next(
        (item for item in items if "oil" in item.name.lower() and item.type == IntervalItemType.REGULAR),
        None,
    )

    if oil_changes:
        latest_oc = oil_changes[-1]
        next_oil.last_date = latest_oc.service_date
        next_oil.last_facility = latest_oc.facility

    if oil_interval and oil_interval.next_service_miles:
        next_oil.due_at_miles = oil_interval.next_service_miles
        next_oil.miles_remaining = oil_interval.next_service_miles - vehicle.current_mileage
        if mileage_stats.daily > 0 and next_oil.miles_remaining is not None:
            next_oil.estimated_weeks = round(next_oil.miles_remaining / (mileage_stats.daily * 7), 1)

    # Cost summary
    shop_fee = float(settings.shop_fee) if settings else 40.0
    tax_rate = float(settings.tax_rate) if settings else 0.07

    overdue_total = sum(float(i.estimated_cost or 0) for i in overdue)
    due_soon_total = sum(float(i.estimated_cost or 0) for i in due_soon)
    subtotal = overdue_total + due_soon_total
    tax = round((subtotal + shop_fee) * tax_rate, 2)
    total = round(subtotal + shop_fee + tax, 2)

    cost_summary = CostSummary(
        overdue_count=len(overdue),
        overdue_total=overdue_total,
        due_soon_count=len(due_soon),
        due_soon_total=due_soon_total,
        subtotal=subtotal,
        shop_fee=shop_fee,
        tax=tax,
        total=total,
    )

    return DashboardOut(
        vehicle=VehicleOut.model_validate(vehicle),
        overdue_items=overdue,
        due_soon_items=due_soon,
        next_oil_change=next_oil,
        cost_summary=cost_summary,
        mileage_stats=mileage_stats,
    )
