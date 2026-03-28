from __future__ import annotations

from datetime import datetime

from app.models.branch_account import BranchAccount
from app.models.transaction import Transaction, TransactionKind
from app.models.user_profile import UserProfile


def _round(value: float) -> float:
    return round(float(value), 2)


def build_branch_item(branch: BranchAccount, transactions: list[Transaction]) -> dict:
    tagged = [tx for tx in transactions if tx.branch_account_id == branch.id]
    tagged_revenue = _round(sum(float(tx.amount) for tx in tagged if tx.kind == TransactionKind.INCOME))
    tagged_expense = _round(sum(float(tx.amount) for tx in tagged if tx.kind == TransactionKind.EXPENSE))

    revenue = tagged_revenue or _round(branch.monthly_revenue)
    expense = tagged_expense or _round(branch.monthly_expense)
    profit_loss = _round(revenue - expense)
    margin_pct = round(0.0 if revenue <= 0 else profit_loss / revenue, 3)

    return {
        "id": branch.id,
        "name": branch.name,
        "branch_code": branch.branch_code,
        "manager_name": branch.manager_name,
        "monthly_revenue": revenue,
        "monthly_expense": expense,
        "notes": branch.notes,
        "profit_loss": profit_loss,
        "margin_pct": margin_pct,
        "created_at": branch.created_at,
        "updated_at": branch.updated_at,
    }


def build_branch_summary(branches: list[BranchAccount], transactions: list[Transaction]) -> dict:
    items = [build_branch_item(branch, transactions) for branch in branches]
    branch_count = len(items)
    combined_revenue = _round(sum(item["monthly_revenue"] for item in items))
    combined_expense = _round(sum(item["monthly_expense"] for item in items))
    combined_profit_loss = _round(combined_revenue - combined_expense)

    ranked = sorted(items, key=lambda item: item["profit_loss"], reverse=True)
    best = ranked[0] if ranked else None
    weakest = ranked[-1] if ranked else None

    return {
        "account_mode": "combined" if branch_count > 1 else "single",
        "branch_count": branch_count,
        "combined_revenue": combined_revenue,
        "combined_expense": combined_expense,
        "combined_profit_loss": combined_profit_loss,
        "best_branch_name": best["name"] if best else None,
        "best_branch_profit_loss": best["profit_loss"] if best else None,
        "weakest_branch_name": weakest["name"] if weakest else None,
        "weakest_branch_profit_loss": weakest["profit_loss"] if weakest else None,
    }


def build_personal_account_snapshot(analytics_summary: dict, track_record: dict) -> dict:
    snapshot = track_record.get("snapshot", {})
    health = analytics_summary.get("financial_health", {})

    return {
        "label": "Primary personal account",
        "revenue": _round(analytics_summary.get("income_total", 0.0)),
        "expense": _round(analytics_summary.get("expense_total", 0.0)),
        "profit_loss": _round(analytics_summary.get("net_cashflow", 0.0)),
        "average_monthly_savings": _round(snapshot.get("average_monthly_savings", 0.0)),
        "health_score": int(health.get("score", 0)),
    }


def build_profile_workspace_overview(
    profile: UserProfile,
    branches: list[BranchAccount],
    transactions: list[Transaction],
    analytics_summary: dict,
    track_record: dict,
) -> dict:
    return {
        "profile": profile,
        "personal_account": build_personal_account_snapshot(analytics_summary, track_record),
        "branch_summary": build_branch_summary(branches, transactions),
        "branches": [build_branch_item(branch, transactions) for branch in branches],
    }


def build_profile_report(
    profile: UserProfile,
    branches: list[BranchAccount],
    transactions: list[Transaction],
    analytics_summary: dict,
    track_record: dict,
    scope: str,
    branch_id: int | None,
) -> dict:
    generated_at = datetime.utcnow()
    branch_items = [build_branch_item(branch, transactions) for branch in branches]
    branch_summary = build_branch_summary(branches, transactions)
    personal_account = build_personal_account_snapshot(analytics_summary, track_record)
    health = analytics_summary.get("financial_health", {})
    track_snapshot = track_record.get("snapshot", {})
    top_expense = (analytics_summary.get("expense_by_category") or [{}])[0]

    title = "Personal Finance Report"
    metrics: list[dict] = []
    highlights = list(analytics_summary.get("insights", [])[:4])
    recommendations = list(health.get("recommendations", [])[:3])

    if scope == "combined":
        title = "Combined Branch Performance Report"
        metrics = [
            {"label": "Branches", "value": str(branch_summary["branch_count"])},
            {"label": "Combined Revenue", "value": f"{branch_summary['combined_revenue']:.2f}"},
            {"label": "Combined Expense", "value": f"{branch_summary['combined_expense']:.2f}"},
            {"label": "Combined Profit/Loss", "value": f"{branch_summary['combined_profit_loss']:.2f}"},
        ]
        if branch_summary["best_branch_name"]:
            highlights.insert(
                0,
                f"Best branch right now is {branch_summary['best_branch_name']} at {branch_summary['best_branch_profit_loss']:.2f} profit/loss.",
            )
        if branch_summary["weakest_branch_name"] and branch_summary["weakest_branch_name"] != branch_summary["best_branch_name"]:
            highlights.append(
                f"Weakest branch is {branch_summary['weakest_branch_name']} at {branch_summary['weakest_branch_profit_loss']:.2f} profit/loss."
            )
        if branch_summary["combined_profit_loss"] < 0:
            recommendations.append("Combined branch operations are negative. Reduce overhead or lift revenue in the weakest branch first.")
    elif scope == "branch":
        selected = next((item for item in branch_items if item["id"] == branch_id), None)
        if not selected:
            raise ValueError("Branch not found for report generation.")
        title = f"{selected['name']} Branch Report"
        metrics = [
            {"label": "Revenue", "value": f"{selected['monthly_revenue']:.2f}"},
            {"label": "Expense", "value": f"{selected['monthly_expense']:.2f}"},
            {"label": "Profit/Loss", "value": f"{selected['profit_loss']:.2f}"},
            {"label": "Margin", "value": f"{round(selected['margin_pct'] * 100)}%"},
        ]
        highlights.insert(0, f"{selected['name']} is currently at {selected['profit_loss']:.2f} profit/loss.")
        if selected["profit_loss"] < 0:
            recommendations.append(f"{selected['name']} is loss-making. Review branch-level expenses and pricing immediately.")
        else:
            recommendations.append(f"{selected['name']} is profitable. Preserve margin while sustaining revenue consistency.")
    else:
        scope = "personal"
        metrics = [
            {"label": "Income", "value": f"{personal_account['revenue']:.2f}"},
            {"label": "Expense", "value": f"{personal_account['expense']:.2f}"},
            {"label": "Net Cashflow", "value": f"{personal_account['profit_loss']:.2f}"},
            {"label": "Avg Monthly Savings", "value": f"{personal_account['average_monthly_savings']:.2f}"},
            {"label": "Health Score", "value": str(personal_account["health_score"])},
        ]
        if top_expense.get("category"):
            highlights.insert(0, f"Top expense category is {top_expense['category']} at {top_expense['amount']:.2f}.")
        if track_snapshot.get("estimated_monthly_emi", 0) > 0:
            highlights.append(f"Detected monthly EMI or loan load is about {track_snapshot['estimated_monthly_emi']:.2f}.")

    if not recommendations:
        recommendations.append("Keep reviewing your spending, savings, and repayment mix every week.")

    report_lines = [
        title,
        f"Generated for {profile.full_name} on {generated_at.strftime('%Y-%m-%d %H:%M UTC')}",
        "",
        "Metrics:",
    ]
    report_lines.extend([f"- {item['label']}: {item['value']}" for item in metrics])
    report_lines.append("")
    report_lines.append("Highlights:")
    report_lines.extend([f"- {line}" for line in highlights[:5]])
    report_lines.append("")
    report_lines.append("Recommendations:")
    report_lines.extend([f"- {line}" for line in recommendations[:5]])

    return {
        "scope": scope,
        "title": title,
        "generated_at": generated_at,
        "metrics": metrics,
        "highlights": highlights[:5],
        "recommendations": recommendations[:5],
        "report_text": "\n".join(report_lines),
    }
