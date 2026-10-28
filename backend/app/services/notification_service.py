from sqlalchemy.orm import Session

from app.models import Notification


def notify(db: Session, user_id: int, type_: str, message: str) -> None:
    """Adds an in-app notification. The caller commits."""
    db.add(Notification(user_id=user_id, type=type_, message=message))
