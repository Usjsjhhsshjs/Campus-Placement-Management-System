from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin


class Recruiter(Base, TimestampMixin):
    __tablename__ = "recruiters"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    company_id: Mapped[int | None] = mapped_column(ForeignKey("companies.id", ondelete="SET NULL"))
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    designation: Mapped[str | None] = mapped_column(String(150))
    phone: Mapped[str | None] = mapped_column(String(20))

    user: Mapped["User"] = relationship(back_populates="recruiter")
    company: Mapped["Company | None"] = relationship(back_populates="recruiters")
    opportunities: Mapped[list["Opportunity"]] = relationship(back_populates="recruiter")
