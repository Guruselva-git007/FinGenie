from __future__ import annotations


def generate_financial_advice(question: str, analytics_summary: dict) -> dict:
    q = question.lower().strip()
    health = analytics_summary.get("financial_health", {})
    score = health.get("score", 0)
    net_cashflow = analytics_summary.get("net_cashflow", 0.0)
    insights = analytics_summary.get("insights", [])

    if "budget" in q:
        answer = (
            "Use category caps tied to your monthly income. "
            "Prioritize essential categories first, then set strict limits for dining, shopping, and entertainment."
        )
    elif "save" in q or "saving" in q:
        answer = (
            "Automate savings right after income hits your account. "
            "Start with 10-20% of income and increase after reducing variable expenses."
        )
    elif "invest" in q:
        answer = (
            "Build a 3-6 month emergency buffer first, then allocate surplus into diversified long-term investments. "
            "Keep risk aligned with your time horizon."
        )
    elif "debt" in q:
        answer = (
            "Pay high-interest debt aggressively while maintaining minimum payments on lower-interest balances. "
            "Use any monthly surplus from budget cuts toward principal reduction."
        )
    else:
        answer = (
            "Your plan should balance cashflow, savings, and budget discipline. "
            "Track weekly spending drift and correct overspending before month-end."
        )

    action_items = [
        f"Current financial health score is {score}/100. Target +10 points by next month.",
        "Review spending categories every Sunday and cut one low-value recurring expense.",
    ]

    if net_cashflow < 0:
        action_items.append("You are running a deficit: reduce discretionary spending by 15% immediately.")
    else:
        action_items.append("Allocate at least 50% of your surplus cashflow to savings/investments.")

    for insight in insights[:1]:
        action_items.append(f"Insight to act on: {insight}")

    return {"answer": answer, "action_items": action_items[:4]}
