from __future__ import annotations

import csv
from collections import defaultdict
from datetime import date
from functools import lru_cache
from pathlib import Path

from dateutil.relativedelta import relativedelta

from app.models.budget import Budget
from app.models.transaction import Transaction, TransactionKind
from app.services.forecast_service import generate_spending_forecast
from app.services.health_score_service import compute_financial_health

CPI_DATASET_PATH = Path(__file__).resolve().parent.parent / "ml" / "datasets" / "us_cpi.csv"
LOAN_KEYWORDS = ("loan", "emi", "mortgage", "debt", "installment", "instalment", "finance")


def _month_start(value: date) -> date:
    return value.replace(day=1)


def _month_label(value: date) -> str:
    return value.isoformat()


def _contains_loan_keyword(value: str | None) -> bool:
    lowered = (value or "").strip().lower()
    return bool(lowered) and any(keyword in lowered for keyword in LOAN_KEYWORDS)


def _loan_commitment_label(tx: Transaction) -> str | None:
    if tx.kind != TransactionKind.EXPENSE:
        return None

    if not any(_contains_loan_keyword(candidate) for candidate in (tx.description, tx.merchant, tx.category)):
        return None

    for candidate in (tx.merchant, tx.description, tx.category):
        cleaned = (candidate or "").strip()
        if cleaned and len(cleaned) > 2:
            return cleaned.title()

    return None


@lru_cache(maxsize=1)
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


def build_transaction_track_record(transactions: list[Transaction]) -> dict:
    expense_total = 0.0
    category_totals = defaultdict(float)
    monthly_income = defaultdict(float)
    monthly_expense = defaultdict(float)
    loan_commitments: dict[str, dict] = {}

    for tx in transactions:
        amount = round(float(tx.amount), 2)
        month_key = _month_start(tx.transaction_date)

        if tx.kind == TransactionKind.INCOME:
            monthly_income[month_key] += amount
            continue

        expense_total += amount
        monthly_expense[month_key] += amount
        category_totals[tx.category] += amount

        loan_label = _loan_commitment_label(tx)
        if not loan_label:
            continue

        entry = loan_commitments.setdefault(
            loan_label,
            {
                "label": loan_label,
                "category": tx.category,
                "total_paid": 0.0,
                "payment_count": 0,
                "latest_payment_date": None,
                "latest_payment_amount": 0.0,
                "months": set(),
            },
        )
        entry["total_paid"] += amount
        entry["payment_count"] += 1
        entry["months"].add(month_key)
        if entry["latest_payment_date"] is None or tx.transaction_date >= entry["latest_payment_date"]:
            entry["latest_payment_date"] = tx.transaction_date
            entry["latest_payment_amount"] = amount

    categories_sorted = sorted(category_totals.items(), key=lambda item: item[1], reverse=True)
    highest_spend_categories = [
        {
            "category": category,
            "amount": round(total, 2),
            "share_pct": round(0.0 if expense_total <= 0 else total / expense_total, 3),
        }
        for category, total in categories_sorted[:4]
    ]
    lowest_spend_categories = [
        {
            "category": category,
            "amount": round(total, 2),
            "share_pct": round(0.0 if expense_total <= 0 else total / expense_total, 3),
        }
        for category, total in sorted(category_totals.items(), key=lambda item: item[1])[:4]
    ]

    months = sorted(set(monthly_income) | set(monthly_expense))
    if not months:
        months = [_month_start(date.today())]

    monthly_progress = []
    best_savings_month = None
    leanest_expense_month = None
    best_savings_value = None
    leanest_expense_value = None

    for month in months[-8:]:
        income = round(monthly_income.get(month, 0.0), 2)
        expense = round(monthly_expense.get(month, 0.0), 2)
        savings = round(income - expense, 2)
        savings_rate = round(0.0 if income <= 0 else savings / income, 3)

        monthly_progress.append(
            {
                "month": _month_label(month),
                "income": income,
                "expense": expense,
                "savings": savings,
                "savings_rate": savings_rate,
            }
        )

        if best_savings_value is None or savings > best_savings_value:
            best_savings_value = savings
            best_savings_month = _month_label(month)

        if leanest_expense_value is None or expense < leanest_expense_value:
            leanest_expense_value = expense
            leanest_expense_month = _month_label(month)

    tracked_months = len(months)
    avg_income = round(sum(monthly_income.values()) / tracked_months, 2) if tracked_months else 0.0
    avg_expense = round(sum(monthly_expense.values()) / tracked_months, 2) if tracked_months else 0.0
    avg_savings = round(avg_income - avg_expense, 2)
    current_month = _month_start(date.today())

    loan_commitment_items = []
    for item in sorted(loan_commitments.values(), key=lambda row: row["total_paid"], reverse=True)[:6]:
        month_count = max(1, len(item["months"]))
        loan_commitment_items.append(
            {
                "label": item["label"],
                "category": item["category"],
                "total_paid": round(item["total_paid"], 2),
                "monthly_average": round(item["total_paid"] / month_count, 2),
                "payment_count": item["payment_count"],
                "latest_payment_amount": round(item["latest_payment_amount"], 2),
                "latest_payment_date": item["latest_payment_date"],
            }
        )

    estimated_monthly_emi = round(sum(item["monthly_average"] for item in loan_commitment_items), 2)

    return {
        "snapshot": {
            "tracked_months": tracked_months,
            "current_month_income": round(monthly_income.get(current_month, 0.0), 2),
            "current_month_expense": round(monthly_expense.get(current_month, 0.0), 2),
            "current_month_savings": round(monthly_income.get(current_month, 0.0) - monthly_expense.get(current_month, 0.0), 2),
            "average_monthly_income": avg_income,
            "average_monthly_expense": avg_expense,
            "average_monthly_savings": avg_savings,
            "estimated_monthly_emi": estimated_monthly_emi,
            "best_savings_month": best_savings_month,
            "leanest_expense_month": leanest_expense_month,
        },
        "highest_spend_categories": highest_spend_categories,
        "lowest_spend_categories": lowest_spend_categories,
        "loan_commitments": loan_commitment_items,
        "monthly_progress": monthly_progress,
    }
