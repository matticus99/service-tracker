from sqlalchemy import Integer, Numeric
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AppSettings(Base):
    __tablename__ = "app_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    shop_fee: Mapped[float] = mapped_column(Numeric(10, 2), default=40.00)
    tax_rate: Mapped[float] = mapped_column(Numeric(5, 4), default=0.07)
