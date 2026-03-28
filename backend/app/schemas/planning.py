from datetime import date, datetime

from pydantic import BaseModel, Field

from app.models.savings_goal import SavingsGoalStatus
from app.models.wealth_account import WealthAccountType


class SmartBudgetAllocation(BaseModel):
    needs: float
    wants: float
    savings: float


class SmartBudgetCategoryCap(BaseModel):
    category: str
    recommended_limit: float


class SmartBudgetPlanResponse(BaseModel):
    monthly_income_estimate: float
    allocation: SmartBudgetAllocation
    category_caps: list[SmartBudgetCategoryCap]
    notes: list[str]


class SavingsGoalCreate(BaseModel):
    title: str = Field(min_length=2, max_length=160)
    category: str = Field(default="general", min_length=2, max_length=64)
    target_amount: float = Field(gt=0)
    current_amount: float = Field(default=0.0, ge=0)
    monthly_contribution: float = Field(default=0.0, ge=0)
    target_date: date | None = None
    notes: str | None = Field(default=None, max_length=1200)
    status: SavingsGoalStatus = SavingsGoalStatus.ACTIVE


class SavingsGoalUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=160)
    category: str | None = Field(default=None, min_length=2, max_length=64)
    target_amount: float | None = Field(default=None, gt=0)
    current_amount: float | None = Field(default=None, ge=0)
    monthly_contribution: float | None = Field(default=None, ge=0)
    target_date: date | None = None
    notes: str | None = Field(default=None, max_length=1200)
    status: SavingsGoalStatus | None = None


class GoalProgressItem(BaseModel):
    id: int
    title: str
    category: str
    status: SavingsGoalStatus
    target_amount: float
    current_amount: float
    monthly_contribution: float
    target_date: date | None
    notes: str | None
    created_at: datetime
    updated_at: datetime
    progress_pct: float
    remaining_amount: float
    months_to_target: int | None
    required_monthly_to_hit_target: float | None
    pace_status: str


class GoalsSummaryResponse(BaseModel):
    total_goals: int
    active_goals: int
    on_track_goals: int
    at_risk_goals: int
    total_target: float
    total_saved: float
    completion_pct: float


class WealthAccountCreate(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    account_type: WealthAccountType = WealthAccountType.ASSET
    category: str = Field(default="cash", min_length=2, max_length=64)
    balance: float = Field(ge=0)
    institution: str | None = Field(default=None, max_length=120)
    notes: str | None = Field(default=None, max_length=1200)


class WealthAccountUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=160)
    account_type: WealthAccountType | None = None
    category: str | None = Field(default=None, min_length=2, max_length=64)
    balance: float | None = Field(default=None, ge=0)
    institution: str | None = Field(default=None, max_length=120)
    notes: str | None = Field(default=None, max_length=1200)


class WealthAccountRead(BaseModel):
    id: int
    name: str
    account_type: WealthAccountType
    category: str
    balance: float
    institution: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class NetWorthBreakdownItem(BaseModel):
    category: str
    balance: float


class NetWorthSnapshotPoint(BaseModel):
    captured_at: str
    assets_total: float
    liabilities_total: float
    net_worth: float


class NetWorthSummaryResponse(BaseModel):
    total_assets: float
    total_liabilities: float
    net_worth: float
    asset_breakdown: list[NetWorthBreakdownItem]
    liability_breakdown: list[NetWorthBreakdownItem]
    snapshot_history: list[NetWorthSnapshotPoint]


class NetWorthOverviewResponse(BaseModel):
    accounts: list[WealthAccountRead]
    summary: NetWorthSummaryResponse
