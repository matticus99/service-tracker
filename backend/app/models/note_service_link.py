import uuid

from sqlalchemy import ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class NoteServiceLink(Base):
    __tablename__ = "note_service_links"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    observation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("observations.id", ondelete="CASCADE"), nullable=False)
    service_record_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("service_records.id", ondelete="CASCADE"), nullable=False)

    observation = relationship("Observation", back_populates="note_service_links")
    service_record = relationship("ServiceRecord", back_populates="note_service_links")
