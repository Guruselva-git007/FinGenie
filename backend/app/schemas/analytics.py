from pydantic import BaseModel


class SpendingForecastPoint(BaseModel):
    month: str
    predicted_spending: float


class HealthScoreBreakdown(BaseModel):
    savings_rate: float
    budget_adherence: float
    essential_spend_ratio: float


class HealthScoreResponse(BaseModel):
    score: int
    status: str
    breakdown: HealthScoreBreakdown
    recommendations: list[str]


class AnalyticsSummaryResponse(BaseModel):
    income_total: float
    expense_total: float
    net_cashflow: float
    expense_by_category: list[dict]
    monthly_expense_trend: list[dict]
    spending_forecast: list[SpendingForecastPoint]
    budget_utilization: list[dict]
    financial_health: HealthScoreResponse
    insights: list[str]
