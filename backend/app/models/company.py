from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin


class Company(Base, TimestampMixin):
    __tablename__ = "companies"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text)
    website: Mapped[str | None] = mapped_column(String(300))
    location: Mapped[str | None] = mapped_column(String(200))
    logo_path: Mapped[str | None] = mapped_column(String(300))

    recruiters: Mapped[list["Recruiter"]] = relationship(back_populates="company")

    @property
    def logo_url(self) -> str | None:
        return f"/uploads/logos/{self.logo_path}" if self.logo_path else None
