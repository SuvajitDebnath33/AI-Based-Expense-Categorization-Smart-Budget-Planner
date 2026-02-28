from pathlib import Path

import joblib


def training_data() -> tuple[list[str], list[str]]:
    X = [
        "swiggy order", "zomato dinner", "restaurant lunch", "uber ride", "metro recharge",
        "amazon purchase", "flipkart shopping", "electricity bill", "internet bill", "emi payment",
        "netflix subscription", "spotify premium", "movie ticket", "doctor consultation", "mutual fund sip",
        "insurance premium", "coursera course", "school fees", "salary credit", "bonus credited",
        "groceries at supermarket", "ola cab", "petrol pump", "book store", "medicine pharmacy",
    ]
    y = [
        "Food", "Food", "Food", "Transport", "Transport",
        "Shopping", "Shopping", "Utilities", "Utilities", "EMI",
        "Subscriptions", "Subscriptions", "Entertainment", "Health", "Investment",
        "Insurance", "Education", "Education", "Other", "Other",
        "Food", "Transport", "Transport", "Education", "Health",
    ]
    return X, y


def train_and_save(out_path: Path) -> None:
    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.linear_model import LogisticRegression
        from sklearn.pipeline import Pipeline
    except Exception as exc:
        raise RuntimeError(
            "scikit-learn is unavailable in this Python environment. Use Python 3.12/3.13 to train the model."
        ) from exc

    X, y = training_data()
    model = Pipeline(
        [
            ("tfidf", TfidfVectorizer(ngram_range=(1, 2))),
            ("clf", LogisticRegression(max_iter=400, multi_class="auto")),
        ]
    )
    model.fit(X, y)
    joblib.dump(model, out_path)


if __name__ == "__main__":
    target = Path(__file__).parent / "ml_model.pkl"
    train_and_save(target)
    print(f"Saved model to {target}")
