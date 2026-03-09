from datetime import date, datetime

from pydantic import BaseModel, Field


class TransactionOut(BaseModel):
    id: int
    date: date
    description: str
    merchant: str
    amount: float
    currency: str
    amount_inr: float
    category: str
    prediction_confidence: float
    is_income: bool
    is_subscription: bool
    anomaly_flag: bool
    recurrence: str
    merchant_logo_url: str | None = None
    low_confidence: bool = False

    model_config = {"from_attributes": True}


class UploadResponse(BaseModel):
    inserted_count: int
    duplicate_count: int
    transactions: list[TransactionOut]


class ManualTransactionIn(BaseModel):
    date: str
    description: str = Field(min_length=2, max_length=300)
    amount: float


class CategoryOverrideIn(BaseModel):
    new_category: str = Field(min_length=2, max_length=100)
    reason: str = Field(default="manual_override", max_length=255)


class AlertOut(BaseModel):
    message: str
    severity: str


class BudgetRecommendationOut(BaseModel):
    category: str
    current_spend: float
    recommended_budget: float
    potential_savings: float
    advice: str


class ForecastOut(BaseModel):
    month: str
    predicted_spending: float


class ForecastAdvancedOut(BaseModel):
    month: str
    predicted_amount: float
    confidence_interval: tuple[float, float] | None = None


class FinancialHealthScoreOut(BaseModel):
    score: float
    savings_rate: float
    overspending_frequency: float
    emi_burden_ratio: float
    subscription_load: float
    tips: list[str]


class ApiMessage(BaseModel):
    message: str
    timestamp: datetime


class RegisterIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=8, max_length=128)


class LoginIn(BaseModel):
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=8, max_length=128)


class AuthUserOut(BaseModel):
    id: int
    full_name: str
    email: str


class AuthTokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: AuthUserOut


class CategoryPredictionIn(BaseModel):
    description: str = Field(min_length=2, max_length=300)
    amount: float = 0.0


class CategoryPredictionOut(BaseModel):
    category: str
    confidence: float
    merchant: str
    merchant_logo_url: str | None = None
    model_source: str


class CategorizeResponse(BaseModel):
    description: str
    predicted_category: str
    confidence: float
    merchant: str
    merchant_logo_url: str | None = None
    model_source: str


class RetrainModelIn(BaseModel):
    algorithm: str = Field(default="logistic_regression", pattern="^(logistic_regression|random_forest)$")


class RetrainModelOut(BaseModel):
    model_path: str
    algorithm: str
    trained_samples: int
    distinct_categories: int
    overrides_used: int
    feedback_samples: int
    text_embedding_backend: str
    status: str


class BudgetBaseIn(BaseModel):
    category: str = Field(min_length=2, max_length=100)
    monthly_limit: float = Field(gt=0)
    month: int = Field(ge=1, le=12)
    year: int = Field(ge=2000, le=2100)
    category_id: int | None = None


class BudgetUpdateIn(BaseModel):
    category: str | None = Field(default=None, min_length=2, max_length=100)
    monthly_limit: float | None = Field(default=None, gt=0)
    month: int | None = Field(default=None, ge=1, le=12)
    year: int | None = Field(default=None, ge=2000, le=2100)
    category_id: int | None = None


class BudgetOut(BaseModel):
    id: int
    user_id: int
    category: str
    category_id: int | None
    monthly_limit: float
    month: int
    year: int
    total_spent_per_category: float
    remaining_budget: float
    percentage_used: float
    overspending_flag: bool

    model_config = {"from_attributes": True}


class SavingsGoalCreateIn(BaseModel):
    target_amount: float = Field(gt=0)
    target_date: date
    current_saved: float = Field(default=0.0, ge=0)


class SavingsGoalProgressIn(BaseModel):
    current_saved: float = Field(ge=0)


class SavingsGoalOut(BaseModel):
    id: int
    user_id: int
    target_amount: float
    target_date: date
    current_saved: float
    completion_percentage: float
    months_remaining: float | None

    model_config = {"from_attributes": True}


class NotificationOut(BaseModel):
    id: int
    type: str
    message: str
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationReadIn(BaseModel):
    is_read: bool = True


class FeedbackIn(BaseModel):
    transaction_id: int | None = None
    transaction_text: str = Field(min_length=2, max_length=300)
    predicted_category: str = Field(min_length=2, max_length=100)
    corrected_category: str = Field(min_length=2, max_length=100)


class FeedbackOut(BaseModel):
    id: int
    transaction_id: int | None = None
    transaction_text: str
    predicted_category: str
    corrected_category: str
    timestamp: datetime

    model_config = {"from_attributes": True}
