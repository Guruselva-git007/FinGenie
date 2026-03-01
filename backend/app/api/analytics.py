from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db_session
from app.models.budget import Budget
from app.models.transaction import Transaction
from app.schemas.analytics import AnalyticsSummaryResponse, HealthScoreResponse
from app.services.analytics_service import build_analytics_summary
from app.services.health_score_service import compute_financial_health

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary", response_model=AnalyticsSummaryResponse)
def analytics_summary(
    forecast_months: int = Query(default=3, ge=1, le=12),
    db: Session = Depends(get_db_session),
):
    transactions = db.scalars(select(Transaction)).all()
    budgets = db.scalars(select(Budget)).all()
    return build_analytics_summary(transactions, budgets, forecast_months=forecast_months)


@router.get("/health-score", response_model=HealthScoreResponse)
def health_score(db: Session = Depends(get_db_session)):
    transactions = db.scalars(select(Transaction)).all()
    budgets = db.scalars(select(Budget)).all()
    return compute_financial_health(transactions, budgets)
