import csv
from io import StringIO

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import CategoryOverride, Transaction
from app.repositories.notification_repository import NotificationRepository
from app.schemas import CategoryOverrideIn, ManualTransactionIn, TransactionOut, UploadResponse
from app.security.auth import AuthUser, get_current_user
from app.services.anomaly_service import is_anomalous_expense
from app.services.categorization_service import CategorizationService
from app.services.notification_service import notify_anomaly, notify_budget_usage_for_category
from app.services.subscription_service import detect_subscriptions
from app.utils.text_cleaner import clean_text, merchant_from_description, parse_amount, parse_date, source_hash

router = APIRouter(prefix="", tags=["transactions"])
service = CategorizationService(settings.model_path)


def create_transaction(
    db: Session,
    raw_date: str,
    description: str,
    raw_amount: str,
) -> tuple[Transaction | None, str]:
    try:
        tx_date = parse_date(raw_date)
        amount, currency, amount_inr = parse_amount(raw_amount)
    except Exception:
        return None, "invalid"

    cleaned = clean_text(description)
    merchant = merchant_from_description(cleaned)
    tx_hash = source_hash(tx_date, description, amount_inr)

    if db.query(Transaction).filter(Transaction.source_hash == tx_hash).first():
        return None, "duplicate"

    category, confidence = service.predict(cleaned)
    is_income = amount_inr < 0

    anomaly_flag = False
    if not is_income:
        anomaly_flag = is_anomalous_expense(
            db,
            tx_date=tx_date,
            category=category,
            amount_inr=amount_inr,
        )

    tx = Transaction(
        date=tx_date,
        description=description,
        clean_description=cleaned,
        merchant=merchant,
        amount=amount,
        currency=currency,
        amount_inr=amount_inr,
        category=category,
        prediction_confidence=confidence,
        is_income=is_income,
        anomaly_flag=anomaly_flag,
        source_hash=tx_hash,
    )
    db.add(tx)
    return tx, "ok"


@router.post("/upload", response_model=UploadResponse)
async def upload_transactions(
    file: UploadFile,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed.")

    content = (await file.read()).decode("utf-8-sig")
    if not content.strip():
        raise HTTPException(status_code=400, detail="CSV is empty.")

    reader = csv.DictReader(StringIO(content))
    if not reader.fieldnames:
        raise HTTPException(status_code=400, detail="CSV headers missing")

    required = {"Date", "Description", "Amount"}
    normalized_headers = {h.strip() for h in reader.fieldnames if h}
    if not required.issubset(normalized_headers):
        raise HTTPException(status_code=400, detail="CSV columns must include: Date, Description, Amount")

    inserted: list[Transaction] = []
    duplicate_count = 0

    for record in reader:
        raw_date = (record.get("Date") or "").strip()
        description = (record.get("Description") or "").strip()
        raw_amount = (record.get("Amount") or "").strip()

        if not (raw_date and description and raw_amount):
            continue

        tx, status = create_transaction(db, raw_date, description, raw_amount)
        if tx is None:
            if status == "duplicate":
                duplicate_count += 1
            continue

        inserted.append(tx)

    db.commit()

    if inserted:
        for tx in inserted:
            db.refresh(tx)

        flags = detect_subscriptions(db.query(Transaction).all())
        for tx in inserted:
            if tx.id in flags:
                tx.is_subscription = True
                tx.recurrence = flags[tx.id]["recurrence"]
        db.commit()

        notification_repo = NotificationRepository(db)
        for tx in inserted:
            notify_anomaly(notification_repo, user.user_id, tx)
            if not tx.is_income:
                notify_budget_usage_for_category(db, user.user_id, tx.category, tx.date)

    return UploadResponse(inserted_count=len(inserted), duplicate_count=duplicate_count, transactions=inserted)


@router.post("/transactions", response_model=TransactionOut)
def add_transaction(
    payload: ManualTransactionIn,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    tx, status = create_transaction(db, payload.date, payload.description.strip(), str(payload.amount))
    if tx is None:
        raise HTTPException(status_code=400, detail="Invalid data or duplicate transaction.")

    db.commit()
    db.refresh(tx)

    flags = detect_subscriptions(db.query(Transaction).all())
    if tx.id in flags:
        tx.is_subscription = True
        tx.recurrence = flags[tx.id]["recurrence"]
        db.commit()
        db.refresh(tx)

    notification_repo = NotificationRepository(db)
    notify_anomaly(notification_repo, user.user_id, tx)
    if not tx.is_income:
        notify_budget_usage_for_category(db, user.user_id, tx.category, tx.date)

    return tx


@router.get("/transactions", response_model=list[TransactionOut])
def get_transactions(
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    _: AuthUser = Depends(get_current_user),
):
    return db.query(Transaction).order_by(Transaction.date.desc(), Transaction.id.desc()).offset(offset).limit(limit).all()


@router.patch("/transactions/{transaction_id}/override", response_model=TransactionOut)
def override_category(
    transaction_id: int,
    payload: CategoryOverrideIn,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    tx = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    old = tx.category
    tx.category = payload.new_category
    db.add(
        CategoryOverride(
            transaction_id=tx.id,
            previous_category=old,
            new_category=payload.new_category,
            reason=payload.reason,
        )
    )
    db.commit()
    db.refresh(tx)

    if not tx.is_income:
        notify_budget_usage_for_category(db, user.user_id, tx.category, tx.date)
    return tx
