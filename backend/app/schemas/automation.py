from pydantic import BaseModel, Field


class AnomalyItem(BaseModel):
    transaction_id: int
    transaction_date: str
    description: str
    category: str
    amount: float
    anomaly_score: float
    reason: str


class RecurringExpenseItem(BaseModel):
    description: str
    category: str
    amount: float
    cadence: str
    last_date: str
    next_expected_date: str
    confidence: float


class SavingsPredictionItem(BaseModel):
    month: str
    predicted_net_savings: float
    algorithm: str


class BudgetPlanItem(BaseModel):
    category: str
    current_avg_spend: float
    current_budget_limit: float
    recommended_limit: float
    suggested_cut: float


class BudgetOptimizationResponse(BaseModel):
    target_savings_rate: float
    current_savings_rate: float
    monthly_reduction_needed: float
    budget_plan: list[BudgetPlanItem]


class AutomationInsightsResponse(BaseModel):
    anomalies: list[AnomalyItem]
    recurring_expenses: list[RecurringExpenseItem]
    savings_prediction_ml: list[SavingsPredictionItem]
    savings_prediction_dl: list[SavingsPredictionItem]
    budget_optimization: BudgetOptimizationResponse
    auto_actions: list[str]


class LoanEmiRequest(BaseModel):
    principal: float = Field(gt=0)
    annual_rate: float = Field(ge=0)
    tenure_months: int = Field(gt=0)


class LoanEmiResponse(BaseModel):
    emi: float
    total_interest: float
    total_payment: float


class SipProjectionRequest(BaseModel):
    monthly_investment: float = Field(gt=0)
    annual_return_rate: float = Field(ge=0)
    years: int = Field(gt=0)
    annual_step_up_pct: float = Field(default=0.0, ge=0)


class SipProjectionResponse(BaseModel):
    invested_amount: float
    estimated_returns: float
    future_value: float


class GoalPlanRequest(BaseModel):
    target_amount: float = Field(gt=0)
    years: int = Field(gt=0)
    expected_annual_return_rate: float = Field(ge=0)
    current_savings: float = Field(default=0.0, ge=0)


class GoalPlanResponse(BaseModel):
    target_amount: float
    current_savings_future_value: float
    required_monthly_investment: float
    projected_goal_value: float
    goal_gap_today: float


class RetirementPlanRequest(BaseModel):
    current_age: int = Field(ge=18)
    retirement_age: int = Field(gt=18)
    monthly_expense_today: float = Field(gt=0)
    inflation_rate: float = Field(ge=0)
    post_retirement_return_rate: float = Field(ge=0)
    life_expectancy: int = Field(gt=18)


class RetirementPlanResponse(BaseModel):
    expense_at_retirement_per_month: float
    required_retirement_corpus: float
    years_to_retire: int
    years_in_retirement: int
