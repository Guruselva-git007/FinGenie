from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class UserPreference(Base):
    __tablename__ = "user_preferences"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    currency: Mapped[str] = mapped_column(String(8), default="USD", nullable=False)
    monthly_savings_target: Mapped[float] = mapped_column(Float, default=500.0, nullable=False)
    risk_profile: Mapped[str] = mapped_column(String(24), default="balanced", nullable=False)
    theme: Mapped[str] = mapped_column(String(32), default="minimal-light", nullable=False)
    notifications_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
