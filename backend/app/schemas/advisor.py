from pydantic import BaseModel, Field


class AdvisorQuery(BaseModel):
    question: str = Field(min_length=3, max_length=500)


class AdvisorResponse(BaseModel):
    answer: str
    action_items: list[str]
