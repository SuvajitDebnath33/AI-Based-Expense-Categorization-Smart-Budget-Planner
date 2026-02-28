import hashlib
import re
from datetime import date, datetime

from dateutil import parser as date_parser


FX_RATES_TO_INR = {
    "INR": 1.0,
    "USD": 83.0,
    "EUR": 90.0,
    "GBP": 105.0,
}


def clean_text(text: str) -> str:
    lowered = (text or "").lower().strip()
    lowered = re.sub(r"[^a-z0-9\s]", " ", lowered)
    lowered = re.sub(r"\s+", " ", lowered).strip()
    return lowered


def infer_currency(raw_amount: str) -> str:
    token = raw_amount.upper()
    if "$" in token:
        return "USD"
    if "EUR" in token:
        return "EUR"
    if "GBP" in token:
        return "GBP"
    return "INR"


def parse_amount(value: str | float | int) -> tuple[float, str, float]:
    raw = str(value).strip()
    currency = infer_currency(raw)
    numeric = re.sub(r"[^0-9.\-]", "", raw.replace(",", ""))
    amount = float(numeric)
    amount_inr = amount * FX_RATES_TO_INR.get(currency, 1.0)
    return amount, currency, amount_inr


def parse_date(value: str) -> date:
    return date_parser.parse(value).date()


def merchant_from_description(clean_description: str) -> str:
    tokens = clean_description.split()
    return " ".join(tokens[:3]) if tokens else "unknown"


def source_hash(tx_date: date, description: str, amount_inr: float) -> str:
    key = f"{tx_date.isoformat()}|{clean_text(description)}|{amount_inr:.2f}"
    return hashlib.sha256(key.encode("utf-8")).hexdigest()
