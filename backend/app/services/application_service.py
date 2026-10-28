"""Business rules for applying and for moving an application through its statuses."""
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Application, ApplicationStatusHistory, Opportunity, Student
from app.services.notification_service import notify

STATUS_LABELS = {
    "applied": "Applied",
    "under_review": "Under Review",
    "shortlisted": "Shortlisted",
    "interview_scheduled": "Interview Scheduled",
    "selected": "Selected",
    "rejected": "Rejected",
}

# Which status may follow which. "interview_scheduled" is only reached by scheduling an
# interview (see interview_service), never by a plain status update.
TRANSITIONS = {
    "applied": {"under_review", "shortlisted", "rejected"},
    "under_review": {"shortlisted", "rejected"},
    "shortlisted": {"selected", "rejected"},
    "interview_scheduled": {"selected", "rejected"},
    "selected": set(),
    "rejected": set(),
}


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def is_open(opp: Opportunity) -> bool:
    return opp.status == "active" and opp.deleted_at is None and opp.deadline > now_utc()


def eligibility_problem(student: Student, opp: Opportunity) -> str | None:
    """Returns a human-readable reason if the student is NOT eligible, else None."""
    if opp.min_cgpa is not None:
        if student.cgpa is None:
            return f"Add your CGPA to your profile. This opening needs at least {opp.min_cgpa}."
        if student.cgpa < opp.min_cgpa:
            return f"Minimum CGPA required is {opp.min_cgpa}; your CGPA is {student.cgpa}."
    if opp.eligible_branches:
        allowed = [b.strip().lower() for b in opp.eligible_branches.split(",") if b.strip()]
        if allowed and student.branch.strip().lower() not in allowed:
            return f"Open only to: {opp.eligible_branches}."
    return None


def add_history(db: Session, app: Application, old: str | None, new: str, user_id: int | None) -> None:
    db.add(ApplicationStatusHistory(application=app, old_status=old, new_status=new, changed_by_user_id=user_id))


def submit_application(db: Session, student: Student, opp: Opportunity, cover_note: str | None) -> Application:
    if not is_open(opp):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Applications for this opening are closed.")
    problem = eligibility_problem(student, opp)
    if problem:
        raise HTTPException(status.HTTP_403_FORBIDDEN, problem)
    existing = db.scalar(
        select(Application.id).where(Application.student_id == student.id, Application.opportunity_id == opp.id)
    )
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "You have already applied to this opening.")

    app = Application(student_id=student.id, opportunity_id=opp.id, cover_note=cover_note or None, status="applied")
    db.add(app)
    try:
        db.flush()  # the UNIQUE constraint catches a double-click race here
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "You have already applied to this opening.")
    add_history(db, app, None, "applied", student.user_id)
    notify(db, student.user_id, "application_submitted",
           f"Your application for {opp.title} at {opp.company.name} was submitted.")
    notify(db, opp.recruiter.user_id, "new_application",
           f"{student.full_name} applied for {opp.title}.")
    db.commit()
    return app


def change_status(db: Session, app: Application, new_status: str, actor_user_id: int) -> None:
    allowed = TRANSITIONS.get(app.status, set())
    if new_status not in allowed:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Cannot move from {STATUS_LABELS[app.status]} to {STATUS_LABELS.get(new_status, new_status)}.",
        )
    old = app.status
    app.status = new_status
    add_history(db, app, old, new_status, actor_user_id)
    notify(db, app.student.user_id, "status_update",
           f"Your application for {app.opportunity.title} at {app.opportunity.company.name} "
           f"is now: {STATUS_LABELS[new_status]}.")
