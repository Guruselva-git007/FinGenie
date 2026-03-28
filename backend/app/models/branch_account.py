from datetime import datetime

from sqlalchemy import DateTime, Float, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class BranchAccount(Base):
    __tablename__ = "branch_accounts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(Integer, index=True, nullable=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    branch_code: Mapped[str] = mapped_column(String(40), default="", nullable=False)
    manager_name: Mapped[str] = mapped_column(String(120), default="", nullable=False)
    monthly_revenue: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    monthly_expense: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    notes: Mapped[str | None] = mapped_column(String(800), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
