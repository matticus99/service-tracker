import uuid
from datetime import datetime

from sqlalchemy import Integer, String, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Vehicle(Base):
    __tablename__ = "vehicles"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    make: Mapped[str] = mapped_column(String(100), nullable=False)
    model: Mapped[str] = mapped_column(String(100), nullable=False)
    trim: Mapped[str | None] = mapped_column(String(200))
    color: Mapped[str | None] = mapped_column(String(50))
    vin: Mapped[str | None] = mapped_column(String(17))
    current_mileage: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    oil_changes = relationship("OilChange", back_populates="vehicle", cascade="all, delete-orphan")
    service_records = relationship("ServiceRecord", back_populates="vehicle", cascade="all, delete-orphan")
    interval_items = relationship("IntervalItem", back_populates="vehicle", cascade="all, delete-orphan")
    observations = relationship("Observation", back_populates="vehicle", cascade="all, delete-orphan")
    push_subscriptions = relationship("PushSubscription", back_populates="vehicle", cascade="all, delete-orphan")
    shops = relationship("Shop", back_populates="vehicle", cascade="all, delete-orphan")
