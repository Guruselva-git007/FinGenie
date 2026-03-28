from datetime import date

from pydantic import BaseModel

from app.schemas.analytics import AnalyticsSummaryResponse
from app.schemas.automation import BillCalendarItem, RecurringExpenseItem, SubscriptionOpportunityItem
from app.schemas.budget import BudgetRead
from app.schemas.planning import GoalProgressItem, GoalsSummaryResponse, NetWorthOverviewResponse, SmartBudgetPlanResponse
from app.schemas.transaction import TransactionRead


class TransactionCategoryInsight(BaseModel):
    category: str
    amount: float
    share_pct: float


class TransactionMonthlyProgressItem(BaseModel):
    month: str
    income: float
    expense: float
    savings: float
    savings_rate: float


class TransactionLoanCommitmentItem(BaseModel):
    label: str
    category: str
    total_paid: float
    monthly_average: float
    payment_count: int
    latest_payment_amount: float
    latest_payment_date: date | None


class TransactionTrackSnapshot(BaseModel):
    tracked_months: int
    current_month_income: float
    current_month_expense: float
    current_month_savings: float
    average_monthly_income: float
    average_monthly_expense: float
    average_monthly_savings: float
    estimated_monthly_emi: float
    best_savings_month: str | None
    leanest_expense_month: str | None


class TransactionTrackRecordResponse(BaseModel):
    snapshot: TransactionTrackSnapshot
    highest_spend_categories: list[TransactionCategoryInsight]
    lowest_spend_categories: list[TransactionCategoryInsight]
    loan_commitments: list[TransactionLoanCommitmentItem]
    monthly_progress: list[TransactionMonthlyProgressItem]


class DashboardOverviewResponse(BaseModel):
    summary: AnalyticsSummaryResponse
    recent_transactions: list[TransactionRead]
    budgets: list[BudgetRead]
    smart_plan: SmartBudgetPlanResponse
    goals: list[GoalProgressItem]
    goals_summary: GoalsSummaryResponse
    net_worth: NetWorthOverviewResponse
    recurring_expenses: list[RecurringExpenseItem]
    bill_calendar: list[BillCalendarItem]
    subscription_opportunities: list[SubscriptionOpportunityItem]
    transaction_track_record: TransactionTrackRecordResponse
