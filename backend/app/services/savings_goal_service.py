from sqlalchemy import case, extract, func
from sqlalchemy.orm import Session

from app.models import SavingsGoal, Transaction
from app.repositories.notification_repository import NotificationRepository


def _avg_monthly_net_savings(db: Session, lookback_months: int = 3) -> float:
    year_col = extract("year", Transaction.date).label("year")
    month_col = extract("month", Transaction.date).label("month")
    rows = (
        db.query(
            year_col,
            month_col,
            func.sum(case((Transaction.is_income.is_(True), func.abs(Transaction.amount_inr)), else_=0.0)).label("income"),
            func.sum(case((Transaction.is_income.is_(False), func.abs(Transaction.amount_inr)), else_=0.0)).label("expense"),
        )
        .group_by(year_col, month_col)
        .order_by(year_col.desc(), month_col.desc())
        .limit(lookback_months)
        .all()
    )
    if not rows:
        return 0.0

    monthly_net = [float((row.income or 0.0) - (row.expense or 0.0)) for row in rows]
    return sum(monthly_net) / len(monthly_net)


def goal_to_response(db: Session, goal: SavingsGoal) -> dict:
    completion = (goal.current_saved / goal.target_amount) * 100 if goal.target_amount > 0 else 0.0
    remaining = max(goal.target_amount - goal.current_saved, 0.0)
    avg_net_savings = _avg_monthly_net_savings(db)

    months_remaining: float | None
    if remaining <= 0:
        months_remaining = 0.0
    elif avg_net_savings <= 0:
        months_remaining = None
    else:
        months_remaining = remaining / avg_net_savings

    return {
        "id": goal.id,
        "user_id": goal.user_id,
        "target_amount": float(goal.target_amount),
        "target_date": goal.target_date,
        "current_saved": float(goal.current_saved),
        "completion_percentage": round(min(completion, 100.0), 2),
        "months_remaining": None if months_remaining is None else round(months_remaining, 2),
    }


def notify_savings_milestone(
    notification_repo: NotificationRepository,
    goal: SavingsGoal,
    previous_saved: float,
) -> None:
    if goal.target_amount <= 0:
        return

    prev_pct = (previous_saved / goal.target_amount) * 100
    curr_pct = (goal.current_saved / goal.target_amount) * 100
    milestones = [25, 50, 75, 100]

    for milestone in milestones:
        if prev_pct < milestone <= curr_pct:
            notification_repo.create(
                user_id=goal.user_id,
                notification_type="savings_milestone",
                message=f"Savings goal #{goal.id} reached {milestone}% progress.",
            )
