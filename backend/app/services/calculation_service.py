from __future__ import annotations


import math
from datetime import date

from dateutil.relativedelta import relativedelta


def calculate_loan_emi(principal: float, annual_rate: float, tenure_months: int) -> dict:
    principal = max(0.0, float(principal))
    annual_rate = max(0.0, float(annual_rate))
    tenure_months = max(1, int(tenure_months))

    monthly_rate = annual_rate / 12 / 100
    if monthly_rate == 0:
        emi = principal / tenure_months
    else:
        factor = (1 + monthly_rate) ** tenure_months
        emi = principal * monthly_rate * factor / (factor - 1)

    total_payment = emi * tenure_months
    total_interest = total_payment - principal

    return {
        "emi": round(emi, 2),
        "total_interest": round(total_interest, 2),
        "total_payment": round(total_payment, 2),
    }


def calculate_sip_projection(
    monthly_investment: float,
    annual_return_rate: float,
    years: int,
    annual_step_up_pct: float = 0.0,
) -> dict:
    monthly_investment = max(0.0, float(monthly_investment))
    annual_return_rate = max(0.0, float(annual_return_rate))
    annual_step_up_pct = max(0.0, float(annual_step_up_pct))
    years = max(1, int(years))

    monthly_rate = annual_return_rate / 12 / 100
    months = years * 12

    corpus = 0.0
    contribution = monthly_investment
    invested = 0.0

    for m in range(1, months + 1):
        if m > 1 and (m - 1) % 12 == 0 and annual_step_up_pct > 0:
            contribution *= 1 + annual_step_up_pct / 100
        corpus = corpus * (1 + monthly_rate) + contribution
        invested += contribution

    returns = corpus - invested
    return {
        "invested_amount": round(invested, 2),
        "estimated_returns": round(returns, 2),
        "future_value": round(corpus, 2),
    }


def calculate_goal_plan(
    target_amount: float,
    years: int,
    expected_annual_return_rate: float,
    current_savings: float = 0.0,
) -> dict:
    target_amount = max(0.0, float(target_amount))
    years = max(1, int(years))
    expected_annual_return_rate = max(0.0, float(expected_annual_return_rate))
    current_savings = max(0.0, float(current_savings))

    monthly_rate = expected_annual_return_rate / 12 / 100
    months = years * 12
    current_future_value = current_savings * ((1 + monthly_rate) ** months)

    gap = max(0.0, target_amount - current_future_value)

    if monthly_rate == 0:
        monthly_required = gap / months
    else:
        factor = ((1 + monthly_rate) ** months - 1) / monthly_rate
        monthly_required = gap / factor if factor > 0 else gap / months

    projected_with_required = current_future_value
    for _ in range(months):
        projected_with_required = projected_with_required * (1 + monthly_rate) + monthly_required

    return {
        "target_amount": round(target_amount, 2),
        "current_savings_future_value": round(current_future_value, 2),
        "required_monthly_investment": round(monthly_required, 2),
        "projected_goal_value": round(projected_with_required, 2),
        "goal_gap_today": round(gap, 2),
    }


def calculate_retirement_plan(
    current_age: int,
    retirement_age: int,
    monthly_expense_today: float,
    inflation_rate: float,
    post_retirement_return_rate: float,
    life_expectancy: int,
) -> dict:
    current_age = max(18, int(current_age))
    retirement_age = max(current_age + 1, int(retirement_age))
    monthly_expense_today = max(0.0, float(monthly_expense_today))
    inflation_rate = max(0.0, float(inflation_rate))
    post_retirement_return_rate = max(0.0, float(post_retirement_return_rate))
    life_expectancy = max(retirement_age + 1, int(life_expectancy))

    years_to_retire = retirement_age - current_age
    years_after_retire = life_expectancy - retirement_age

    expense_at_retirement = monthly_expense_today * ((1 + inflation_rate / 100) ** years_to_retire)

    annual_expense = expense_at_retirement * 12
    real_return = ((1 + post_retirement_return_rate / 100) / (1 + inflation_rate / 100)) - 1

    if abs(real_return) < 1e-9:
        required_corpus = annual_expense * years_after_retire
    else:
        required_corpus = annual_expense * (1 - (1 + real_return) ** (-years_after_retire)) / real_return

    required_corpus = max(0.0, required_corpus)

    return {
        "expense_at_retirement_per_month": round(expense_at_retirement, 2),
        "required_retirement_corpus": round(required_corpus, 2),
        "years_to_retire": years_to_retire,
        "years_in_retirement": years_after_retire,
    }


def calculate_debt_payoff(debts: list[dict], strategy: str = "avalanche", extra_payment: float = 0.0) -> dict:
    strategy = strategy.lower().strip()
    if strategy not in {"avalanche", "snowball"}:
        strategy = "avalanche"

    extra_payment = max(0.0, float(extra_payment))
    debt_items = []
    for debt in debts:
        debt_items.append(
            {
                "name": debt["name"],
                "balance": max(0.0, float(debt["balance"])),
                "annual_rate": max(0.0, float(debt["annual_rate"])),
                "min_payment": max(0.0, float(debt["min_payment"])),
            }
        )

    months = 0
    total_interest = 0.0
    total_paid = 0.0
    payoff_order: list[str] = []

    # Safety cap to avoid infinite loops on invalid debt/payment combinations.
    for _ in range(720):
        active = [d for d in debt_items if d["balance"] > 0.01]
        if not active:
            break

        months += 1
        for debt in active:
            monthly_rate = debt["annual_rate"] / 12 / 100
            interest = debt["balance"] * monthly_rate
            debt["balance"] += interest
            total_interest += interest

        if strategy == "avalanche":
            ordered = sorted(active, key=lambda d: (-d["annual_rate"], d["balance"]))
        else:
            ordered = sorted(active, key=lambda d: (d["balance"], -d["annual_rate"]))

        payment_pool = sum(d["min_payment"] for d in active) + extra_payment
        for debt in ordered:
            if debt["balance"] <= 0:
                continue
            pay = min(debt["balance"], debt["min_payment"])
            debt["balance"] -= pay
            payment_pool -= pay
            total_paid += pay
            if debt["balance"] <= 0.01 and debt["name"] not in payoff_order:
                payoff_order.append(debt["name"])

        for debt in ordered:
            if payment_pool <= 0:
                break
            if debt["balance"] <= 0:
                continue
            pay = min(debt["balance"], payment_pool)
            debt["balance"] -= pay
            payment_pool -= pay
            total_paid += pay
            if debt["balance"] <= 0.01 and debt["name"] not in payoff_order:
                payoff_order.append(debt["name"])

    projected_payoff_date = (date.today() + relativedelta(months=months)).isoformat()
    return {
        "strategy": strategy,
        "months_to_debt_free": months,
        "projected_payoff_date": projected_payoff_date,
        "total_interest_paid": round(total_interest, 2),
        "total_paid": round(total_paid, 2),
        "payoff_order": payoff_order,
    }


def calculate_tax_set_aside(monthly_income: float, effective_tax_rate: float, safety_buffer_pct: float = 10.0) -> dict:
    monthly_income = max(0.0, float(monthly_income))
    effective_tax_rate = max(0.0, min(80.0, float(effective_tax_rate)))
    safety_buffer_pct = max(0.0, min(100.0, float(safety_buffer_pct)))

    monthly_tax = monthly_income * (effective_tax_rate / 100)
    monthly_tax *= 1 + safety_buffer_pct / 100

    return {
        "monthly_tax_set_aside": round(monthly_tax, 2),
        "quarterly_tax_set_aside": round(monthly_tax * 3, 2),
        "annual_tax_set_aside": round(monthly_tax * 12, 2),
    }


def calculate_emergency_fund(
    current_fund: float,
    monthly_expense: float,
    target_months: int = 6,
    monthly_contribution: float = 300.0,
    annual_return_rate: float = 0.0,
) -> dict:
    current_fund = max(0.0, float(current_fund))
    monthly_expense = max(0.0, float(monthly_expense))
    target_months = max(1, min(24, int(target_months)))
    monthly_contribution = max(0.0, float(monthly_contribution))
    annual_return_rate = max(0.0, min(30.0, float(annual_return_rate)))

    target_fund = monthly_expense * target_months
    funding_gap = max(0.0, target_fund - current_fund)

    monthly_rate = annual_return_rate / 12 / 100
    fund = current_fund
    months = 0

    if funding_gap > 0 and monthly_contribution > 0:
        for _ in range(600):
            if fund >= target_fund:
                break
            fund = fund * (1 + monthly_rate) + monthly_contribution
            months += 1
        if fund < target_fund:
            months = math.ceil(funding_gap / monthly_contribution)
            fund = current_fund + monthly_contribution * months

    return {
        "target_fund": round(target_fund, 2),
        "current_fund": round(current_fund, 2),
        "funding_gap": round(funding_gap, 2),
        "months_to_target": months,
        "projected_completion_value": round(fund, 2),
    }


def calculate_net_worth_projection(
    current_assets: float,
    current_liabilities: float,
    monthly_investment: float,
    annual_return_rate: float = 8.0,
    months: int = 24,
    monthly_liability_payment: float = 0.0,
    liability_interest_rate: float = 0.0,
) -> dict:
    assets = max(0.0, float(current_assets))
    liabilities = max(0.0, float(current_liabilities))
    monthly_investment = max(0.0, float(monthly_investment))
    annual_return_rate = max(0.0, min(30.0, float(annual_return_rate)))
    months = max(1, min(120, int(months)))
    monthly_liability_payment = max(0.0, float(monthly_liability_payment))
    liability_interest_rate = max(0.0, min(30.0, float(liability_interest_rate)))

    asset_rate = annual_return_rate / 12 / 100
    debt_rate = liability_interest_rate / 12 / 100

    points = []
    start_net = assets - liabilities

    for i in range(1, months + 1):
        assets = assets * (1 + asset_rate) + monthly_investment
        liabilities = max(0.0, liabilities * (1 + debt_rate) - monthly_liability_payment)
        points.append(
            {
                "month_index": i,
                "assets": round(assets, 2),
                "liabilities": round(liabilities, 2),
                "net_worth": round(assets - liabilities, 2),
            }
        )

    return {
        "start_net_worth": round(start_net, 2),
        "projected_net_worth": round(points[-1]["net_worth"] if points else start_net, 2),
        "projection": points,
    }
