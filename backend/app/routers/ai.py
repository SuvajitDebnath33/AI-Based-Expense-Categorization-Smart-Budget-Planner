from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.repositories.ai_repository import AIRepository
from app.schemas import CategoryPredictionIn, CategoryPredictionOut, RetrainModelIn, RetrainModelOut
from app.security.auth import AuthUser, get_current_user
from app.security.rate_limiter import ai_rate_limit
from app.services.ai_model_service import retrain_model
from app.services.categorization_service import CategorizationService

router = APIRouter(prefix="/ai", tags=["ai"])
predict_service = CategorizationService(settings.model_path)


@router.post("/predict-category", response_model=CategoryPredictionOut, dependencies=[Depends(ai_rate_limit)])
def predict_category(
    payload: CategoryPredictionIn,
    _: AuthUser = Depends(get_current_user),
):
    category, confidence = predict_service.predict(payload.description.strip())
    return {"category": category, "confidence": round(confidence, 4)}


@router.post("/retrain-model", response_model=RetrainModelOut, dependencies=[Depends(ai_rate_limit)])
def retrain(
    payload: RetrainModelIn,
    db: Session = Depends(get_db),
    _: AuthUser = Depends(get_current_user),
):
    repo = AIRepository(db)
    dataset = repo.training_dataset()
    overrides_used = repo.override_count()

    try:
        result = retrain_model(dataset=dataset, model_path=settings.model_path, algorithm=payload.algorithm)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    predict_service.reload_model()

    # Reload shared transaction predictor so uploads and manual create use updated model.
    from app.routers.transactions import service as transaction_service

    transaction_service.reload_model()

    return {
        **result,
        "overrides_used": overrides_used,
        "status": "retrained",
    }
