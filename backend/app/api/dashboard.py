from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db_session
from app.models.budget import Budget
from app.models.net_worth_snapshot import NetWorthSnapshot
from app.models.savings_goal import SavingsGoal
from app.models.transaction import Transaction
from app.models.user import User
from app.models.wealth_account import WealthAccount
from app.schemas.dashboard import DashboardOverviewResponse
from app.services.analytics_service import build_analytics_summary, build_transaction_track_record
from app.services.automation_service import (
    build_bill_calendar,
    build_subscription_opportunities,
    detect_recurring_expenses,
)
from app.services.planning_service import (
    build_goal_item,
    build_goals_summary,
    build_net_worth_summary,
    build_smart_budget_plan,
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/overview", response_model=DashboardOverviewResponse)
def dashboard_overview(
    tx_limit: int = Query(default=100, ge=10, le=500),
    forecast_months: int = Query(default=4, ge=1, le=12),
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    transactions = db.scalars(
        select(Transaction)
        .where(Transaction.user_id == current_user.id)
        .order_by(desc(Transaction.transaction_date), desc(Transaction.id))
    ).all()
    budgets = db.scalars(select(Budget).where(Budget.user_id == current_user.id).order_by(Budget.category)).all()
    goals = db.scalars(
        select(SavingsGoal)
        .where(SavingsGoal.user_id == current_user.id)
        .order_by(SavingsGoal.target_date.is_(None), SavingsGoal.target_date, SavingsGoal.created_at)
    ).all()
    accounts = db.scalars(
        select(WealthAccount)
        .where(WealthAccount.user_id == current_user.id)
        .order_by(WealthAccount.account_type, WealthAccount.category, WealthAccount.name)
    ).all()
    snapshots = db.scalars(
        select(NetWorthSnapshot)
        .where(NetWorthSnapshot.user_id == current_user.id)
        .order_by(desc(NetWorthSnapshot.captured_at))
    ).all()

    recurring = detect_recurring_expenses(transactions, max_items=8)

    return {
        "summary": build_analytics_summary(transactions, budgets, forecast_months=forecast_months),
        "recent_transactions": transactions[:tx_limit],
        "budgets": budgets,
        "smart_plan": build_smart_budget_plan(transactions, budgets),
        "goals": [build_goal_item(goal) for goal in goals],
        "goals_summary": build_goals_summary(goals),
        "net_worth": {
            "accounts": accounts,
            "summary": build_net_worth_summary(accounts, list(reversed(snapshots))),
        },
        "recurring_expenses": recurring,
        "bill_calendar": build_bill_calendar(recurring, horizon_days=45),
        "subscription_opportunities": build_subscription_opportunities(recurring, max_items=6),
        "transaction_track_record": build_transaction_track_record(transactions),
    }
