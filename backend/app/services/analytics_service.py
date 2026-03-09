from __future__ import annotations

from datetime import datetime

from sqlalchemy import Numeric, cast, extract, func
from sqlalchemy.orm import Session

from app.models import Budget, Transaction
from app.repositories.analytics_repository import AnalyticsRepository
from app.services.forecast_engine import forecast_next_month_advanced


class AnalyticsService:
    def __init__(self, db: Session, user_id: int) -> None:
        self.db = db
        self.user_id = user_id
        self.repo = AnalyticsRepository(db)

    def _transactions_query(self):
        return self.db.query(Transaction).filter(Transaction.user_id == self.user_id)

    def latest_month_key(self) -> str:
        monthly = self.repo.monthly_income_expense(self.user_id)
        return monthly[-1]["month"] if monthly else datetime.utcnow().strftime("%Y-%m")

    def dashboard_snapshot(self) -> dict:
        monthly = self.repo.monthly_income_expense(self.user_id)
        latest = monthly[-1] if monthly else {"month": self.latest_month_key(), "income": 0.0, "expense": 0.0}
        current_year, current_month = map(int, latest["month"].split("-"))

        top_category_row = (
            self.db.query(Transaction.category, func.sum(func.abs(Transaction.amount_inr)).label("amount"))
            .filter(
                Transaction.user_id == self.user_id,
                Transaction.is_income.is_(False),
                extract("year", Transaction.date) == current_year,
                extract("month", Transaction.date) == current_month,
            )
            .group_by(Transaction.category)
            .order_by(func.sum(func.abs(Transaction.amount_inr)).desc())
            .first()
        )
        budgets = (
            self.db.query(Budget)
            .filter(Budget.user_id == self.user_id, Budget.month == current_month, Budget.year == current_year)
            .all()
        )
        total_budget = sum(float(item.monthly_limit) for item in budgets)
        remaining_budget = (total_budget - latest["expense"]) if total_budget else 0.0
        return {
            "month": latest["month"],
            "total_spending": round(latest["expense"], 2),
            "monthly_budget": round(total_budget, 2),
            "top_category": top_category_row[0] if top_category_row else "N/A",
            "remaining_budget": round(remaining_budget, 2),
        }

    def monthly_category_spending(self) -> list[dict]:
        year_expr = extract("year", Transaction.date)
        month_expr = extract("month", Transaction.date)
        rows = (
            self.db.query(
                year_expr.label("year"),
                month_expr.label("month"),
                Transaction.category,
                func.sum(func.abs(Transaction.amount_inr)).label("amount"),
            )
            .filter(Transaction.user_id == self.user_id, Transaction.is_income.is_(False))
            .group_by(year_expr, month_expr, Transaction.category)
            .order_by(year_expr, month_expr, Transaction.category)
            .all()
        )
        return [
            {
                "month": f"{int(year):04d}-{int(month):02d}",
                "category": category,
                "amount": round(float(amount or 0.0), 2),
            }
            for year, month, category, amount in rows
        ]

    def category_totals(self, year: int | None = None, month: int | None = None) -> list[dict]:
        query = (
            self.db.query(Transaction.category, func.sum(func.abs(Transaction.amount_inr)).label("amount"))
            .filter(Transaction.user_id == self.user_id, Transaction.is_income.is_(False))
        )
        if year is not None and month is not None:
            query = query.filter(extract("year", Transaction.date) == year, extract("month", Transaction.date) == month)
        rows = query.group_by(Transaction.category).order_by(func.sum(func.abs(Transaction.amount_inr)).desc()).all()
        return [{"category": category, "amount": round(float(amount or 0.0), 2)} for category, amount in rows]

    def duplicate_transactions(self) -> list[dict]:
        rounded_amount = cast(func.abs(Transaction.amount_inr), Numeric(12, 2))
        rows = (
            self.db.query(
                Transaction.clean_description,
                rounded_amount.label("amount"),
                func.count(Transaction.id).label("count"),
            )
            .filter(Transaction.user_id == self.user_id, Transaction.is_income.is_(False))
            .group_by(Transaction.clean_description, rounded_amount)
            .having(func.count(Transaction.id) > 1)
            .order_by(func.count(Transaction.id).desc())
            .all()
        )
        return [
            {
                "description": description,
                "amount": float(amount or 0.0),
                "count": int(count),
            }
            for description, amount, count in rows
        ]

    def subscriptions(self) -> list[dict]:
        rows = (
            self.db.query(Transaction.merchant, Transaction.recurrence, func.avg(func.abs(Transaction.amount_inr)).label("amount"))
            .filter(Transaction.user_id == self.user_id, Transaction.is_subscription.is_(True))
            .group_by(Transaction.merchant, Transaction.recurrence)
            .order_by(func.avg(func.abs(Transaction.amount_inr)).desc())
            .all()
        )
        return [
            {
                "merchant": merchant,
                "recurrence": recurrence,
                "average_amount": round(float(amount or 0.0), 2),
            }
            for merchant, recurrence, amount in rows
        ]

    def forecast(self) -> dict:
        txs = self._transactions_query().all()
        return forecast_next_month_advanced(txs)

    def budget_insights(self) -> dict:
        snapshot = self.dashboard_snapshot()
        latest_month = snapshot["month"]
        forecast = self.forecast()
        current_year, current_month = map(int, latest_month.split("-"))
        budgets = (
            self.db.query(Budget)
            .filter(Budget.user_id == self.user_id, Budget.month == current_month, Budget.year == current_year)
            .all()
        )

        spent_by_category = {
            item["category"]: item["amount"]
            for item in self.category_totals(year=current_year, month=current_month)
        }
        alerts = []
        budget_rows = []
        for budget in budgets:
            spent = spent_by_category.get(budget.category, 0.0)
            remaining = round(float(budget.monthly_limit) - spent, 2)
            exceeded = spent > float(budget.monthly_limit)
            if exceeded:
                alerts.append(
                    f"{budget.category} spending exceeded budget by INR {round(spent - float(budget.monthly_limit), 2)}"
                )
            budget_rows.append(
                {
                    "category": budget.category,
                    "limit": round(float(budget.monthly_limit), 2),
                    "spent": round(spent, 2),
                    "remaining": remaining,
                    "percentage_used": round((spent / float(budget.monthly_limit)) * 100, 2) if budget.monthly_limit else 0.0,
                    "exceeded": exceeded,
                }
            )

        return {
            "overview": snapshot,
            "budgets": budget_rows,
            "alerts": alerts,
            "forecast": forecast,
            "monthly_category_spending": self.monthly_category_spending(),
            "subscriptions": self.subscriptions(),
            "duplicates": self.duplicate_transactions(),
            "insights": self.generate_insights(),
        }

    def generate_insights(self) -> list[str]:
        monthly = self.repo.monthly_income_expense(self.user_id)
        if len(monthly) < 2:
            return ["Upload another month of transactions to unlock month-over-month insights."]

        latest = monthly[-1]
        previous = monthly[-2]
        latest_year, latest_month = map(int, latest["month"].split("-"))
        previous_year, previous_month = map(int, previous["month"].split("-"))

        latest_categories = {
            row["category"]: row["amount"]
            for row in self.category_totals(year=latest_year, month=latest_month)
        }
        previous_categories = {
            row["category"]: row["amount"]
            for row in self.category_totals(year=previous_year, month=previous_month)
        }

        insights: list[str] = []
        for category, amount in sorted(latest_categories.items(), key=lambda item: item[1], reverse=True)[:3]:
            previous_amount = previous_categories.get(category, 0.0)
            if previous_amount <= 0:
                insights.append(f"{category} appeared as a new major spend area this month at INR {amount:.0f}.")
                continue
            delta = amount - previous_amount
            change_pct = (delta / previous_amount) * 100
            direction = "more" if delta >= 0 else "less"
            insights.append(f"You spent {abs(change_pct):.0f}% {direction} on {category} this month.")

        subscriptions = self.subscriptions()
        if subscriptions:
            monthly_total = sum(
                row["average_amount"] if row["recurrence"] == "monthly" else (row["average_amount"] * 4)
                for row in subscriptions
            )
            insights.append(f"Recurring subscriptions are running at about INR {monthly_total:.0f} per month.")

        return insights[:4]
