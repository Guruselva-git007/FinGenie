from datetime import datetime

from sqlalchemy import DateTime, Float, Integer, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class NetWorthSnapshot(Base):
    __tablename__ = "net_worth_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(Integer, index=True, nullable=True)
    assets_total: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    liabilities_total: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    net_worth: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
