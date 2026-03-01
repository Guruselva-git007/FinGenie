from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from collections import defaultdict
from datetime import date

from app.api.deps import get_db_session
from app.models.budget import Budget
from app.models.transaction import Transaction, TransactionKind
from app.schemas.budget import BudgetCreate, BudgetRead
from app.services.analytics_service import build_analytics_summary

router = APIRouter(prefix="/budgets", tags=["budgets"])


def _month_start(value: date) -> date:
    return value.replace(day=1)


@router.get("", response_model=list[BudgetRead])
def list_budgets(db: Session = Depends(get_db_session)):
    return db.scalars(select(Budget).order_by(Budget.category)).all()


@router.post("", response_model=BudgetRead, status_code=status.HTTP_201_CREATED)
def create_or_update_budget(payload: BudgetCreate, db: Session = Depends(get_db_session)):
    existing = db.scalar(select(Budget).where(Budget.category == payload.category.lower()))
    if existing:
        existing.monthly_limit = payload.monthly_limit
        db.commit()
        db.refresh(existing)
        return existing

    budget = Budget(category=payload.category.lower(), monthly_limit=payload.monthly_limit)
    db.add(budget)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail="Budget category must be unique") from exc

    db.refresh(budget)
    return budget


@router.get("/smart-plan")
def smart_budget_plan(db: Session = Depends(get_db_session)):
    transactions = db.scalars(select(Transaction)).all()
    budgets = db.scalars(select(Budget)).all()

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
    category_caps = []
    for item in top_categories:
        category_caps.append(
            {
                "category": item["category"],
                "recommended_limit": round(item["amount"] * 0.9, 2),
            }
        )

    return {
        "monthly_income_estimate": round(monthly_income, 2),
        "allocation": recommended,
        "category_caps": category_caps,
        "notes": [
            "Follow a dynamic 50/30/20 split and rebalance monthly based on forecast drift.",
            "Set automated alerts when a category crosses 80% of its limit.",
        ],
    }
