from decimal import Decimal

from sqlalchemy import CheckConstraint, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin


class Student(Base, TimestampMixin):
    __tablename__ = "students"
    __table_args__ = (
        CheckConstraint("cgpa IS NULL OR (cgpa >= 0 AND cgpa <= 10)", name="ck_students_cgpa"),
        CheckConstraint("semester IS NULL OR (semester >= 1 AND semester <= 12)", name="ck_students_semester"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    roll_number: Mapped[str] = mapped_column(String(30), unique=True, index=True, nullable=False)
    father_name: Mapped[str] = mapped_column(String(150), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    college: Mapped[str] = mapped_column(String(200), nullable=False)
    course: Mapped[str] = mapped_column(String(100), nullable=False)
    branch: Mapped[str] = mapped_column(String(100), nullable=False)
    semester: Mapped[int | None] = mapped_column(Integer)
    cgpa: Mapped[Decimal | None] = mapped_column(Numeric(4, 2))
    skills: Mapped[str | None] = mapped_column(Text)  # comma-separated
    resume_path: Mapped[str | None] = mapped_column(String(300))

    user: Mapped["User"] = relationship(back_populates="student")
    applications: Mapped[list["Application"]] = relationship(back_populates="student")

    @property
    def email(self) -> str:
        return self.user.email

    @property
    def has_resume(self) -> bool:
        return bool(self.resume_path)
