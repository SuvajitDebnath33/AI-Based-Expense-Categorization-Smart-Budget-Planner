import math
from collections import Counter, defaultdict
from pathlib import Path

import joblib

from app.utils.text_cleaner import clean_text


class SimpleBayesTextClassifier:
    def __init__(self) -> None:
        self.classes_: list[str] = []
        self._class_doc_counts: dict[str, int] = {}
        self._token_counts: dict[str, dict[str, int]] = {}
        self._token_totals: dict[str, int] = {}
        self._vocab: set[str] = set()

    def fit(self, texts: list[str], labels: list[str]) -> "SimpleBayesTextClassifier":
        class_doc_counts = Counter(labels)
        token_counts: dict[str, defaultdict[str, int]] = {
            label: defaultdict(int) for label in class_doc_counts.keys()
        }
        token_totals = {label: 0 for label in class_doc_counts.keys()}
        vocab: set[str] = set()

        for text, label in zip(texts, labels):
            tokens = [token for token in clean_text(text).split() if token]
            for token in tokens:
                token_counts[label][token] += 1
                token_totals[label] += 1
                vocab.add(token)

        self.classes_ = sorted(class_doc_counts.keys())
        self._class_doc_counts = dict(class_doc_counts)
        self._token_counts = {key: dict(value) for key, value in token_counts.items()}
        self._token_totals = token_totals
        self._vocab = vocab
        return self

    def predict_proba(self, texts: list[str]) -> list[list[float]]:
        if not self.classes_:
            return [[1.0]]

        total_docs = max(sum(self._class_doc_counts.values()), 1)
        vocab_size = max(len(self._vocab), 1)
        class_count = len(self.classes_)

        probabilities: list[list[float]] = []
        for text in texts:
            tokens = [token for token in clean_text(text).split() if token]
            log_scores: dict[str, float] = {}

            for label in self.classes_:
                prior = (self._class_doc_counts.get(label, 0) + 1) / (total_docs + class_count)
                log_score = math.log(prior)

                denom = self._token_totals.get(label, 0) + vocab_size
                label_token_counts = self._token_counts.get(label, {})
                for token in tokens:
                    token_prob = (label_token_counts.get(token, 0) + 1) / denom
                    log_score += math.log(token_prob)
                log_scores[label] = log_score

            max_log = max(log_scores.values())
            exp_scores = {label: math.exp(score - max_log) for label, score in log_scores.items()}
            denom = sum(exp_scores.values()) or 1.0
            probabilities.append([exp_scores[label] / denom for label in self.classes_])

        return probabilities


def retrain_model(
    dataset: list[tuple[str, str]],
    model_path: str,
    algorithm: str = "logistic_regression",
) -> dict:
    cleaned = [(clean_text(text), category.strip()) for text, category in dataset if text and category and category.strip()]
    if len(cleaned) < 10:
        raise ValueError("At least 10 labeled transactions are required for retraining.")

    labels = [label for _, label in cleaned]
    distinct_labels = Counter(labels)
    if len(distinct_labels) < 2:
        raise ValueError("At least two categories are required for retraining.")

    texts = [text for text, _ in cleaned]
    output = Path(model_path)
    output.parent.mkdir(parents=True, exist_ok=True)

    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.linear_model import LogisticRegression
        from sklearn.naive_bayes import MultinomialNB
        from sklearn.pipeline import Pipeline
    except ImportError:
        # Fallback path for runtimes where scikit-learn isn't installed (e.g., Python 3.14).
        fallback = SimpleBayesTextClassifier().fit(texts, labels)
        joblib.dump(fallback, output)
        return {
            "model_path": str(output),
            "algorithm": "naive_bayes_fallback",
            "trained_samples": len(texts),
            "distinct_categories": len(distinct_labels),
        }

    if algorithm == "naive_bayes":
        classifier = MultinomialNB()
    else:
        classifier = LogisticRegression(max_iter=1200)
        algorithm = "logistic_regression"

    pipeline = Pipeline(
        steps=[
            ("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=1, max_features=5000)),
            ("clf", classifier),
        ]
    )
    pipeline.fit(texts, labels)
    joblib.dump(pipeline, output)

    return {
        "model_path": str(output),
        "algorithm": algorithm,
        "trained_samples": len(texts),
        "distinct_categories": len(distinct_labels),
    }
