from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db_session
from app.models.assistant_task import AssistantTask, TaskStatus
from app.models.budget import Budget
from app.models.donation import Donation
from app.models.feedback_entry import FeedbackEntry
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.assistant import (
    AssistantChatQuery,
    AssistantChatResponse,
    AssistantTaskCreate,
    AssistantTaskRead,
    AssistantTaskUpdate,
    DonationCreate,
    DonationRead,
    FeedbackCreate,
    FeedbackRead,
    UserPreferenceRead,
    UserPreferenceUpdate,
    UserProfileRead,
    UserProfileUpdate,
)
from app.services.analytics_service import build_analytics_summary
from app.services.assistant_service import (
    automate_from_chat,
    create_task,
    generate_assistant_response,
    get_or_create_preferences,
    get_or_create_profile,
    list_tasks_query,
    _detect_feedback_sentiment,
)

router = APIRouter(prefix="/assistant", tags=["assistant"])


@router.get("/preferences", response_model=UserPreferenceRead)
def get_preferences(db: Session = Depends(get_db_session), current_user: User = Depends(get_current_user)):
    return get_or_create_preferences(db, current_user)


@router.put("/preferences", response_model=UserPreferenceRead)
def update_preferences(
    payload: UserPreferenceUpdate,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    pref = get_or_create_preferences(db, current_user)
    pref.currency = payload.currency.upper()
    pref.monthly_savings_target = payload.monthly_savings_target
    pref.risk_profile = payload.risk_profile.lower()
    pref.theme = payload.theme
    pref.notifications_enabled = payload.notifications_enabled
    db.add(pref)
    db.commit()
    db.refresh(pref)
    return pref


@router.get("/profile", response_model=UserProfileRead)
def get_profile(db: Session = Depends(get_db_session), current_user: User = Depends(get_current_user)):
    return get_or_create_profile(db, current_user)


@router.put("/profile", response_model=UserProfileRead)
def update_profile(
    payload: UserProfileUpdate,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    profile = get_or_create_profile(db, current_user)

    profile.full_name = payload.full_name
    profile.email = payload.email
    profile.phone = payload.phone
    profile.country = payload.country
    profile.city = payload.city
    profile.timezone = payload.timezone
    profile.occupation = payload.occupation
    profile.monthly_income_goal = payload.monthly_income_goal
    profile.annual_income_goal = payload.annual_income_goal
    profile.username = payload.username
    profile.account_tier = payload.account_tier
    profile.language = payload.language
    profile.two_factor_enabled = payload.two_factor_enabled
    profile.marketing_opt_in = payload.marketing_opt_in

    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@router.get("/tasks", response_model=list[AssistantTaskRead])
def list_tasks(db: Session = Depends(get_db_session), current_user: User = Depends(get_current_user)):
    return db.scalars(list_tasks_query(current_user.id)).all()


@router.post("/tasks", response_model=AssistantTaskRead)
def add_task(
    payload: AssistantTaskCreate,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    return create_task(
        db=db,
        user_id=current_user.id,
        title=payload.title,
        details=payload.details,
        due_date=payload.due_date,
        priority=payload.priority,
    )


@router.patch("/tasks/{task_id}", response_model=AssistantTaskRead)
def update_task(
    task_id: int,
    payload: AssistantTaskUpdate,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    task = db.get(AssistantTask, task_id)
    if not task or task.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Task not found")

    if payload.status is not None:
        task.status = payload.status
    if payload.priority is not None:
        task.priority = payload.priority
    if payload.due_date is not None:
        task.due_date = payload.due_date

    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.get("/feedback", response_model=list[FeedbackRead])
def list_feedback(db: Session = Depends(get_db_session), current_user: User = Depends(get_current_user)):
    return db.scalars(
        select(FeedbackEntry).where(FeedbackEntry.user_id == current_user.id).order_by(FeedbackEntry.created_at.desc()).limit(100)
    ).all()


@router.post("/feedback", response_model=FeedbackRead)
def submit_feedback(
    payload: FeedbackCreate,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    feedback = FeedbackEntry(
        user_id=current_user.id,
        category=payload.category.lower(),
        message=payload.message,
        rating=payload.rating,
        sentiment=_detect_feedback_sentiment(payload.message, payload.rating),
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return feedback


@router.get("/donations", response_model=list[DonationRead])
def list_donations(db: Session = Depends(get_db_session), current_user: User = Depends(get_current_user)):
    return db.scalars(
        select(Donation).where(Donation.user_id == current_user.id).order_by(Donation.created_at.desc()).limit(100)
    ).all()


@router.post("/donations", response_model=DonationRead)
def add_donation(
    payload: DonationCreate,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    donation = Donation(
        user_id=current_user.id,
        cause=payload.cause.lower(),
        amount=payload.amount,
        recurring=payload.recurring,
        note=payload.note,
        status="pledged",
    )
    db.add(donation)
    db.commit()
    db.refresh(donation)
    return donation


@router.post("/chat", response_model=AssistantChatResponse)
def assistant_chat(
    payload: AssistantChatQuery,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    preferences = get_or_create_preferences(db, current_user)
    automation_events = automate_from_chat(payload.message, db, current_user, preferences)

    transactions = db.scalars(select(Transaction).where(Transaction.user_id == current_user.id)).all()
    budgets = db.scalars(select(Budget).where(Budget.user_id == current_user.id)).all()
    summary = build_analytics_summary(transactions, budgets, forecast_months=3)

    open_tasks = db.scalars(
        select(AssistantTask)
        .where(AssistantTask.user_id == current_user.id)
        .where(AssistantTask.status.in_([TaskStatus.PENDING, TaskStatus.IN_PROGRESS]))
        .order_by(AssistantTask.priority.desc(), AssistantTask.created_at.asc())
        .limit(5)
    ).all()

    return generate_assistant_response(
        message=payload.message,
        analytics_summary=summary,
        preferences=preferences,
        open_tasks=open_tasks,
        automation_events=automation_events,
    )
