import enum
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, Float, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class TransactionKind(str, enum.Enum):
    EXPENSE = "expense"
    INCOME = "income"


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    category: Mapped[str] = mapped_column(String(64), nullable=False, default="other")
    kind: Mapped[TransactionKind] = mapped_column(Enum(TransactionKind), default=TransactionKind.EXPENSE)
    merchant: Mapped[str | None] = mapped_column(String(120), nullable=True)
    transaction_date: Mapped[date] = mapped_column(Date, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
