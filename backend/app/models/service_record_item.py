import uuid

from sqlalchemy import Integer, String, Numeric, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ServiceRecordItem(Base):
    __tablename__ = "service_record_items"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    service_record_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("service_records.id", ondelete="CASCADE"), nullable=False)
    service_definition_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("service_definitions.id", ondelete="SET NULL"))
    custom_service_name: Mapped[str | None] = mapped_column(String(200))
    cost: Mapped[float | None] = mapped_column(Numeric(10, 2))
    display_order: Mapped[int] = mapped_column(Integer, default=0)

    service_record = relationship("ServiceRecord", back_populates="items")
    service_definition = relationship("ServiceDefinition")
