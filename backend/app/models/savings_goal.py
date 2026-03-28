import enum
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, Float, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SavingsGoalStatus(str, enum.Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    ACHIEVED = "achieved"


class SavingsGoal(Base):
    __tablename__ = "savings_goals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(Integer, index=True, nullable=True)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    category: Mapped[str] = mapped_column(String(64), default="general", nullable=False)
    target_amount: Mapped[float] = mapped_column(Float, nullable=False)
    current_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    monthly_contribution: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    target_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[SavingsGoalStatus] = mapped_column(
        Enum(SavingsGoalStatus),
        default=SavingsGoalStatus.ACTIVE,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
