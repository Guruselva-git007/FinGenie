from __future__ import annotations

from collections import defaultdict
from datetime import date

from dateutil.relativedelta import relativedelta
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.models.budget import Budget
from app.models.net_worth_snapshot import NetWorthSnapshot
from app.models.savings_goal import SavingsGoal, SavingsGoalStatus
from app.models.transaction import Transaction, TransactionKind
from app.models.wealth_account import WealthAccount, WealthAccountType
from app.services.analytics_service import build_analytics_summary


def _month_start(value: date) -> date:
    return value.replace(day=1)


def build_smart_budget_plan(transactions: list[Transaction], budgets: list[Budget]) -> dict:
    summary = build_analytics_summary(transactions, budgets, forecast_months=3)

    income_by_month = defaultdict(float)
    expense_by_month = defaultdict(float)
    for tx in transactions:
        tx_month = _month_start(tx.transaction_date)
        if tx.kind == TransactionKind.INCOME:
            income_by_month[tx_month] += float(tx.amount)
        else:
            expense_by_month[tx_month] += float(tx.amount)

    monthly_income = (
        sum(income_by_month.values()) / max(len(income_by_month), 1)
        if income_by_month
        else 0.0
    )

    if monthly_income <= 0:
        monthly_income = sum(expense_by_month.values()) / max(len(expense_by_month), 1) if expense_by_month else 0.0

    monthly_income = max(monthly_income, 1.0)

    recommended = {
        "needs": round(monthly_income * 0.5, 2),
        "wants": round(monthly_income * 0.3, 2),
        "savings": round(monthly_income * 0.2, 2),
    }

    top_categories = summary["expense_by_category"][:5]
    category_caps = [
        {
            "category": item["category"],
            "recommended_limit": round(item["amount"] * 0.9, 2),
        }
        for item in top_categories
    ]

    return {
        "monthly_income_estimate": round(monthly_income, 2),
        "allocation": recommended,
        "category_caps": category_caps,
        "notes": [
            "Follow a dynamic 50/30/20 split and rebalance monthly based on forecast drift.",
            "Set automated alerts when a category crosses 80% of its limit.",
        ],
    }


def _months_until(target_date: date | None) -> int | None:
    if target_date is None:
        return None

    today = date.today()
    if target_date <= today:
        return 1

    delta = relativedelta(target_date, today)
    months = (delta.years * 12) + delta.months
    if delta.days > 0:
        months += 1
    return max(1, months)


def build_goal_item(goal: SavingsGoal) -> dict:
    target_amount = float(goal.target_amount)
    current_amount = float(goal.current_amount)
    remaining_amount = max(0.0, round(target_amount - current_amount, 2))
    progress_pct = 0.0 if target_amount <= 0 else min(100.0, round((current_amount / target_amount) * 100, 1))
    months_to_target = _months_until(goal.target_date)
    required_monthly = None
    if months_to_target:
        required_monthly = round(remaining_amount / months_to_target, 2)

    pace_status = "steady"
    if goal.status == SavingsGoalStatus.ACHIEVED or remaining_amount == 0:
        pace_status = "complete"
    elif required_monthly is not None and goal.monthly_contribution > 0:
        pace_status = "on_track" if float(goal.monthly_contribution) >= required_monthly else "at_risk"
    elif months_to_target is not None and months_to_target <= 3:
        pace_status = "at_risk"

    return {
        "id": goal.id,
        "title": goal.title,
        "category": goal.category,
        "status": goal.status,
        "target_amount": round(target_amount, 2),
        "current_amount": round(current_amount, 2),
        "monthly_contribution": round(float(goal.monthly_contribution), 2),
        "target_date": goal.target_date,
        "notes": goal.notes,
        "created_at": goal.created_at,
        "updated_at": goal.updated_at,
        "progress_pct": progress_pct,
        "remaining_amount": remaining_amount,
        "months_to_target": months_to_target,
        "required_monthly_to_hit_target": required_monthly,
        "pace_status": pace_status,
    }


def build_goals_summary(goals: list[SavingsGoal]) -> dict:
    items = [build_goal_item(goal) for goal in goals]
    total_target = round(sum(item["target_amount"] for item in items), 2)
    total_saved = round(sum(item["current_amount"] for item in items), 2)
    completion_pct = 0.0 if total_target <= 0 else round((total_saved / total_target) * 100, 1)

    return {
        "total_goals": len(goals),
        "active_goals": sum(1 for goal in goals if goal.status == SavingsGoalStatus.ACTIVE),
        "on_track_goals": sum(1 for item in items if item["pace_status"] in {"on_track", "complete"}),
        "at_risk_goals": sum(1 for item in items if item["pace_status"] == "at_risk"),
        "total_target": total_target,
        "total_saved": total_saved,
        "completion_pct": completion_pct,
    }


def build_net_worth_summary(accounts: list[WealthAccount], snapshots: list[NetWorthSnapshot]) -> dict:
    total_assets = round(sum(float(account.balance) for account in accounts if account.account_type == WealthAccountType.ASSET), 2)
    total_liabilities = round(sum(float(account.balance) for account in accounts if account.account_type == WealthAccountType.DEBT), 2)
    net_worth = round(total_assets - total_liabilities, 2)

    asset_groups = defaultdict(float)
    liability_groups = defaultdict(float)
    for account in accounts:
        if account.account_type == WealthAccountType.ASSET:
            asset_groups[account.category] += float(account.balance)
        else:
            liability_groups[account.category] += float(account.balance)

    snapshot_history = [
        {
            "captured_at": snapshot.captured_at.isoformat(),
            "assets_total": round(float(snapshot.assets_total), 2),
            "liabilities_total": round(float(snapshot.liabilities_total), 2),
            "net_worth": round(float(snapshot.net_worth), 2),
        }
        for snapshot in snapshots[-12:]
    ]

    if not snapshot_history:
        snapshot_history = [
            {
                "captured_at": date.today().isoformat(),
                "assets_total": total_assets,
                "liabilities_total": total_liabilities,
                "net_worth": net_worth,
            }
        ]

    return {
        "total_assets": total_assets,
        "total_liabilities": total_liabilities,
        "net_worth": net_worth,
        "asset_breakdown": [
            {"category": category, "balance": round(balance, 2)}
            for category, balance in sorted(asset_groups.items(), key=lambda item: item[1], reverse=True)
        ],
        "liability_breakdown": [
            {"category": category, "balance": round(balance, 2)}
            for category, balance in sorted(liability_groups.items(), key=lambda item: item[1], reverse=True)
        ],
        "snapshot_history": snapshot_history,
    }


def record_net_worth_snapshot(db: Session, user_id: int) -> None:
    accounts = db.scalars(select(WealthAccount).where(WealthAccount.user_id == user_id)).all()
    total_assets = round(sum(float(account.balance) for account in accounts if account.account_type == WealthAccountType.ASSET), 2)
    total_liabilities = round(sum(float(account.balance) for account in accounts if account.account_type == WealthAccountType.DEBT), 2)
    net_worth = round(total_assets - total_liabilities, 2)

    latest = db.scalar(
        select(NetWorthSnapshot).where(NetWorthSnapshot.user_id == user_id).order_by(desc(NetWorthSnapshot.captured_at))
    )
    if latest:
        latest_values = (
            round(float(latest.assets_total), 2),
            round(float(latest.liabilities_total), 2),
            round(float(latest.net_worth), 2),
        )
        if latest_values == (total_assets, total_liabilities, net_worth):
            return

    db.add(
        NetWorthSnapshot(
            user_id=user_id,
            assets_total=total_assets,
            liabilities_total=total_liabilities,
            net_worth=net_worth,
        )
    )
    db.flush()
