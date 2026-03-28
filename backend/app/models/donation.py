from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Donation(Base):
    __tablename__ = "donations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(Integer, index=True, nullable=True)
    cause: Mapped[str] = mapped_column(String(80), nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    recurring: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(24), default="pledged", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
