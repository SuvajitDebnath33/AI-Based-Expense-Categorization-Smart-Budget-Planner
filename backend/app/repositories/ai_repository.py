from sqlalchemy.orm import Session

from app.models import CategoryOverride, Transaction


class AIRepository:
    def __init__(self, db: Session):
        self.db = db

    def training_dataset(self) -> list[tuple[str, str]]:
        rows = (
            self.db.query(Transaction.clean_description, Transaction.category)
            .filter(Transaction.clean_description.is_not(None), Transaction.category.is_not(None))
            .all()
        )
        return [(str(clean_desc), str(category)) for clean_desc, category in rows if clean_desc and category]

    def override_count(self) -> int:
        return int(self.db.query(CategoryOverride).count())
