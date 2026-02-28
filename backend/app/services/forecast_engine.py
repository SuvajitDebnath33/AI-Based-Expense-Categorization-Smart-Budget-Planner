from collections import defaultdict
from math import sqrt

from app.models import Transaction


def _fit_linear_regression(values: list[float]) -> tuple[float, float]:
    n = len(values)
    x = list(range(n))
    sum_x = sum(x)
    sum_y = sum(values)
    sum_xx = sum(i * i for i in x)
    sum_xy = sum(i * values[i] for i in x)

    denominator = (n * sum_xx) - (sum_x * sum_x)
    if denominator == 0:
        return 0.0, values[-1] if values else 0.0

    slope = ((n * sum_xy) - (sum_x * sum_y)) / denominator
    intercept = (sum_y - slope * sum_x) / n
    return slope, intercept


def _next_month_label(last_month: str) -> str:
    year, month = map(int, last_month.split("-"))
    next_month = month + 1
    next_year = year
    if next_month == 13:
        next_month = 1
        next_year += 1
    return f"{next_year:04d}-{next_month:02d}"


def forecast_next_month_advanced(transactions: list[Transaction]) -> dict:
    monthly = defaultdict(float)
    for tx in transactions:
        if tx.is_income:
            continue
        key = tx.date.strftime("%Y-%m")
        monthly[key] += abs(tx.amount_inr)

    keys = sorted(monthly.keys())
    if len(keys) < 2:
        return {"month": "insufficient-data", "predicted_amount": 0.0, "confidence_interval": None}

    y = [monthly[k] for k in keys]
    slope, intercept = _fit_linear_regression(y)
    n = len(y)
    prediction = max((slope * n) + intercept, 0.0)

    residuals = [y[i] - ((slope * i) + intercept) for i in range(n)]
    if n > 2:
        variance = sum(r * r for r in residuals) / (n - 2)
        stderr = sqrt(max(variance, 0.0))
        margin = 1.96 * stderr
        confidence = (round(max(prediction - margin, 0.0), 2), round(prediction + margin, 2))
    else:
        confidence = None

    return {
        "month": _next_month_label(keys[-1]),
        "predicted_amount": round(float(prediction), 2),
        "confidence_interval": confidence,
    }


def forecast_next_month(transactions: list[Transaction]) -> dict:
    advanced = forecast_next_month_advanced(transactions)
    return {
        "month": advanced["month"],
        "predicted_spending": advanced["predicted_amount"],
    }
