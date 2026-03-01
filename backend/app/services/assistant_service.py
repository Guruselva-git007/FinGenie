from __future__ import annotations

import re
from datetime import date, timedelta

from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from app.models.assistant_task import AssistantTask, TaskPriority, TaskStatus
from app.models.donation import Donation
from app.models.feedback_entry import FeedbackEntry
from app.models.user_preference import UserPreference
from app.models.user_profile import UserProfile


CURRENCY_CODES = {"USD", "EUR", "GBP", "INR", "JPY", "CAD", "AUD", "SGD"}


def _extract_first_amount(text: str) -> float | None:
    match = re.search(r"(?:\$|₹|rs\.?\s*)?([0-9]+(?:\.[0-9]{1,2})?)", text, flags=re.IGNORECASE)
    if not match:
        return None
    try:
        return float(match.group(1))
    except ValueError:
        return None


def _extract_currency(text: str) -> str | None:
    for code in CURRENCY_CODES:
        if code.lower() in text.lower():
            return code
    return None


def _detect_priority(text: str) -> TaskPriority:
    lowered = text.lower()
    if any(token in lowered for token in ["urgent", "asap", "high priority", "important"]):
        return TaskPriority.HIGH
    if any(token in lowered for token in ["later", "whenever", "low priority"]):
        return TaskPriority.LOW
    return TaskPriority.MEDIUM


def _infer_due_date(text: str) -> date | None:
    lowered = text.lower()
    today = date.today()
    if "today" in lowered:
        return today
    if "tomorrow" in lowered:
        return today + timedelta(days=1)
    if "next week" in lowered:
        return today + timedelta(days=7)
    return None


def _extract_task_title(message: str) -> str:
    lowered = message.lower()
    if "create task" in lowered:
        idx = lowered.index("create task")
        tail = message[idx + len("create task") :].strip(" :.-")
        if tail:
            return tail
    if lowered.startswith("task:"):
        tail = message.split(":", 1)[1].strip()
        if tail:
            return tail
    return "Review spending and adjust budgets"


def _detect_feedback_sentiment(message: str, rating: int | None) -> str:
    lowered = message.lower()
    if rating is not None:
        if rating >= 4:
            return "positive"
        if rating <= 2:
            return "negative"

    positive_words = ["great", "good", "helpful", "awesome", "love"]
    negative_words = ["bad", "issue", "bug", "poor", "slow", "wrong"]

    if any(word in lowered for word in positive_words):
        return "positive"
    if any(word in lowered for word in negative_words):
        return "negative"
    return "neutral"


def get_or_create_preferences(db: Session) -> UserPreference:
    pref = db.scalar(select(UserPreference).order_by(UserPreference.id))
    if pref:
        return pref

    pref = UserPreference()
    db.add(pref)
    db.commit()
    db.refresh(pref)
    return pref


def get_or_create_profile(db: Session) -> UserProfile:
    profile = db.scalar(select(UserProfile).order_by(UserProfile.id))
    if profile:
        return profile

    profile = UserProfile()
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


def list_tasks_query(limit: int = 50) -> Select[tuple[AssistantTask]]:
    return select(AssistantTask).order_by(AssistantTask.created_at.desc()).limit(limit)


def create_task(
    db: Session,
    title: str,
    details: str | None,
    due_date: date | None,
    priority: TaskPriority,
) -> AssistantTask:
    task = AssistantTask(
        title=title,
        details=details,
        due_date=due_date,
        priority=priority,
        status=TaskStatus.PENDING,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def automate_from_chat(message: str, db: Session, preferences: UserPreference) -> list[str]:
    events: list[str] = []
    lowered = message.lower()

    if "create task" in lowered or lowered.startswith("task:"):
        title = _extract_task_title(message)
        task = AssistantTask(
            title=title,
            details=None,
            due_date=_infer_due_date(message),
            priority=_detect_priority(message),
            status=TaskStatus.PENDING,
        )
        db.add(task)
        db.flush()
        events.append(f"Created task #{task.id}: {task.title}")

    if "set savings target" in lowered or "savings target" in lowered:
        amount = _extract_first_amount(message)
        if amount is not None:
            preferences.monthly_savings_target = max(0.0, amount)
            events.append(f"Updated monthly savings target to {amount:.2f}")

    if "set currency" in lowered or "currency" in lowered:
        code = _extract_currency(message)
        if code:
            preferences.currency = code
            events.append(f"Updated preferred currency to {code}")

    if "set risk" in lowered or "risk profile" in lowered:
        if "conservative" in lowered:
            preferences.risk_profile = "conservative"
            events.append("Updated risk profile to conservative")
        elif "balanced" in lowered:
            preferences.risk_profile = "balanced"
            events.append("Updated risk profile to balanced")
        elif "aggressive" in lowered:
            preferences.risk_profile = "aggressive"
            events.append("Updated risk profile to aggressive")

    if "donate" in lowered:
        amount = _extract_first_amount(message)
        if amount and amount > 0:
            cause = "community"
            for candidate in [
                "education",
                "health",
                "animal",
                "climate",
                "children",
                "disaster",
                "community",
            ]:
                if candidate in lowered:
                    cause = candidate
                    break
            donation = Donation(cause=cause, amount=amount, recurring=("monthly" in lowered or "recurring" in lowered))
            db.add(donation)
            db.flush()
            events.append(f"Created donation pledge #{donation.id} for {amount:.2f} to {cause}")

    if lowered.startswith("feedback:"):
        feedback_msg = message.split(":", 1)[1].strip()
        if feedback_msg:
            feedback = FeedbackEntry(
                category="chat",
                message=feedback_msg,
                rating=None,
                sentiment=_detect_feedback_sentiment(feedback_msg, None),
            )
            db.add(feedback)
            db.flush()
            events.append(f"Saved feedback entry #{feedback.id}")

    if events:
        db.add(preferences)
        db.commit()

    return events


def generate_assistant_response(
    message: str,
    analytics_summary: dict,
    preferences: UserPreference,
    open_tasks: list[AssistantTask],
    automation_events: list[str],
) -> dict:
    lowered = message.lower().strip()
    health = analytics_summary.get("financial_health", {})
    score = health.get("score", 0)
    net_cashflow = analytics_summary.get("net_cashflow", 0.0)
    insights = analytics_summary.get("insights", [])

    if "budget" in lowered:
        answer = (
            "I can keep your budget dynamic: I will prioritize essentials, cap discretionary buckets, "
            "and create a weekly correction task when utilization crosses 80%."
        )
    elif "save" in lowered or "saving" in lowered:
        answer = (
            f"Your active savings target is {preferences.monthly_savings_target:.2f} {preferences.currency}. "
            "Automate transfers right after income and tighten one variable category every week."
        )
    elif "task" in lowered or "automation" in lowered:
        answer = (
            "I can execute lightweight automations from chat: create tasks, update preferences, log feedback, "
            "and add donation pledges from one message."
        )
    elif "donat" in lowered:
        answer = (
            "For donations, set a fixed monthly cap (e.g., 1-3% of income), prefer recurring micro-donations, "
            "and track them as part of your values budget."
        )
    elif "preference" in lowered or "custom" in lowered:
        answer = (
            "Use preferences to personalize currency, risk profile, theme, and notifications. "
            "I will use these settings when generating recommendations and automations."
        )
    elif "feedback" in lowered or "suggestion" in lowered:
        answer = (
            "Use feedback entries to log friction points. I can convert feedback into prioritized tasks and "
            "track closure over time."
        )
    elif "debt" in lowered or "tax" in lowered or "retirement" in lowered:
        answer = (
            "Use the Automation Lab for advanced planning: debt payoff (avalanche/snowball), tax set-aside, "
            "retirement corpus, emergency fund runway, and net-worth projection."
        )
    else:
        answer = (
            "I am your FinGenie assistant. Ask for budgeting, savings, forecasting, automation tasks, "
            "preferences, donations, debt/tax planning, or product feedback workflows."
        )

    action_items = [
        f"Financial health score is {score}/100. Aim for +8 points this cycle.",
        f"Preferred profile: {preferences.risk_profile} risk, {preferences.currency} currency.",
    ]

    if net_cashflow < 0:
        action_items.append("Cashflow is negative. Reduce discretionary spending by 10-15% this month.")
    else:
        action_items.append("Cashflow is positive. Route at least 50% of surplus into savings or investments.")

    if open_tasks:
        next_task = open_tasks[0]
        action_items.append(f"Next open task: {next_task.title} ({next_task.priority.value}).")

    if insights:
        action_items.append(f"Insight: {insights[0]}")

    follow_up_questions = [
        "Do you want me to create a weekly budget review task now?",
        "Should I adjust your savings target based on current cashflow?",
        "Would you like to set a monthly donation cap?",
    ]

    return {
        "answer": answer,
        "action_items": action_items[:5],
        "automation_events": automation_events,
        "follow_up_questions": follow_up_questions,
    }
