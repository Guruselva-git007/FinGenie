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


class SubscriptionOpportunityItem(BaseModel):
    description: str
    category: str
    monthly_cost: float
    annual_cost: float
    action: str
    priority: str


class BillCalendarItem(BaseModel):
    description: str
    category: str
    amount: float
    due_date: str
    days_left: int
    urgency: str


class EnvelopeJarItem(BaseModel):
    jar: str
    target_amount: float
    actual_amount: float
    utilization_pct: float


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
    subscription_opportunities: list[SubscriptionOpportunityItem]
    bill_calendar: list[BillCalendarItem]
    envelope_jars: list[EnvelopeJarItem]
    behavior_nudges: list[str]
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


class DebtInput(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    balance: float = Field(gt=0)
    annual_rate: float = Field(ge=0)
    min_payment: float = Field(gt=0)


class DebtPayoffRequest(BaseModel):
    debts: list[DebtInput] = Field(min_length=1)
    strategy: str = Field(default="avalanche")
    extra_payment: float = Field(default=0.0, ge=0)


class DebtPayoffResponse(BaseModel):
    strategy: str
    months_to_debt_free: int
    projected_payoff_date: str
    total_interest_paid: float
    total_paid: float
    payoff_order: list[str]


class TaxSetAsideRequest(BaseModel):
    monthly_income: float = Field(gt=0)
    effective_tax_rate: float = Field(ge=0, le=80)
    safety_buffer_pct: float = Field(default=10.0, ge=0, le=100)


class TaxSetAsideResponse(BaseModel):
    monthly_tax_set_aside: float
    quarterly_tax_set_aside: float
    annual_tax_set_aside: float


class EmergencyFundRequest(BaseModel):
    current_fund: float = Field(default=0.0, ge=0)
    monthly_expense: float = Field(gt=0)
    target_months: int = Field(default=6, ge=1, le=24)
    monthly_contribution: float = Field(gt=0)
    annual_return_rate: float = Field(default=0.0, ge=0, le=30)


class EmergencyFundResponse(BaseModel):
    target_fund: float
    current_fund: float
    funding_gap: float
    months_to_target: int
    projected_completion_value: float


class NetWorthProjectionRequest(BaseModel):
    current_assets: float = Field(ge=0)
    current_liabilities: float = Field(ge=0)
    monthly_investment: float = Field(ge=0)
    annual_return_rate: float = Field(default=8.0, ge=0, le=30)
    months: int = Field(default=24, ge=1, le=120)
    monthly_liability_payment: float = Field(default=0.0, ge=0)
    liability_interest_rate: float = Field(default=0.0, ge=0, le=30)


class NetWorthPoint(BaseModel):
    month_index: int
    assets: float
    liabilities: float
    net_worth: float


class NetWorthProjectionResponse(BaseModel):
    start_net_worth: float
    projected_net_worth: float
    projection: list[NetWorthPoint]
