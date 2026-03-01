from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class FeedbackEntry(Base):
    __tablename__ = "feedback_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    category: Mapped[str] = mapped_column(String(40), default="general", nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sentiment: Mapped[str] = mapped_column(String(20), default="neutral", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
