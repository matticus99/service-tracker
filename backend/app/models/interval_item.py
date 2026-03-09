import enum
import uuid
from datetime import date, datetime

from sqlalchemy import Integer, String, Text, Date, DateTime, Numeric, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class IntervalItemType(str, enum.Enum):
    REGULAR = "regular"
    AD_HOC = "ad_hoc"


class IntervalItem(Base):
    __tablename__ = "interval_items"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    vehicle_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("vehicles.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    type: Mapped[IntervalItemType] = mapped_column(Enum(IntervalItemType, values_callable=lambda x: [e.value for e in x]), nullable=False, default=IntervalItemType.REGULAR)
    last_service_date: Mapped[date | None] = mapped_column(Date)
    last_service_miles: Mapped[int | None] = mapped_column(Integer)
    recommended_interval_miles: Mapped[int | None] = mapped_column(Integer)
    next_service_miles: Mapped[int | None] = mapped_column(Integer)
    due_soon_threshold_miles: Mapped[int] = mapped_column(Integer, default=500)
    estimated_cost: Mapped[float | None] = mapped_column(Numeric(10, 2))
    notes: Mapped[str | None] = mapped_column(Text)
    target_date: Mapped[date | None] = mapped_column(Date)
    target_miles: Mapped[int | None] = mapped_column(Integer)
    record_type: Mapped[str | None] = mapped_column(String(50), default=None)
    service_definition_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("service_definitions.id", ondelete="SET NULL"))
    category_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("service_categories.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    vehicle = relationship("Vehicle", back_populates="interval_items")
    service_definition = relationship("ServiceDefinition")
    category = relationship("ServiceCategory")
