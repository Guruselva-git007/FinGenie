from datetime import date, datetime

from pydantic import BaseModel, Field

from app.models.transaction import TransactionKind


class TransactionBase(BaseModel):
    description: str = Field(min_length=2, max_length=255)
    amount: float = Field(gt=0)
    category: str | None = Field(default=None, max_length=64)
    kind: TransactionKind = TransactionKind.EXPENSE
    merchant: str | None = Field(default=None, max_length=120)
    transaction_date: date = Field(default_factory=date.today)


class TransactionCreate(TransactionBase):
    pass


class TransactionRead(TransactionBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}
