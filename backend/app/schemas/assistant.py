from datetime import date, datetime

from pydantic import BaseModel, Field

from app.models.assistant_task import TaskPriority, TaskStatus


class AdvisorQuery(BaseModel):
    question: str = Field(min_length=3, max_length=500)


class AdvisorResponse(BaseModel):
    answer: str
    action_items: list[str]


class AssistantChatQuery(BaseModel):
    message: str = Field(min_length=2, max_length=600)


class AssistantChatResponse(BaseModel):
    answer: str
    action_items: list[str]
    automation_events: list[str]
    follow_up_questions: list[str]


class AssistantTaskBase(BaseModel):
    title: str = Field(min_length=2, max_length=160)
    details: str | None = Field(default=None, max_length=800)
    due_date: date | None = None
    priority: TaskPriority = TaskPriority.MEDIUM


class AssistantTaskCreate(AssistantTaskBase):
    pass


class AssistantTaskUpdate(BaseModel):
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    due_date: date | None = None


class AssistantTaskRead(AssistantTaskBase):
    id: int
    status: TaskStatus
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UserPreferenceUpdate(BaseModel):
    currency: str = Field(default="USD", min_length=3, max_length=8)
    monthly_savings_target: float = Field(default=500.0, ge=0)
    risk_profile: str = Field(default="balanced", min_length=3, max_length=24)
    theme: str = Field(default="minimal-light", min_length=3, max_length=32)
    notifications_enabled: bool = True


class UserPreferenceRead(UserPreferenceUpdate):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class FeedbackCreate(BaseModel):
    category: str = Field(default="general", min_length=2, max_length=40)
    message: str = Field(min_length=5, max_length=2000)
    rating: int | None = Field(default=None, ge=1, le=5)


class FeedbackRead(FeedbackCreate):
    id: int
    sentiment: str
    created_at: datetime

    model_config = {"from_attributes": True}


class DonationCreate(BaseModel):
    cause: str = Field(min_length=2, max_length=80)
    amount: float = Field(gt=0)
    recurring: bool = False
    note: str | None = Field(default=None, max_length=800)


class DonationRead(DonationCreate):
    id: int
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
