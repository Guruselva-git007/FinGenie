from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db_session
from app.models.budget import Budget
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.budget import BudgetCreate, BudgetRead
from app.schemas.planning import SmartBudgetPlanResponse
from app.services.planning_service import build_smart_budget_plan

router = APIRouter(prefix="/budgets", tags=["budgets"])


@router.get("", response_model=list[BudgetRead])
def list_budgets(db: Session = Depends(get_db_session), current_user: User = Depends(get_current_user)):
    return db.scalars(select(Budget).where(Budget.user_id == current_user.id).order_by(Budget.category)).all()


@router.post("", response_model=BudgetRead, status_code=status.HTTP_201_CREATED)
def create_or_update_budget(
    payload: BudgetCreate,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    existing = db.scalar(
        select(Budget).where(Budget.user_id == current_user.id, Budget.category == payload.category.lower())
    )
    if existing:
        existing.monthly_limit = payload.monthly_limit
        db.commit()
        db.refresh(existing)
        return existing

    budget = Budget(user_id=current_user.id, category=payload.category.lower(), monthly_limit=payload.monthly_limit)
    db.add(budget)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail="Budget category must be unique") from exc

    db.refresh(budget)
    return budget


@router.get("/smart-plan", response_model=SmartBudgetPlanResponse)
def smart_budget_plan(db: Session = Depends(get_db_session), current_user: User = Depends(get_current_user)):
    transactions = db.scalars(select(Transaction).where(Transaction.user_id == current_user.id)).all()
    budgets = db.scalars(select(Budget).where(Budget.user_id == current_user.id)).all()
    return build_smart_budget_plan(transactions, budgets)
