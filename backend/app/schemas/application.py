from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.student import StudentOut


class ApplyRequest(BaseModel):
    cover_note: str | None = Field(default=None, max_length=2000)


class StatusUpdate(BaseModel):
    status: Literal["under_review", "shortlisted", "selected", "rejected"]


class OpportunityBrief(BaseModel):
    id: int
    title: str
    type: str
    location: str | None
    deadline: datetime
    company_name: str


class HistoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    old_status: str | None
    new_status: str
    changed_at: datetime


class InterviewOut(BaseModel):
    id: int
    application_id: int
    scheduled_start: datetime
    duration_minutes: int
    mode: str
    location_or_link: str | None
    notes: str | None
    status: str
    opportunity_title: str
    company_name: str
    student_name: str


class ApplicationOut(BaseModel):
    id: int
    status: str
    cover_note: str | None
    created_at: datetime
    updated_at: datetime
    opportunity: OpportunityBrief
    history: list[HistoryOut]
    interviews: list[InterviewOut]
    student: StudentOut | None = None  # only included for recruiters


class InterviewCreate(BaseModel):
    application_id: int
    scheduled_start: datetime
    duration_minutes: int = Field(default=30, ge=15, le=480)
    mode: Literal["online", "in_person", "phone"]
    location_or_link: str | None = Field(default=None, max_length=500)
    notes: str | None = Field(default=None, max_length=2000)


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    type: str
    message: str
    is_read: bool
    created_at: datetime
