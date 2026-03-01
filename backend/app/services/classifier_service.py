import csv
from pathlib import Path

import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

from app.ml.training_data import TRAINING_SAMPLES


ARTIFACT_DIR = Path(__file__).resolve().parent.parent / "ml" / "artifacts"
MODEL_PATH = ARTIFACT_DIR / "transaction_classifier.joblib"
DATASET_DIR = Path(__file__).resolve().parent.parent / "ml" / "datasets"
MCC_DATASET_PATH = DATASET_DIR / "mcc_codes.csv"


class TransactionClassifier:
    def __init__(self):
        self.pipeline: Pipeline | None = None
        ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
        self._load_or_train()

    @staticmethod
    def _amount_bucket(amount: float) -> str:
        if amount < 20:
            return "micro"
        if amount < 75:
            return "small"
        if amount < 250:
            return "medium"
        return "large"

    def _feature_text(self, description: str, amount: float) -> str:
        return f"{description.strip().lower()} amount_{self._amount_bucket(amount)}"

    @staticmethod
    def _build_pipeline() -> Pipeline:
        return Pipeline(
            steps=[
                ("tfidf", TfidfVectorizer(ngram_range=(1, 2), max_features=1200)),
                ("clf", LogisticRegression(max_iter=400)),
            ]
        )

    @staticmethod
    def _infer_external_category(text: str) -> str:
        lowered = text.lower()
        category_keywords = {
            "travel": ["airline", "hotel", "lodging", "travel", "resort", "car rental", "cruise"],
            "transport": ["taxi", "transit", "bus", "railway", "fuel", "gas", "parking", "automotive"],
            "dining": ["restaurant", "cafe", "coffee", "fast food", "bar", "bakery"],
            "groceries": ["grocery", "supermarket", "food stores", "wholesale club"],
            "utilities": ["telecom", "electric", "internet", "water", "utility", "cable", "insurance"],
            "healthcare": ["medical", "dental", "pharmacy", "hospital", "veterinary"],
            "shopping": ["department store", "apparel", "electronics", "retail", "furniture"],
            "education": ["school", "college", "training", "bookstore"],
            "entertainment": ["theater", "music", "amusement", "recreation", "sporting"],
            "rent": ["real estate", "rent", "mortgage", "housing"],
        }
        for category, keywords in category_keywords.items():
            if any(keyword in lowered for keyword in keywords):
                return category
        return "other"

    def _load_external_samples(self) -> list[tuple[str, str]]:
        if not MCC_DATASET_PATH.exists():
            return []

        samples: list[tuple[str, str]] = []
        with MCC_DATASET_PATH.open("r", encoding="utf-8", newline="") as csv_file:
            reader = csv.DictReader(csv_file)
            for row in reader:
                desc = (
                    (row.get("combined_description") or "").strip()
                    or (row.get("edited_description") or "").strip()
                    or (row.get("usda_description") or "").strip()
                    or (row.get("irs_description") or "").strip()
                )
                if not desc:
                    continue
                category = self._infer_external_category(desc)
                if category == "other":
                    continue
                samples.append((desc.lower(), category))
        return samples

    def train(self) -> None:
        local_samples = TRAINING_SAMPLES
        external_samples = self._load_external_samples()
        dataset = [(self._feature_text(text, 80.0), label) for text, label in (local_samples + external_samples)]
        X = [x for x, _ in dataset]
        y = [y for _, y in dataset]

        self.pipeline = self._build_pipeline()
        self.pipeline.fit(X, y)
        joblib.dump(self.pipeline, MODEL_PATH)

    def _load_or_train(self) -> None:
        if MODEL_PATH.exists():
            if MCC_DATASET_PATH.exists() and MCC_DATASET_PATH.stat().st_mtime > MODEL_PATH.stat().st_mtime:
                self.train()
                return
            self.pipeline = joblib.load(MODEL_PATH)
            return
        self.train()

    def predict(self, description: str, amount: float) -> str:
        if not self.pipeline:
            self._load_or_train()

        features = [self._feature_text(description, amount)]
        proba = self.pipeline.predict_proba(features)[0]
        confidence = float(max(proba))

        if confidence < 0.35:
            return "other"
        return str(self.pipeline.predict(features)[0])


classifier = TransactionClassifier()
