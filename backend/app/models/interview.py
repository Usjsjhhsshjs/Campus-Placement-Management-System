from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin


class Interview(Base, TimestampMixin):
    __tablename__ = "interviews"
    __table_args__ = (
        CheckConstraint("mode IN ('online','in_person','phone')", name="ck_interview_mode"),
        CheckConstraint("status IN ('scheduled','completed','cancelled')", name="ck_interview_status"),
        CheckConstraint("duration_minutes > 0 AND duration_minutes <= 480", name="ck_interview_duration"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    application_id: Mapped[int] = mapped_column(ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True)
    scheduled_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    mode: Mapped[str] = mapped_column(String(20), nullable=False)
    location_or_link: Mapped[str | None] = mapped_column(String(500))
    notes: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="scheduled", nullable=False)

    application: Mapped["Application"] = relationship(back_populates="interviews")
