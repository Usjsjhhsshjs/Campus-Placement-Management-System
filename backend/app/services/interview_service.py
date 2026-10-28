"""Interview scheduling rules, including overlap detection."""
from datetime import datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Application, Interview, Opportunity

MAX_DURATION = timedelta(minutes=480)


def _overlapping(candidates: list[Interview], start: datetime, end: datetime) -> bool:
    return any(
        i.scheduled_start < end and i.scheduled_start + timedelta(minutes=i.duration_minutes) > start
        for i in candidates
    )


def ensure_no_conflict(db: Session, app: Application, start: datetime, end: datetime) -> None:
    """Blocks double-booking for the recruiter AND for the student."""
    window_start, window_end = start - MAX_DURATION, end
    base = (
        select(Interview)
        .join(Application, Interview.application_id == Application.id)
        .where(
            Interview.status == "scheduled",
            Interview.scheduled_start >= window_start,
            Interview.scheduled_start < window_end,
        )
    )
    student_rows = db.scalars(base.where(Application.student_id == app.student_id)).all()
    if _overlapping(list(student_rows), start, end):
        raise HTTPException(status.HTTP_409_CONFLICT, "This student already has an interview that overlaps this time.")

    recruiter_id = app.opportunity.recruiter_id
    recruiter_rows = db.scalars(
        base.join(Opportunity, Application.opportunity_id == Opportunity.id).where(Opportunity.recruiter_id == recruiter_id)
    ).all()
    if _overlapping(list(recruiter_rows), start, end):
        raise HTTPException(status.HTTP_409_CONFLICT, "You already have an interview that overlaps this time.")
