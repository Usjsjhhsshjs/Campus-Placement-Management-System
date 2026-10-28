from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.auth import check_phone
from app.schemas.common import Num


class StudentUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    full_name: str = Field(min_length=2, max_length=150)
    father_name: str = Field(min_length=2, max_length=150)
    phone: str
    college: str = Field(min_length=2, max_length=200)
    course: str = Field(min_length=2, max_length=100)
    branch: str = Field(min_length=2, max_length=100)
    semester: int | None = Field(default=None, ge=1, le=12)
    cgpa: float | None = Field(default=None, ge=0, le=10)
    skills: str | None = Field(default=None, max_length=1000)

    @field_validator("phone")
    @classmethod
    def valid_phone(cls, v: str) -> str:
        return check_phone(v)


class StudentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    full_name: str
    roll_number: str
    father_name: str
    phone: str
    college: str
    course: str
    branch: str
    semester: int | None
    cgpa: Num
    skills: str | None
    has_resume: bool


class StudentStats(BaseModel):
    applications_total: int
    by_status: dict[str, int]
    upcoming_interviews: int
    unread_notifications: int
