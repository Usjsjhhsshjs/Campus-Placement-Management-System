from datetime import datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin


class Opportunity(Base, TimestampMixin):
    """A job OR an internship (one table, `type` tells them apart)."""

    __tablename__ = "opportunities"
    __table_args__ = (
        CheckConstraint("type IN ('job','internship')", name="ck_opp_type"),
        CheckConstraint("status IN ('active','closed')", name="ck_opp_status"),
        Index("ix_opp_status_deadline", "status", "deadline"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    recruiter_id: Mapped[int] = mapped_column(ForeignKey("recruiters.id", ondelete="RESTRICT"), nullable=False, index=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id", ondelete="RESTRICT"), nullable=False, index=True)
    type: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    skills: Mapped[str | None] = mapped_column(Text)
    location: Mapped[str | None] = mapped_column(String(200))
    compensation: Mapped[str | None] = mapped_column(String(100))  # salary or stipend text
    min_cgpa: Mapped[Decimal | None] = mapped_column(Numeric(4, 2))
    eligible_branches: Mapped[str | None] = mapped_column(Text)  # comma-separated; empty = all
    deadline: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))  # soft delete

    recruiter: Mapped["Recruiter"] = relationship(back_populates="opportunities")
    company: Mapped["Company"] = relationship()
    applications: Mapped[list["Application"]] = relationship(back_populates="opportunity")
