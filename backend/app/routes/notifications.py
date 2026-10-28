from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models import Notification, User
from app.schemas.application import NotificationOut
from app.schemas.common import Message

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationOut])
def list_notifications(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.scalars(
        select(Notification).where(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc(), Notification.id.desc()).limit(100)
    ).all()


@router.get("/unread-count")
def unread_count(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    count = db.scalar(select(func.count()).select_from(Notification).where(
        Notification.user_id == user.id, Notification.is_read.is_(False)))
    return {"count": count or 0}


@router.post("/read-all", response_model=Message)
def read_all(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.execute(update(Notification).where(Notification.user_id == user.id).values(is_read=True))
    db.commit()
    return Message(message="All notifications marked as read.")


@router.post("/{notification_id}/read", response_model=Message)
def mark_read(notification_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    n = db.scalar(select(Notification).where(Notification.id == notification_id, Notification.user_id == user.id))
    if n is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Notification not found")
    n.is_read = True
    db.commit()
    return Message(message="Marked as read.")
