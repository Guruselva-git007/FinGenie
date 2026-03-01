from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db_session
from app.models.budget import Budget
from app.models.transaction import Transaction, TransactionKind

router = APIRouter(prefix="/demo", tags=["demo"])


@router.post("/seed")
def seed_demo_data(db: Session = Depends(get_db_session)):
    has_data = db.scalar(select(Transaction.id))
    if has_data:
        return {"message": "Demo data already exists."}

    today = date.today()
    sample = [
        Transaction(
            description="Salary",
            amount=4200,
            category="salary",
            kind=TransactionKind.INCOME,
            transaction_date=today,
        ),
        Transaction(
            description="Apartment rent",
            amount=1450,
            category="rent",
            kind=TransactionKind.EXPENSE,
            transaction_date=today,
        ),
        Transaction(
            description="Grocery store",
            amount=240,
            category="groceries",
            kind=TransactionKind.EXPENSE,
            transaction_date=today,
        ),
        Transaction(
            description="Uber rides",
            amount=92,
            category="transport",
            kind=TransactionKind.EXPENSE,
            transaction_date=today,
        ),
        Transaction(
            description="Streaming subscription",
            amount=26,
            category="entertainment",
            kind=TransactionKind.EXPENSE,
            transaction_date=today,
        ),
        Transaction(
            description="Restaurant dinner",
            amount=78,
            category="dining",
            kind=TransactionKind.EXPENSE,
            transaction_date=today,
        ),
    ]

    budgets = [
        Budget(category="groceries", monthly_limit=350),
        Budget(category="dining", monthly_limit=200),
        Budget(category="entertainment", monthly_limit=120),
        Budget(category="transport", monthly_limit=180),
    ]

    for tx in sample:
        db.add(tx)

    for budget in budgets:
        db.add(budget)

    db.commit()
    return {"message": "Demo data seeded."}
