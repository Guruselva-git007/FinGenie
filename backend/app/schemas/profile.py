from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.assistant import UserProfileRead


class BranchAccountBase(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    branch_code: str = Field(default="", max_length=40)
    manager_name: str = Field(default="", max_length=120)
    monthly_revenue: float = Field(default=0.0, ge=0)
    monthly_expense: float = Field(default=0.0, ge=0)
    notes: str | None = Field(default=None, max_length=800)


class BranchAccountCreate(BranchAccountBase):
    pass


class BranchAccountUpdate(BranchAccountBase):
    pass


class BranchAccountRead(BranchAccountBase):
    id: int
    profit_loss: float
    margin_pct: float
    created_at: datetime
    updated_at: datetime


class PersonalAccountSnapshot(BaseModel):
    label: str
    revenue: float
    expense: float
    profit_loss: float
    average_monthly_savings: float
    health_score: int


class BranchWorkspaceSummary(BaseModel):
    account_mode: str
    branch_count: int
    combined_revenue: float
    combined_expense: float
    combined_profit_loss: float
    best_branch_name: str | None
    best_branch_profit_loss: float | None
    weakest_branch_name: str | None
    weakest_branch_profit_loss: float | None


class ProfileWorkspaceOverviewResponse(BaseModel):
    profile: UserProfileRead
    personal_account: PersonalAccountSnapshot
    branch_summary: BranchWorkspaceSummary
    branches: list[BranchAccountRead]


class ReportMetric(BaseModel):
    label: str
    value: str


class ProfileReportResponse(BaseModel):
    scope: str
    title: str
    generated_at: datetime
    metrics: list[ReportMetric]
    highlights: list[str]
    recommendations: list[str]
    report_text: str
