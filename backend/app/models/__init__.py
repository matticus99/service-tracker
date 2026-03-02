from app.models.vehicle import Vehicle
from app.models.oil_change import OilChange
from app.models.service_record import ServiceRecord
from app.models.interval_item import IntervalItem, IntervalItemType
from app.models.observation import Observation
from app.models.attachment import Attachment, RecordType
from app.models.push_subscription import PushSubscription
from app.models.app_settings import AppSettings

__all__ = [
    "Vehicle",
    "OilChange",
    "ServiceRecord",
    "IntervalItem",
    "IntervalItemType",
    "Observation",
    "Attachment",
    "RecordType",
    "PushSubscription",
    "AppSettings",
]
