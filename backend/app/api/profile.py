from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db_session
from app.models.branch_account import BranchAccount
from app.models.budget import Budget
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.profile import (
    BranchAccountCreate,
    BranchAccountRead,
    BranchAccountUpdate,
    ProfileReportResponse,
    ProfileWorkspaceOverviewResponse,
)
from app.services.analytics_service import build_analytics_summary, build_transaction_track_record
from app.services.assistant_service import get_or_create_profile
from app.services.profile_service import build_branch_item, build_profile_report, build_profile_workspace_overview

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("/overview", response_model=ProfileWorkspaceOverviewResponse)
def profile_overview(db: Session = Depends(get_db_session), current_user: User = Depends(get_current_user)):
    profile = get_or_create_profile(db, current_user)
    branches = db.scalars(select(BranchAccount).where(BranchAccount.user_id == current_user.id).order_by(BranchAccount.name)).all()
    transactions = db.scalars(select(Transaction).where(Transaction.user_id == current_user.id)).all()
    budgets = db.scalars(select(Budget).where(Budget.user_id == current_user.id)).all()

    analytics_summary = build_analytics_summary(transactions, budgets, forecast_months=4)
    track_record = build_transaction_track_record(transactions)

    return build_profile_workspace_overview(profile, branches, transactions, analytics_summary, track_record)


@router.get("/branches", response_model=list[BranchAccountRead])
def list_branch_accounts(db: Session = Depends(get_db_session), current_user: User = Depends(get_current_user)):
    branches = db.scalars(select(BranchAccount).where(BranchAccount.user_id == current_user.id).order_by(BranchAccount.name)).all()
    transactions = db.scalars(select(Transaction).where(Transaction.user_id == current_user.id)).all()
    return [build_branch_item(branch, transactions) for branch in branches]


@router.post("/branches", response_model=BranchAccountRead, status_code=status.HTTP_201_CREATED)
def create_branch_account(
    payload: BranchAccountCreate,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    branch = BranchAccount(
        user_id=current_user.id,
        name=payload.name,
        branch_code=payload.branch_code,
        manager_name=payload.manager_name,
        monthly_revenue=payload.monthly_revenue,
        monthly_expense=payload.monthly_expense,
        notes=payload.notes,
    )
    db.add(branch)
    db.commit()
    db.refresh(branch)
    return build_branch_item(branch, [])


@router.put("/branches/{branch_id}", response_model=BranchAccountRead)
def update_branch_account(
    branch_id: int,
    payload: BranchAccountUpdate,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    branch = db.get(BranchAccount, branch_id)
    if not branch or branch.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Branch account not found")

    branch.name = payload.name
    branch.branch_code = payload.branch_code
    branch.manager_name = payload.manager_name
    branch.monthly_revenue = payload.monthly_revenue
    branch.monthly_expense = payload.monthly_expense
    branch.notes = payload.notes

    db.add(branch)
    db.commit()
    db.refresh(branch)
    transactions = db.scalars(select(Transaction).where(Transaction.user_id == current_user.id)).all()
    return build_branch_item(branch, transactions)


@router.delete("/branches/{branch_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_branch_account(
    branch_id: int,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    branch = db.get(BranchAccount, branch_id)
    if not branch or branch.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Branch account not found")

    db.delete(branch)
    db.commit()


@router.get("/report", response_model=ProfileReportResponse)
def generate_profile_report(
    scope: str = Query(default="personal"),
    branch_id: int | None = Query(default=None, ge=1),
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    profile = get_or_create_profile(db, current_user)
    branches = db.scalars(select(BranchAccount).where(BranchAccount.user_id == current_user.id).order_by(BranchAccount.name)).all()
    transactions = db.scalars(select(Transaction).where(Transaction.user_id == current_user.id)).all()
    budgets = db.scalars(select(Budget).where(Budget.user_id == current_user.id)).all()

    analytics_summary = build_analytics_summary(transactions, budgets, forecast_months=4)
    track_record = build_transaction_track_record(transactions)

    try:
        return build_profile_report(profile, branches, transactions, analytics_summary, track_record, scope, branch_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
