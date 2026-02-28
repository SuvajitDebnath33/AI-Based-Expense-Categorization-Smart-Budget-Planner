from pathlib import Path
from typing import Any

import joblib

from app.utils.text_cleaner import clean_text


KEYWORD_RULES = {
    "Food": ["swiggy", "zomato", "food", "restaurant", "cafe", "dining", "groceries"],
    "Transport": ["uber", "ola", "metro", "petrol", "fuel", "ride", "cab", "bus"],
    "Shopping": ["amazon", "flipkart", "myntra", "shopping", "store", "purchase"],
    "Utilities": ["electricity", "water", "internet", "gas", "bill", "recharge"],
    "EMI": ["emi", "loan", "installment"],
    "Subscriptions": ["netflix", "spotify", "prime", "subscription", "hotstar", "youtube premium"],
    "Entertainment": ["movie", "concert", "gaming", "ticket", "outing"],
    "Health": ["pharmacy", "doctor", "clinic", "hospital", "medicine"],
    "Investment": ["sip", "mutual fund", "stock", "broker", "investment"],
    "Insurance": ["insurance", "policy", "premium"],
    "Education": ["course", "udemy", "coursera", "school", "college", "fees"],
}


class CategorizationService:
    def __init__(self, model_path: str):
        self.model_path = model_path
        self.model: Any | None = None
        self.reload_model()

    def reload_model(self) -> None:
        path = Path(self.model_path)
        self.model = joblib.load(path) if path.exists() else None

    def _keyword_predict(self, text: str) -> tuple[str, float]:
        clean = clean_text(text)
        for category, terms in KEYWORD_RULES.items():
            if any(term in clean for term in terms):
                return category, 0.65
        return "Other", 0.4

    def predict(self, description: str) -> tuple[str, float]:
        if self.model is None:
            return self._keyword_predict(description)

        try:
            clean = clean_text(description)
            probs_raw = self.model.predict_proba([clean])[0]
            labels = list(getattr(self.model, "classes_", []))

            if hasattr(probs_raw, "tolist"):
                probs = [float(value) for value in probs_raw.tolist()]
            else:
                probs = [float(value) for value in probs_raw]

            if not probs or not labels:
                return self._keyword_predict(description)

            top_count = min(len(probs), len(labels))
            best_index = max(range(top_count), key=lambda idx: probs[idx])
            return str(labels[best_index]), float(probs[best_index])
        except Exception:
            return self._keyword_predict(description)
