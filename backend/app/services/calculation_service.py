from __future__ import annotations


import math


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
