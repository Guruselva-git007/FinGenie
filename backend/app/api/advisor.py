from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db_session
from app.models.budget import Budget
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.advisor import AdvisorQuery, AdvisorResponse
from app.services.advisor_service import generate_financial_advice
from app.services.analytics_service import build_analytics_summary

router = APIRouter(prefix="/advisor", tags=["advisor"])


@router.post("/query", response_model=AdvisorResponse)
def advisor_query(
    payload: AdvisorQuery,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    transactions = db.scalars(select(Transaction).where(Transaction.user_id == current_user.id)).all()
    budgets = db.scalars(select(Budget).where(Budget.user_id == current_user.id)).all()
    summary = build_analytics_summary(transactions, budgets, forecast_months=3)
    return generate_financial_advice(payload.question, summary)
