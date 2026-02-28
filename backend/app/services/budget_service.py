from app.models import Budget
from app.repositories.budget_repository import BudgetRepository
from app.repositories.notification_repository import NotificationRepository


def budget_to_response(repo: BudgetRepository, budget: Budget) -> dict:
    spent = repo.spent_for_budget(budget)
    remaining = float(budget.monthly_limit) - spent
    percentage = (spent / float(budget.monthly_limit)) * 100 if budget.monthly_limit > 0 else 0.0

    return {
        "id": budget.id,
        "user_id": budget.user_id,
        "category": budget.category,
        "category_id": budget.category_id,
        "monthly_limit": float(budget.monthly_limit),
        "month": budget.month,
        "year": budget.year,
        "total_spent_per_category": round(spent, 2),
        "remaining_budget": round(remaining, 2),
        "percentage_used": round(percentage, 2),
        "overspending_flag": percentage >= 90.0,
    }


def notify_if_budget_threshold_crossed(
    notification_repo: NotificationRepository,
    budget_payload: dict,
) -> None:
    if not budget_payload["overspending_flag"]:
        return

    notification_repo.create(
        user_id=budget_payload["user_id"],
        notification_type="budget_threshold",
        message=(
            f"Budget usage for {budget_payload['category']} ({budget_payload['month']:02d}/{budget_payload['year']}) "
            f"is {budget_payload['percentage_used']:.1f}%."
        ),
    )
