from datetime import datetime

from pydantic import BaseModel, Field


class BudgetBase(BaseModel):
    category: str = Field(min_length=2, max_length=64)
    monthly_limit: float = Field(gt=0)


class BudgetCreate(BudgetBase):
    pass


class BudgetRead(BudgetBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
