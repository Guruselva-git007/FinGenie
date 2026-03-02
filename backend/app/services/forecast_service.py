from __future__ import annotations

from collections import defaultdict
from datetime import date
from functools import lru_cache

import numpy as np
from dateutil.relativedelta import relativedelta
from sklearn.preprocessing import MinMaxScaler

from app.models.transaction import Transaction, TransactionKind


def _month_start(value: date) -> date:
    return value.replace(day=1)


def _aggregate_monthly_expenses(transactions: list[Transaction]) -> tuple[list[date], list[float]]:
    monthly = defaultdict(float)
    for tx in transactions:
        if tx.kind == TransactionKind.EXPENSE:
            monthly[_month_start(tx.transaction_date)] += float(tx.amount)

    if not monthly:
        return [], []

    start, end = min(monthly), max(monthly)
    current = start
    months: list[date] = []
    values: list[float] = []

    while current <= end:
        months.append(current)
        values.append(round(monthly.get(current, 0.0), 2))
        current = current + relativedelta(months=1)

    return months, values


def _moving_average_forecast(values: list[float], months: int) -> list[float]:
    window = min(3, len(values))
    if window == 0:
        return [0.0] * months

    series = values[:]
    predictions = []
    for _ in range(months):
        pred = float(np.mean(series[-window:]))
        predictions.append(round(max(pred, 0.0), 2))
        series.append(pred)
    return predictions


def _get_keras():
    try:
        from tensorflow import keras  # type: ignore

        return keras
    except Exception:
        return None


def _build_lstm_model(lookback: int, keras):
    model = keras.Sequential(
        [
            keras.layers.Input(shape=(lookback, 1)),
            keras.layers.LSTM(24, activation="tanh"),
            keras.layers.Dense(12, activation="relu"),
            keras.layers.Dense(1),
        ]
    )
    model.compile(optimizer="adam", loss="mse")
    return model


@lru_cache(maxsize=128)
def _forecast_values(values: tuple[float, ...], months: int) -> tuple[float, ...]:
    values_list = list(values)
    months = max(1, min(months, 12))

    if len(values_list) < 6:
        return tuple(_moving_average_forecast(values_list, months))

    keras = _get_keras()
    if keras is None:
        return tuple(_moving_average_forecast(values_list, months))

    try:
        np.random.seed(42)
        keras.utils.set_random_seed(42)

        lookback = 3
        series = np.array(values_list, dtype=np.float32).reshape(-1, 1)
        scaler = MinMaxScaler()
        scaled = scaler.fit_transform(series)

        X, y = [], []
        for i in range(len(scaled) - lookback):
            X.append(scaled[i : i + lookback])
            y.append(scaled[i + lookback])

        if len(X) < 2:
            return tuple(_moving_average_forecast(values_list, months))

        X_arr = np.array(X)
        y_arr = np.array(y)

        model = _build_lstm_model(lookback, keras)
        model.fit(X_arr, y_arr, epochs=80, batch_size=4, verbose=0)

        recent = scaled[-lookback:].reshape(1, lookback, 1)
        predictions: list[float] = []
        for _ in range(months):
            pred_scaled = model.predict(recent, verbose=0)[0][0]
            pred_value = scaler.inverse_transform([[pred_scaled]])[0][0]
            pred_value = float(max(pred_value, 0.0))
            predictions.append(round(pred_value, 2))

            next_step = np.array([[[pred_scaled]]], dtype=np.float32)
            recent = np.concatenate([recent[:, 1:, :], next_step], axis=1)

        return tuple(predictions)
    except Exception:
        return tuple(_moving_average_forecast(values_list, months))


def generate_spending_forecast(transactions: list[Transaction], months: int = 3) -> list[dict]:
    base_months, values = _aggregate_monthly_expenses(transactions)
    months = max(1, min(months, 12))

    if not base_months:
        today_month = _month_start(date.today())
        return [
            {
                "month": (today_month + relativedelta(months=i + 1)).isoformat(),
                "predicted_spending": 0.0,
            }
            for i in range(months)
        ]

    predictions = list(_forecast_values(tuple(values), months))

    last_month = base_months[-1]
    return [
        {
            "month": (last_month + relativedelta(months=i + 1)).isoformat(),
            "predicted_spending": predictions[i],
        }
        for i in range(months)
    ]
