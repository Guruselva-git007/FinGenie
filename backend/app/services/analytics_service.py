from __future__ import annotations

import csv
from collections import defaultdict
from datetime import date
from pathlib import Path

from dateutil.relativedelta import relativedelta

from app.models.budget import Budget
from app.models.transaction import Transaction, TransactionKind
from app.services.forecast_service import generate_spending_forecast
from app.services.health_score_service import compute_financial_health

CPI_DATASET_PATH = Path(__file__).resolve().parent.parent / "ml" / "datasets" / "us_cpi.csv"


def _month_start(value: date) -> date:
    return value.replace(day=1)


def _inflation_context_note() -> str | None:
    if not CPI_DATASET_PATH.exists():
        return None

    try:
        rows: list[tuple[str, float]] = []
        with CPI_DATASET_PATH.open("r", encoding="utf-8", newline="") as csv_file:
            reader = csv.DictReader(csv_file)
            for row in reader:
                raw_date = (row.get("DATE") or row.get("observation_date") or "").strip()
                raw_value = (row.get("CPIAUCSL") or "").strip()
                if not raw_date or not raw_value or raw_value == ".":
                    continue
                rows.append((raw_date, float(raw_value)))
        if len(rows) < 13:
            return None

        latest_date, latest_val = rows[-1]
        _, prior_val = rows[-13]
        if prior_val <= 0:
            return None

        yoy = ((latest_val / prior_val) - 1.0) * 100.0
        return f"Latest CPI inflation ({latest_date}) is {yoy:.1f}% YoY; keep budget limits inflation-adjusted."
    except Exception:
        return None


def build_analytics_summary(
    transactions: list[Transaction],
    budgets: list[Budget],
    forecast_months: int = 3,
) -> dict:
    income_total = round(sum(float(tx.amount) for tx in transactions if tx.kind == TransactionKind.INCOME), 2)
    expense_total = round(sum(float(tx.amount) for tx in transactions if tx.kind == TransactionKind.EXPENSE), 2)

    category_totals = defaultdict(float)
    monthly_totals = defaultdict(float)
    current_month_spend = defaultdict(float)
    current_month = _month_start(date.today())

    for tx in transactions:
        if tx.kind == TransactionKind.EXPENSE:
            category_totals[tx.category] += float(tx.amount)
            tx_month = _month_start(tx.transaction_date)
            monthly_totals[tx_month] += float(tx.amount)
            if tx_month == current_month:
                current_month_spend[tx.category] += float(tx.amount)

    expense_by_category = [
        {"category": category, "amount": round(total, 2)}
        for category, total in sorted(category_totals.items(), key=lambda item: item[1], reverse=True)
    ]

    if monthly_totals:
        start = min(monthly_totals)
        end = max(monthly_totals)
    else:
        start = end = _month_start(date.today())

    monthly_expense_trend = []
    current = start
    while current <= end:
        monthly_expense_trend.append(
            {
                "month": current.isoformat(),
                "expense": round(monthly_totals.get(current, 0.0), 2),
            }
        )
        current = current + relativedelta(months=1)

    budget_utilization = []
    for budget in budgets:
        spent = round(current_month_spend.get(budget.category, 0.0), 2)
        utilization = 0.0 if budget.monthly_limit <= 0 else round(spent / float(budget.monthly_limit) * 100, 2)
        budget_utilization.append(
            {
                "category": budget.category,
                "spent": spent,
                "limit": round(float(budget.monthly_limit), 2),
                "utilization_pct": utilization,
            }
        )

    spending_forecast = generate_spending_forecast(transactions, months=forecast_months)
    financial_health = compute_financial_health(transactions, budgets)

    insights: list[str] = []
    if expense_by_category:
        top = expense_by_category[0]
        share = 0 if expense_total == 0 else top["amount"] / expense_total
        if share > 0.35:
            insights.append(f"{top['category']} is your biggest expense bucket at {share:.0%} of spending.")

    net_cashflow = round(income_total - expense_total, 2)
    if net_cashflow < 0:
        insights.append("You are currently cashflow negative. Trim discretionary categories to break even.")
    elif net_cashflow > 0:
        insights.append("You are cashflow positive. Route surplus into emergency funds or investments.")

    over_budget = [b["category"] for b in budget_utilization if b["utilization_pct"] > 100]
    if over_budget:
        insights.append(f"Budget exceeded in: {', '.join(over_budget[:3])}.")

    inflation_note = _inflation_context_note()
    if inflation_note:
        insights.append(inflation_note)

    if not insights:
        insights.append("Spending pattern is stable. Keep monitoring category budgets weekly.")

    return {
        "income_total": income_total,
        "expense_total": expense_total,
        "net_cashflow": net_cashflow,
        "expense_by_category": expense_by_category,
        "monthly_expense_trend": monthly_expense_trend,
        "spending_forecast": spending_forecast,
        "budget_utilization": budget_utilization,
        "financial_health": financial_health,
        "insights": insights,
    }
