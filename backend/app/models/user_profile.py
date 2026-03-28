from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(Integer, index=True, nullable=True)

    full_name: Mapped[str] = mapped_column(String(120), default="FinGenie User", nullable=False)
    email: Mapped[str] = mapped_column(String(180), default="user@example.com", nullable=False)
    phone: Mapped[str] = mapped_column(String(40), default="", nullable=False)
    country: Mapped[str] = mapped_column(String(80), default="", nullable=False)
    city: Mapped[str] = mapped_column(String(80), default="", nullable=False)
    timezone: Mapped[str] = mapped_column(String(80), default="Asia/Kolkata", nullable=False)
    occupation: Mapped[str] = mapped_column(String(120), default="", nullable=False)

    monthly_income_goal: Mapped[float] = mapped_column(Float, default=5000.0, nullable=False)
    annual_income_goal: Mapped[float] = mapped_column(Float, default=60000.0, nullable=False)

    username: Mapped[str] = mapped_column(String(80), default="fingenie_user", nullable=False)
    account_tier: Mapped[str] = mapped_column(String(40), default="pro", nullable=False)
    language: Mapped[str] = mapped_column(String(40), default="en-US", nullable=False)
    two_factor_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    marketing_opt_in: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
