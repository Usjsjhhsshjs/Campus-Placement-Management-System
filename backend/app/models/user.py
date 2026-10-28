from sqlalchemy import Boolean, CheckConstraint, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin


class User(Base, TimestampMixin):
    """Login account. A student or recruiter profile extends this row."""

    __tablename__ = "users"
    __table_args__ = (CheckConstraint("role IN ('student','recruiter')", name="ck_users_role"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    student: Mapped["Student | None"] = relationship(back_populates="user", uselist=False)
    recruiter: Mapped["Recruiter | None"] = relationship(back_populates="user", uselist=False)
