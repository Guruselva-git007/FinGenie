import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class WealthAccountType(str, enum.Enum):
    ASSET = "asset"
    DEBT = "debt"


class WealthAccount(Base):
    __tablename__ = "wealth_accounts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(Integer, index=True, nullable=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    account_type: Mapped[WealthAccountType] = mapped_column(
        Enum(WealthAccountType),
        default=WealthAccountType.ASSET,
        nullable=False,
    )
    category: Mapped[str] = mapped_column(String(64), default="cash", nullable=False)
    balance: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    institution: Mapped[str | None] = mapped_column(String(120), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
