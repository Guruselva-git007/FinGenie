from __future__ import annotations

from collections import defaultdict
from datetime import date
from statistics import mean, pstdev

import numpy as np
from dateutil.relativedelta import relativedelta
from sklearn.ensemble import IsolationForest, RandomForestRegressor
from sklearn.preprocessing import MinMaxScaler

from app.models.budget import Budget
from app.models.transaction import Transaction, TransactionKind


def _month_start(value: date) -> date:
    return value.replace(day=1)


def _normalized_text(text: str) -> str:
    cleaned = "".join(ch.lower() if ch.isalnum() or ch.isspace() else " " for ch in text)
    return " ".join(cleaned.split())


def _monthly_cashflow(transactions: list[Transaction]) -> list[dict]:
    monthly_income = defaultdict(float)
    monthly_expense = defaultdict(float)

    for tx in transactions:
        month = _month_start(tx.transaction_date)
        if tx.kind == TransactionKind.INCOME:
            monthly_income[month] += float(tx.amount)
        else:
            monthly_expense[month] += float(tx.amount)

    if not monthly_income and not monthly_expense:
        today = _month_start(date.today())
        return [{"month": today, "income": 0.0, "expense": 0.0, "net": 0.0}]

    start = min(list(monthly_income.keys()) + list(monthly_expense.keys()))
    end = max(list(monthly_income.keys()) + list(monthly_expense.keys()))

    current = start
    rows = []
    while current <= end:
        income = float(monthly_income.get(current, 0.0))
        expense = float(monthly_expense.get(current, 0.0))
        rows.append(
            {
                "month": current,
                "income": round(income, 2),
                "expense": round(expense, 2),
                "net": round(income - expense, 2),
            }
        )
        current = current + relativedelta(months=1)

    return rows


def detect_spending_anomalies(transactions: list[Transaction], max_items: int = 6) -> list[dict]:
    expenses = [tx for tx in transactions if tx.kind == TransactionKind.EXPENSE]
    if len(expenses) < 8:
        return []

    categories = sorted({tx.category for tx in expenses})
    category_index = {name: idx for idx, name in enumerate(categories)}

    X = []
    for tx in expenses:
        X.append(
            [
                float(tx.amount),
                float(tx.transaction_date.day),
                float(tx.transaction_date.weekday()),
                float(category_index.get(tx.category, 0)),
                float(len(tx.description)),
            ]
        )

    X_arr = np.array(X, dtype=np.float32)
    contamination = min(0.2, max(0.06, 5 / len(expenses)))
    model = IsolationForest(random_state=42, contamination=contamination, n_estimators=200)
    labels = model.fit_predict(X_arr)
    scores = model.decision_function(X_arr)

    p90 = float(np.percentile([tx.amount for tx in expenses], 90))
    anomalies = []
    for idx, tx in enumerate(expenses):
        if labels[idx] != -1:
            continue
        reason = "Unusual combination of category/date/amount."
        if float(tx.amount) >= p90:
            reason = "Higher-than-usual amount for your spending pattern."

        anomalies.append(
            {
                "transaction_id": tx.id,
                "transaction_date": tx.transaction_date.isoformat(),
                "description": tx.description,
                "category": tx.category,
                "amount": round(float(tx.amount), 2),
                "anomaly_score": round(float(scores[idx]), 4),
                "reason": reason,
            }
        )

    anomalies.sort(key=lambda row: row["anomaly_score"])
    return anomalies[:max_items]


def detect_recurring_expenses(transactions: list[Transaction], max_items: int = 10) -> list[dict]:
    expenses = [tx for tx in transactions if tx.kind == TransactionKind.EXPENSE]
    grouped: dict[str, list[Transaction]] = defaultdict(list)

    for tx in expenses:
        normalized = _normalized_text(tx.description)
        key = f"{normalized}|{round(float(tx.amount), 2)}"
        grouped[key].append(tx)

    recurring = []
    for txs in grouped.values():
        if len(txs) < 3:
            continue

        ordered = sorted(txs, key=lambda item: item.transaction_date)
        gaps = [(ordered[i].transaction_date - ordered[i - 1].transaction_date).days for i in range(1, len(ordered))]
        if not gaps:
            continue

        avg_gap = mean(gaps)
        std_gap = pstdev(gaps) if len(gaps) > 1 else 0.0

        cadence = None
        cadence_days = None
        if 25 <= avg_gap <= 35 and std_gap <= 4:
            cadence = "monthly"
            cadence_days = 30
        elif 6 <= avg_gap <= 8 and std_gap <= 2:
            cadence = "weekly"
            cadence_days = 7

        if cadence is None or cadence_days is None:
            continue

        last_tx = ordered[-1]
        recurring.append(
            {
                "description": last_tx.description,
                "category": last_tx.category,
                "amount": round(float(last_tx.amount), 2),
                "cadence": cadence,
                "last_date": last_tx.transaction_date.isoformat(),
                "next_expected_date": (last_tx.transaction_date + relativedelta(days=cadence_days)).isoformat(),
                "confidence": round(max(0.0, 1.0 - std_gap / max(avg_gap, 1.0)), 3),
            }
        )

    recurring.sort(key=lambda item: (item["cadence"], -item["amount"]))
    return recurring[:max_items]


def predict_savings_ml(transactions: list[Transaction], months: int = 3) -> list[dict]:
    monthly = _monthly_cashflow(transactions)
    months = max(1, min(months, 12))

    if len(monthly) < 2:
        base_month = _month_start(date.today())
        return [
            {
                "month": (base_month + relativedelta(months=i + 1)).isoformat(),
                "predicted_net_savings": 0.0,
                "algorithm": "moving_average",
            }
            for i in range(months)
        ]

    nets = [row["net"] for row in monthly]
    lookback = 3

    if len(monthly) >= 8:
        X, y = [], []
        for i in range(lookback, len(monthly)):
            prev = monthly[i - lookback : i]
            feat = []
            for row in prev:
                feat.extend([row["income"], row["expense"], row["net"]])
            X.append(feat)
            y.append(monthly[i]["net"])

        if len(X) >= 4:
            model = RandomForestRegressor(n_estimators=240, random_state=42, min_samples_leaf=1)
            model.fit(np.array(X, dtype=np.float32), np.array(y, dtype=np.float32))

            rolling = monthly[-lookback:]
            predictions = []
            for i in range(months):
                feat = []
                for row in rolling:
                    feat.extend([row["income"], row["expense"], row["net"]])
                pred = float(model.predict(np.array([feat], dtype=np.float32))[0])
                pred = round(pred, 2)

                next_month = monthly[-1]["month"] + relativedelta(months=i + 1)
                predictions.append(
                    {
                        "month": next_month.isoformat(),
                        "predicted_net_savings": pred,
                        "algorithm": "random_forest",
                    }
                )

                avg_income = float(np.mean([row["income"] for row in rolling]))
                avg_expense = max(0.0, avg_income - pred)
                rolling = rolling[1:] + [{"month": next_month, "income": avg_income, "expense": avg_expense, "net": pred}]

            return predictions

    window = min(3, len(nets))
    rolling = nets[:]
    predictions = []
    for i in range(months):
        pred = round(float(np.mean(rolling[-window:])), 2)
        next_month = monthly[-1]["month"] + relativedelta(months=i + 1)
        predictions.append(
            {
                "month": next_month.isoformat(),
                "predicted_net_savings": pred,
                "algorithm": "moving_average",
            }
        )
        rolling.append(pred)

    return predictions


def predict_savings_dl(transactions: list[Transaction], months: int = 3) -> list[dict]:
    monthly = _monthly_cashflow(transactions)
    months = max(1, min(months, 12))

    try:
        from tensorflow import keras  # type: ignore
    except Exception:
        base = predict_savings_ml(transactions, months=months)
        for row in base:
            row["algorithm"] = "dl_fallback_ml"
        return base

    if len(monthly) < 8:
        base = predict_savings_ml(transactions, months=months)
        for row in base:
            row["algorithm"] = "dl_fallback_ml"
        return base

    try:
        sequence = np.array([row["net"] for row in monthly], dtype=np.float32).reshape(-1, 1)
        scaler = MinMaxScaler()
        scaled = scaler.fit_transform(sequence)

        lookback = 3
        X, y = [], []
        for i in range(len(scaled) - lookback):
            X.append(scaled[i : i + lookback])
            y.append(scaled[i + lookback])

        X_arr = np.array(X)
        y_arr = np.array(y)

        keras.utils.set_random_seed(42)
        model = keras.Sequential(
            [
                keras.layers.Input(shape=(lookback, 1)),
                keras.layers.LSTM(20, activation="tanh"),
                keras.layers.Dense(8, activation="relu"),
                keras.layers.Dense(1),
            ]
        )
        model.compile(optimizer="adam", loss="mse")
        model.fit(X_arr, y_arr, epochs=70, batch_size=4, verbose=0)

        recent = scaled[-lookback:].reshape(1, lookback, 1)
        predictions = []
        for i in range(months):
            pred_scaled = float(model.predict(recent, verbose=0)[0][0])
            pred = float(scaler.inverse_transform([[pred_scaled]])[0][0])
            pred = round(pred, 2)
            next_month = monthly[-1]["month"] + relativedelta(months=i + 1)
            predictions.append(
                {
                    "month": next_month.isoformat(),
                    "predicted_net_savings": pred,
                    "algorithm": "lstm",
                }
            )

            recent = np.concatenate([recent[:, 1:, :], np.array([[[pred_scaled]]], dtype=np.float32)], axis=1)

        return predictions
    except Exception:
        base = predict_savings_ml(transactions, months=months)
        for row in base:
            row["algorithm"] = "dl_fallback_ml"
        return base


def optimize_budget_with_ml(transactions: list[Transaction], budgets: list[Budget], target_savings_rate: float = 0.2) -> dict:
    target_savings_rate = max(0.05, min(target_savings_rate, 0.6))
    monthly = _monthly_cashflow(transactions)

    avg_income = float(np.mean([row["income"] for row in monthly])) if monthly else 0.0
    avg_expense = float(np.mean([row["expense"] for row in monthly])) if monthly else 0.0
    current_savings = avg_income - avg_expense
    current_rate = 0.0 if avg_income <= 0 else current_savings / avg_income

    category_spend = defaultdict(float)
    month_count = len({_month_start(tx.transaction_date) for tx in transactions if tx.kind == TransactionKind.EXPENSE})
    month_count = max(1, month_count)
    for tx in transactions:
        if tx.kind == TransactionKind.EXPENSE:
            category_spend[tx.category] += float(tx.amount)

    avg_category_spend = {cat: total / month_count for cat, total in category_spend.items()}

    target_expense = avg_income * (1.0 - target_savings_rate)
    reduction_needed = max(0.0, avg_expense - target_expense)

    discretionary = {"dining", "shopping", "entertainment", "travel", "other"}
    category_priority = sorted(
        avg_category_spend.items(),
        key=lambda item: (item[0] not in discretionary, -item[1]),
    )

    adjustments = []
    remaining = reduction_needed
    budget_lookup = {b.category: float(b.monthly_limit) for b in budgets}

    for category, spend in category_priority:
        base_cut = 0.18 if category in discretionary else 0.08
        max_cut_value = spend * base_cut
        cut_value = min(max_cut_value, remaining)
        recommended = max(0.0, spend - cut_value)

        adjustments.append(
            {
                "category": category,
                "current_avg_spend": round(spend, 2),
                "current_budget_limit": round(budget_lookup.get(category, spend), 2),
                "recommended_limit": round(recommended, 2),
                "suggested_cut": round(cut_value, 2),
            }
        )

        remaining = max(0.0, remaining - cut_value)

    return {
        "target_savings_rate": round(target_savings_rate, 3),
        "current_savings_rate": round(current_rate, 3),
        "monthly_reduction_needed": round(reduction_needed, 2),
        "budget_plan": adjustments,
    }


def build_automation_insights(
    transactions: list[Transaction],
    budgets: list[Budget],
    forecast_months: int = 3,
) -> dict:
    anomalies = detect_spending_anomalies(transactions)
    recurring = detect_recurring_expenses(transactions)
    savings_ml = predict_savings_ml(transactions, months=forecast_months)
    savings_dl = predict_savings_dl(transactions, months=forecast_months)
    optimization = optimize_budget_with_ml(transactions, budgets)

    auto_actions: list[str] = []
    if anomalies:
        auto_actions.append("Review flagged anomalies and confirm if each one is valid or suspicious.")
    if recurring:
        auto_actions.append("Convert recurring expenses into scheduled budget reservations before month start.")
    if optimization["monthly_reduction_needed"] > 0:
        auto_actions.append("Apply the suggested category cuts to reach your target savings rate.")
    if not auto_actions:
        auto_actions.append("Automation engine sees stable patterns; keep weekly monitoring enabled.")

    return {
        "anomalies": anomalies,
        "recurring_expenses": recurring,
        "savings_prediction_ml": savings_ml,
        "savings_prediction_dl": savings_dl,
        "budget_optimization": optimization,
        "auto_actions": auto_actions,
    }
