from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.common import Num
from app.schemas.recruiter import CompanyOut


def _clean_csv(value: str | None) -> str | None:
    if not value:
        return None
    parts = [p.strip() for p in value.split(",") if p.strip()]
    return ",".join(parts) or None


class OpportunityIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    type: Literal["job", "internship"]
    title: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=20, max_length=10000)
    skills: str | None = Field(default=None, max_length=1000)
    location: str | None = Field(default=None, max_length=200)
    compensation: str | None = Field(default=None, max_length=100)
    min_cgpa: float | None = Field(default=None, ge=0, le=10)
    eligible_branches: str | None = Field(default=None, max_length=1000)
    deadline: datetime

    @field_validator("skills", "eligible_branches")
    @classmethod
    def clean_lists(cls, v):
        return _clean_csv(v)

    @field_validator("deadline")
    @classmethod
    def deadline_in_future(cls, v: datetime) -> datetime:
        if v.tzinfo is None:
            raise ValueError("Deadline must include a timezone")
        if v <= datetime.now(v.tzinfo):
            raise ValueError("Deadline must be in the future")
        return v


class OpportunityStatusIn(BaseModel):
    status: Literal["active", "closed"]


class OpportunityOut(BaseModel):
    id: int
    type: str
    title: str
    description: str
    skills: str | None
    location: str | None
    compensation: str | None
    min_cgpa: Num
    eligible_branches: str | None
    deadline: datetime
    status: str
    is_open: bool
    created_at: datetime
    company: CompanyOut
    # Filled in depending on who is asking:
    applications_count: int | None = None   # recruiters
    has_applied: bool | None = None         # students
    eligible: bool | None = None            # students
    ineligible_reason: str | None = None    # students
