from __future__ import annotations

from collections import defaultdict
from datetime import date

from app.models.budget import Budget
from app.models.transaction import Transaction, TransactionKind

ESSENTIAL_CATEGORIES = {"rent", "utilities", "groceries", "healthcare", "transport"}


def _within_last_days(tx_date: date, days: int) -> bool:
    return (date.today() - tx_date).days <= days


def compute_financial_health(transactions: list[Transaction], budgets: list[Budget]) -> dict:
    window_txs = [tx for tx in transactions if _within_last_days(tx.transaction_date, 90)]

    income = sum(float(tx.amount) for tx in window_txs if tx.kind == TransactionKind.INCOME)
    expense = sum(float(tx.amount) for tx in window_txs if tx.kind == TransactionKind.EXPENSE)

    savings_rate = 0.0 if income <= 0 else max((income - expense) / income, -1.0)

    essential_expense = sum(
        float(tx.amount)
        for tx in window_txs
        if tx.kind == TransactionKind.EXPENSE and tx.category.lower() in ESSENTIAL_CATEGORIES
    )
    essential_ratio = 0.0 if expense <= 0 else essential_expense / expense

    budget_spend = defaultdict(float)
    for tx in window_txs:
        if tx.kind == TransactionKind.EXPENSE:
            budget_spend[tx.category.lower()] += float(tx.amount)

    if budgets:
        on_track = sum(1 for b in budgets if budget_spend.get(b.category.lower(), 0.0) <= float(b.monthly_limit))
        budget_adherence = on_track / len(budgets)
    else:
        budget_adherence = 0.6

    savings_component = max(0.0, min(savings_rate / 0.25, 1.0))
    budget_component = max(0.0, min(budget_adherence, 1.0))

    if essential_ratio <= 0.65:
        essential_component = 1.0
    elif essential_ratio >= 0.9:
        essential_component = 0.3
    else:
        essential_component = 1.0 - ((essential_ratio - 0.65) / 0.25) * 0.7

    score = int(round((savings_component * 45 + budget_component * 30 + essential_component * 25) * 100 / 100))
    score = max(0, min(score, 100))

    if score >= 80:
        status = "Excellent"
    elif score >= 60:
        status = "Good"
    elif score >= 40:
        status = "Fair"
    else:
        status = "Needs Attention"

    recommendations: list[str] = []
    if savings_rate < 0.1:
        recommendations.append("Increase your monthly savings rate to at least 10% by reducing discretionary spend.")
    if budget_adherence < 0.7:
        recommendations.append("Review category budgets and cap overspending categories early in the month.")
    if essential_ratio > 0.75:
        recommendations.append("Your essential spending is high; renegotiate fixed bills or optimize recurring costs.")
    if not recommendations:
        recommendations.append("Keep current habits consistent and gradually increase investments with surplus cashflow.")

    return {
        "score": score,
        "status": status,
        "breakdown": {
            "savings_rate": round(savings_rate, 3),
            "budget_adherence": round(budget_adherence, 3),
            "essential_spend_ratio": round(essential_ratio, 3),
        },
        "recommendations": recommendations,
    }
