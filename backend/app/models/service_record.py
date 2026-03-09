import uuid
from datetime import date, datetime

from sqlalchemy import Integer, String, Text, Date, DateTime, Numeric, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ServiceRecord(Base):
    __tablename__ = "service_records"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    vehicle_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("vehicles.id"), nullable=False)
    service_date: Mapped[date] = mapped_column(Date, nullable=False)
    facility: Mapped[str | None] = mapped_column(String(200))
    odometer: Mapped[int | None] = mapped_column(Integer)
    services_performed: Mapped[list[str] | None] = mapped_column(ARRAY(String))
    notes: Mapped[str | None] = mapped_column(Text)
    shop_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("shops.id", ondelete="SET NULL"))
    total_cost: Mapped[float | None] = mapped_column(Numeric(10, 2))
    shop_fee: Mapped[float | None] = mapped_column(Numeric(10, 2))
    tax: Mapped[float | None] = mapped_column(Numeric(10, 2))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    vehicle = relationship("Vehicle", back_populates="service_records")
    shop = relationship("Shop")
    items = relationship("ServiceRecordItem", back_populates="service_record", cascade="all, delete-orphan", order_by="ServiceRecordItem.display_order")
    note_service_links = relationship("NoteServiceLink", back_populates="service_record", cascade="all, delete-orphan")
