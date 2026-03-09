"""Shared interval item status computation logic."""
from datetime import date, timedelta

from app.models.interval_item import IntervalItem, IntervalItemType
from app.schemas.interval_item import IntervalItemOut


def compute_status(item: IntervalItem, current_mileage: int) -> tuple[str, int | None]:
    """Compute status and miles_remaining for an interval item."""
    if item.type == IntervalItemType.AD_HOC:
        if item.target_miles is not None:
            remaining = item.target_miles - current_mileage
            threshold = item.due_soon_threshold_miles
            if remaining <= 0:
                return "overdue", remaining
            elif remaining <= threshold:
                return "due_soon", remaining
            else:
                return "ok", remaining
        if item.target_date is not None:
            today = date.today()
            days_remaining = (item.target_date - today).days
            if days_remaining < 0:
                return "overdue", None
            elif days_remaining <= 14:
                return "due_soon", None
            else:
                return "ok", None
        return "ad_hoc", None

    if item.next_service_miles is None:
        return "ok", None

    remaining = item.next_service_miles - current_mileage
    threshold = item.due_soon_threshold_miles

    if remaining <= 0:
        return "overdue", remaining
    elif remaining <= threshold:
        return "due_soon", remaining
    else:
        return "ok", remaining


def item_to_out(item: IntervalItem, current_mileage: int) -> IntervalItemOut:
    """Convert an IntervalItem model to IntervalItemOut with computed fields."""
    status, miles_remaining = compute_status(item, current_mileage)
    out = IntervalItemOut.model_validate(item)
    out.status = status
    out.miles_remaining = miles_remaining
    return out
