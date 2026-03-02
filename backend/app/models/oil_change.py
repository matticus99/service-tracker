import uuid
from datetime import date, datetime

from sqlalchemy import Integer, String, Text, Date, DateTime, Numeric, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class OilChange(Base):
    __tablename__ = "oil_changes"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    vehicle_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("vehicles.id"), nullable=False)
    service_date: Mapped[date] = mapped_column(Date, nullable=False)
    facility: Mapped[str | None] = mapped_column(String(200))
    odometer: Mapped[int] = mapped_column(Integer, nullable=False)
    interval_miles: Mapped[int | None] = mapped_column(Integer)
    interval_months: Mapped[float | None] = mapped_column(Numeric(5, 1))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    vehicle = relationship("Vehicle", back_populates="oil_changes")
