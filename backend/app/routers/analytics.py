from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Transaction
from app.repositories.analytics_repository import AnalyticsRepository
from app.security.auth import AuthUser, get_current_user
from app.services.forecast_engine import forecast_next_month_advanced

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary")
def summary(
    db: Session = Depends(get_db),
    _: AuthUser = Depends(get_current_user),
):
    repo = AnalyticsRepository(db)
    monthly = repo.monthly_income_expense()
    latest = monthly[-1] if monthly else {"month": datetime.utcnow().strftime("%Y-%m"), "income": 0.0, "expense": 0.0}

    category_totals = (
        db.query(Transaction.category, func.sum(func.abs(Transaction.amount_inr)).label("amount"))
        .filter(Transaction.is_income.is_(False))
        .group_by(Transaction.category)
        .order_by(func.sum(func.abs(Transaction.amount_inr)).desc())
        .all()
    )
    highest_category = category_totals[0][0] if category_totals else None

    largest_tx = (
        db.query(Transaction)
        .filter(Transaction.is_income.is_(False))
        .order_by(func.abs(Transaction.amount_inr).desc())
        .first()
    )
    top_merchants = (
        db.query(Transaction.merchant, func.count(Transaction.id).label("count"))
        .filter(Transaction.is_income.is_(False))
        .group_by(Transaction.merchant)
        .order_by(func.count(Transaction.id).desc())
        .limit(5)
        .all()
    )
    daily_spending = (
        db.query(Transaction.date, func.sum(func.abs(Transaction.amount_inr)).label("amount"))
        .filter(Transaction.is_income.is_(False))
        .group_by(Transaction.date)
        .order_by(Transaction.date.asc())
        .all()
    )

    return {
        "month": latest["month"],
        "total_monthly_spending": round(latest["expense"], 2),
        "total_monthly_income": round(latest["income"], 2),
        "net_savings": round(latest["income"] - latest["expense"], 2),
        "highest_category": highest_category,
        "largest_transaction": {
            "description": largest_tx.description,
            "amount_inr": round(abs(largest_tx.amount_inr), 2),
        }
        if largest_tx
        else None,
        "top_merchants": [{"merchant": m, "count": c} for m, c in top_merchants],
        "daily_spending_heatmap": [{"date": d.isoformat(), "amount": round(a, 2)} for d, a in daily_spending],
    }


@router.get("/categories")
def categories(
    db: Session = Depends(get_db),
    _: AuthUser = Depends(get_current_user),
):
    rows = (
        db.query(Transaction.category, func.sum(func.abs(Transaction.amount_inr)).label("amount"))
        .filter(Transaction.is_income.is_(False))
        .group_by(Transaction.category)
        .order_by(func.sum(func.abs(Transaction.amount_inr)).desc())
        .all()
    )
    return [{"category": category, "amount": round(float(amount or 0.0), 2)} for category, amount in rows]


@router.get("/monthly-trend")
def monthly_trend(
    db: Session = Depends(get_db),
    _: AuthUser = Depends(get_current_user),
):
    repo = AnalyticsRepository(db)
    return [
        {
            "month": row["month"],
            "income": round(row["income"], 2),
            "expense": round(row["expense"], 2),
        }
        for row in repo.monthly_income_expense()
    ]


@router.get("/monthly-summary")
def monthly_summary(
    db: Session = Depends(get_db),
    _: AuthUser = Depends(get_current_user),
):
    repo = AnalyticsRepository(db)
    data = repo.monthly_income_expense()
    return [
        {
            "month": row["month"],
            "total_income": round(row["income"], 2),
            "total_expense": round(row["expense"], 2),
            "net_savings": round(row["income"] - row["expense"], 2),
        }
        for row in data
    ]


@router.get("/category-distribution")
def category_distribution(
    month: int | None = Query(default=None, ge=1, le=12),
    year: int | None = Query(default=None, ge=2000, le=2100),
    db: Session = Depends(get_db),
    _: AuthUser = Depends(get_current_user),
):
    repo = AnalyticsRepository(db)
    if year is None or month is None:
        latest = repo.latest_expense_month()
        if latest is None:
            return {"month": None, "distribution": []}
        year, month = latest

    data = repo.category_distribution(year=year, month=month)
    return {"month": f"{year:04d}-{month:02d}", "distribution": data}


@router.get("/income-vs-expense")
def income_vs_expense(
    db: Session = Depends(get_db),
    _: AuthUser = Depends(get_current_user),
):
    repo = AnalyticsRepository(db)
    return repo.monthly_income_expense()


@router.get("/savings-rate")
def savings_rate(
    db: Session = Depends(get_db),
    _: AuthUser = Depends(get_current_user),
):
    repo = AnalyticsRepository(db)
    series = []
    for row in repo.monthly_income_expense():
        income = row["income"]
        expense = row["expense"]
        rate = ((income - expense) / income) * 100 if income > 0 else 0.0
        series.append(
            {
                "month": row["month"],
                "income": round(income, 2),
                "expense": round(expense, 2),
                "savings_rate": round(rate, 2),
            }
        )
    return series


@router.get("/forecast")
def forecast(
    db: Session = Depends(get_db),
    _: AuthUser = Depends(get_current_user),
):
    txs = db.query(Transaction).all()
    return forecast_next_month_advanced(txs)
