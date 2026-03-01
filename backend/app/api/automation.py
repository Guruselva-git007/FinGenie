from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db_session
from app.models.budget import Budget
from app.models.transaction import Transaction
from app.schemas.automation import (
    AutomationInsightsResponse,
    GoalPlanRequest,
    GoalPlanResponse,
    LoanEmiRequest,
    LoanEmiResponse,
    RetirementPlanRequest,
    RetirementPlanResponse,
    SipProjectionRequest,
    SipProjectionResponse,
)
from app.services.automation_service import build_automation_insights
from app.services.calculation_service import (
    calculate_goal_plan,
    calculate_loan_emi,
    calculate_retirement_plan,
    calculate_sip_projection,
)

router = APIRouter(prefix="/automation", tags=["automation"])


@router.get("/insights", response_model=AutomationInsightsResponse)
def automation_insights(
    forecast_months: int = Query(default=3, ge=1, le=12),
    db: Session = Depends(get_db_session),
):
    transactions = db.scalars(select(Transaction)).all()
    budgets = db.scalars(select(Budget)).all()
    return build_automation_insights(transactions, budgets, forecast_months=forecast_months)


@router.post("/calculate/loan-emi", response_model=LoanEmiResponse)
def loan_emi(payload: LoanEmiRequest):
    return calculate_loan_emi(payload.principal, payload.annual_rate, payload.tenure_months)


@router.post("/calculate/sip", response_model=SipProjectionResponse)
def sip_projection(payload: SipProjectionRequest):
    return calculate_sip_projection(
        monthly_investment=payload.monthly_investment,
        annual_return_rate=payload.annual_return_rate,
        years=payload.years,
        annual_step_up_pct=payload.annual_step_up_pct,
    )


@router.post("/calculate/goal-plan", response_model=GoalPlanResponse)
def goal_plan(payload: GoalPlanRequest):
    return calculate_goal_plan(
        target_amount=payload.target_amount,
        years=payload.years,
        expected_annual_return_rate=payload.expected_annual_return_rate,
        current_savings=payload.current_savings,
    )


@router.post("/calculate/retirement", response_model=RetirementPlanResponse)
def retirement_plan(payload: RetirementPlanRequest):
    return calculate_retirement_plan(
        current_age=payload.current_age,
        retirement_age=payload.retirement_age,
        monthly_expense_today=payload.monthly_expense_today,
        inflation_rate=payload.inflation_rate,
        post_retirement_return_rate=payload.post_retirement_return_rate,
        life_expectancy=payload.life_expectancy,
    )
