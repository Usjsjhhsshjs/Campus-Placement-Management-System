from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin

APPLICATION_STATUSES = (
    "applied", "under_review", "shortlisted", "interview_scheduled", "selected", "rejected",
)
_status_list = ",".join(f"'{s}'" for s in APPLICATION_STATUSES)


class Application(Base, TimestampMixin):
    __tablename__ = "applications"
    __table_args__ = (
        UniqueConstraint("student_id", "opportunity_id", name="uq_application_student_opportunity"),
        CheckConstraint(f"status IN ({_status_list})", name="ck_application_status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    opportunity_id: Mapped[int] = mapped_column(ForeignKey("opportunities.id", ondelete="RESTRICT"), nullable=False, index=True)
    cover_note: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(30), default="applied", nullable=False, index=True)

    student: Mapped["Student"] = relationship(back_populates="applications")
    opportunity: Mapped["Opportunity"] = relationship(back_populates="applications")
    history: Mapped[list["ApplicationStatusHistory"]] = relationship(
        back_populates="application", order_by="ApplicationStatusHistory.changed_at"
    )
    interviews: Mapped[list["Interview"]] = relationship(back_populates="application")


class ApplicationStatusHistory(Base):
    __tablename__ = "application_status_history"

    id: Mapped[int] = mapped_column(primary_key=True)
    application_id: Mapped[int] = mapped_column(ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True)
    old_status: Mapped[str | None] = mapped_column(String(30))
    new_status: Mapped[str] = mapped_column(String(30), nullable=False)
    changed_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    application: Mapped["Application"] = relationship(back_populates="history")
