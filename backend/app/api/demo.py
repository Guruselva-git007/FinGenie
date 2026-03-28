from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db_session
from app.models.budget import Budget
from app.models.transaction import Transaction, TransactionKind
from app.models.user import User

router = APIRouter(prefix="/demo", tags=["demo"])


@router.post("/seed")
def seed_demo_data(db: Session = Depends(get_db_session), current_user: User = Depends(get_current_user)):
    has_data = db.scalar(select(Transaction.id).where(Transaction.user_id == current_user.id))
    if has_data:
        return {"message": "Demo data already exists."}

    today = date.today()
    sample = [
        Transaction(
            user_id=current_user.id,
            description="Salary",
            amount=4200,
            category="salary",
            kind=TransactionKind.INCOME,
            transaction_date=today,
        ),
        Transaction(
            user_id=current_user.id,
            description="Apartment rent",
            amount=1450,
            category="rent",
            kind=TransactionKind.EXPENSE,
            transaction_date=today,
        ),
        Transaction(
            user_id=current_user.id,
            description="Grocery store",
            amount=240,
            category="groceries",
            kind=TransactionKind.EXPENSE,
            transaction_date=today,
        ),
        Transaction(
            user_id=current_user.id,
            description="Uber rides",
            amount=92,
            category="transport",
            kind=TransactionKind.EXPENSE,
            transaction_date=today,
        ),
        Transaction(
            user_id=current_user.id,
            description="Streaming subscription",
            amount=26,
            category="entertainment",
            kind=TransactionKind.EXPENSE,
            transaction_date=today,
        ),
        Transaction(
            user_id=current_user.id,
            description="Restaurant dinner",
            amount=78,
            category="dining",
            kind=TransactionKind.EXPENSE,
            transaction_date=today,
        ),
    ]

    budgets = [
        Budget(user_id=current_user.id, category="groceries", monthly_limit=350),
        Budget(user_id=current_user.id, category="dining", monthly_limit=200),
        Budget(user_id=current_user.id, category="entertainment", monthly_limit=120),
        Budget(user_id=current_user.id, category="transport", monthly_limit=180),
    ]

    for tx in sample:
        db.add(tx)

    for budget in budgets:
        db.add(budget)

    db.commit()
    return {"message": "Demo data seeded."}
