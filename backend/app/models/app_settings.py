from sqlalchemy import Integer, Numeric, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AppSettings(Base):
    __tablename__ = "app_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    shop_fee: Mapped[float] = mapped_column(Numeric(10, 2), default=40.00)
    tax_rate: Mapped[float] = mapped_column(Numeric(5, 4), default=0.07)
    weekly_digest_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    weekly_digest_day: Mapped[int] = mapped_column(Integer, default=1)  # 0=Mon, 6=Sun
    vapid_private_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    vapid_public_key: Mapped[str | None] = mapped_column(Text, nullable=True)
