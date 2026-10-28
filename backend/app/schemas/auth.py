import re
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

PHONE_RE = re.compile(r"^\+?[0-9]{10,15}$")


def check_password(value: str) -> str:
    if len(value) < 8:
        raise ValueError("Password must be at least 8 characters long")
    if len(value.encode("utf-8")) > 72:
        raise ValueError("Password is too long (maximum 72 bytes)")
    if not re.search(r"[A-Za-z]", value) or not re.search(r"\d", value):
        raise ValueError("Password must contain at least one letter and one number")
    return value


def check_phone(value: str) -> str:
    cleaned = re.sub(r"[\s\-()]", "", value)
    if not PHONE_RE.match(cleaned):
        raise ValueError("Enter a valid phone number (10 to 15 digits)")
    return cleaned


class _RegisterBase(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    full_name: str = Field(min_length=2, max_length=150)
    email: EmailStr
    phone: str
    password: str

    @field_validator("email")
    @classmethod
    def lower_email(cls, v: str) -> str:
        return v.lower()

    @field_validator("phone")
    @classmethod
    def valid_phone(cls, v: str) -> str:
        return check_phone(v)

    @field_validator("password")
    @classmethod
    def strong_password(cls, v: str) -> str:
        return check_password(v)


class StudentRegister(_RegisterBase):
    roll_number: str = Field(min_length=2, max_length=30, pattern=r"^[A-Za-z0-9\-/]+$")
    father_name: str = Field(min_length=2, max_length=150)
    college: str = Field(min_length=2, max_length=200)
    course: str = Field(min_length=2, max_length=100)
    branch: str = Field(min_length=2, max_length=100)
    semester: int | None = Field(default=None, ge=1, le=12)
    cgpa: float | None = Field(default=None, ge=0, le=10)
    skills: str | None = Field(default=None, max_length=1000)

    @field_validator("roll_number")
    @classmethod
    def upper_roll(cls, v: str) -> str:
        return v.upper()


class RecruiterRegister(_RegisterBase):
    designation: str | None = Field(default=None, max_length=150)
    company_name: str = Field(min_length=2, max_length=200)
    company_description: str | None = Field(default=None, max_length=3000)
    company_website: str | None = Field(default=None, max_length=300)
    company_location: str | None = Field(default=None, max_length=200)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=200)
    role: Literal["student", "recruiter"]

    @field_validator("email")
    @classmethod
    def lower_email(cls, v: str) -> str:
        return v.lower()


class UserOut(BaseModel):
    id: int
    email: str
    role: str
    full_name: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=10, max_length=200)
    new_password: str

    @field_validator("new_password")
    @classmethod
    def strong_password(cls, v: str) -> str:
        return check_password(v)
