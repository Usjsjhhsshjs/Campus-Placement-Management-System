from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.auth import check_phone


class CompanyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    website: str | None
    location: str | None
    logo_url: str | None


class RecruiterOut(BaseModel):
    id: int
    email: str
    full_name: str
    designation: str | None
    phone: str | None
    company: CompanyOut | None


class RecruiterUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    full_name: str = Field(min_length=2, max_length=150)
    designation: str | None = Field(default=None, max_length=150)
    phone: str
    company_name: str = Field(min_length=2, max_length=200)
    company_description: str | None = Field(default=None, max_length=3000)
    company_website: str | None = Field(default=None, max_length=300)
    company_location: str | None = Field(default=None, max_length=200)

    @field_validator("phone")
    @classmethod
    def valid_phone(cls, v: str) -> str:
        return check_phone(v)


class RecruiterStats(BaseModel):
    postings_total: int
    postings_active: int
    applications_total: int
    by_status: dict[str, int]
    upcoming_interviews: int
    unread_notifications: int
