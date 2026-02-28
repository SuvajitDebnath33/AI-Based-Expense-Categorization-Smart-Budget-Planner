from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import BudgetRecommendation, Transaction
from app.security.auth import AuthUser, get_current_user
from app.services.budget_engine import build_budget_recommendations

router = APIRouter(prefix="/budget", tags=["budget"])


@router.get("/recommendations")
def budget_recommendations(
    db: Session = Depends(get_db),
    _: AuthUser = Depends(get_current_user),
):
    txs = db.query(Transaction).all()
    recommendations = build_budget_recommendations(txs)

    latest_month = max((t.date for t in txs), default=datetime.utcnow().date()).strftime("%Y-%m")

    for rec in recommendations:
        exists = db.query(BudgetRecommendation).filter(
            BudgetRecommendation.month == latest_month,
            BudgetRecommendation.category == rec["category"],
        ).first()
        if not exists:
            db.add(BudgetRecommendation(month=latest_month, category=rec["category"], current_spend=rec["current_spend"], recommended_budget=rec["recommended_budget"], potential_savings=rec["potential_savings"], advice=rec["advice"]))
    db.commit()

    return {
        "month": latest_month,
        "recommendations": recommendations,
        "projected_savings": round(sum(item["potential_savings"] for item in recommendations), 2),
    }
