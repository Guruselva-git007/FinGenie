from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db_session
from app.models.net_worth_snapshot import NetWorthSnapshot
from app.models.savings_goal import SavingsGoal
from app.models.user import User
from app.models.wealth_account import WealthAccount
from app.schemas.planning import (
    GoalProgressItem,
    NetWorthOverviewResponse,
    SavingsGoalCreate,
    SavingsGoalUpdate,
    WealthAccountCreate,
    WealthAccountRead,
    WealthAccountUpdate,
)
from app.services.planning_service import build_goal_item, build_net_worth_summary, record_net_worth_snapshot

router = APIRouter(prefix="/planning", tags=["planning"])


@router.get("/goals", response_model=list[GoalProgressItem])
def list_goals(db: Session = Depends(get_db_session), current_user: User = Depends(get_current_user)):
    goals = db.scalars(
        select(SavingsGoal)
        .where(SavingsGoal.user_id == current_user.id)
        .order_by(SavingsGoal.target_date.is_(None), SavingsGoal.target_date, SavingsGoal.created_at)
    ).all()
    return [build_goal_item(goal) for goal in goals]


@router.post("/goals", response_model=GoalProgressItem, status_code=status.HTTP_201_CREATED)
def create_goal(
    payload: SavingsGoalCreate,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    goal = SavingsGoal(user_id=current_user.id, **payload.model_dump())
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return build_goal_item(goal)


@router.patch("/goals/{goal_id}", response_model=GoalProgressItem)
def update_goal(
    goal_id: int,
    payload: SavingsGoalUpdate,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    goal = db.get(SavingsGoal, goal_id)
    if not goal or goal.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Goal not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(goal, field, value)

    db.commit()
    db.refresh(goal)
    return build_goal_item(goal)


@router.delete("/goals/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(goal_id: int, db: Session = Depends(get_db_session), current_user: User = Depends(get_current_user)):
    goal = db.get(SavingsGoal, goal_id)
    if not goal or goal.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Goal not found")

    db.delete(goal)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/net-worth", response_model=NetWorthOverviewResponse)
def net_worth_overview(db: Session = Depends(get_db_session), current_user: User = Depends(get_current_user)):
    accounts = db.scalars(
        select(WealthAccount)
        .where(WealthAccount.user_id == current_user.id)
        .order_by(WealthAccount.account_type, WealthAccount.category, WealthAccount.name)
    ).all()
    snapshots = db.scalars(
        select(NetWorthSnapshot)
        .where(NetWorthSnapshot.user_id == current_user.id)
        .order_by(desc(NetWorthSnapshot.captured_at))
    ).all()
    return {
        "accounts": accounts,
        "summary": build_net_worth_summary(accounts, list(reversed(snapshots))),
    }


@router.post("/accounts", response_model=WealthAccountRead, status_code=status.HTTP_201_CREATED)
def create_account(
    payload: WealthAccountCreate,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    account = WealthAccount(user_id=current_user.id, **payload.model_dump())
    db.add(account)
    db.flush()
    record_net_worth_snapshot(db, current_user.id)
    db.commit()
    db.refresh(account)
    return account


@router.patch("/accounts/{account_id}", response_model=WealthAccountRead)
def update_account(
    account_id: int,
    payload: WealthAccountUpdate,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    account = db.get(WealthAccount, account_id)
    if not account or account.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Account not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(account, field, value)

    db.flush()
    record_net_worth_snapshot(db, current_user.id)
    db.commit()
    db.refresh(account)
    return account


@router.delete("/accounts/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(account_id: int, db: Session = Depends(get_db_session), current_user: User = Depends(get_current_user)):
    account = db.get(WealthAccount, account_id)
    if not account or account.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Account not found")

    db.delete(account)
    db.flush()
    record_net_worth_snapshot(db, current_user.id)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
