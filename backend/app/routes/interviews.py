from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.database import get_db
from app.core.deps import get_current_recruiter, get_current_user
from app.models import Application, Interview, Opportunity, Recruiter, User
from app.schemas.application import InterviewCreate, InterviewOut
from app.services.access import get_owned_application
from app.services.application_service import add_history
from app.services.email_service import send_email
from app.services.interview_service import ensure_no_conflict
from app.services.notification_service import notify
from app.services.serializers import interview_out

router = APIRouter(prefix="/interviews", tags=["interviews"])

_loaders = (
    selectinload(Interview.application).selectinload(Application.student),
    selectinload(Interview.application).selectinload(Application.opportunity).selectinload(Opportunity.company),
)


def _fmt(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).strftime("%d %b %Y, %H:%M UTC")


@router.post("", response_model=InterviewOut, status_code=status.HTTP_201_CREATED)
def schedule(
    data: InterviewCreate, background: BackgroundTasks,
    recruiter: Recruiter = Depends(get_current_recruiter), db: Session = Depends(get_db),
):
    app = get_owned_application(db, recruiter, data.application_id)
    if app.status in ("selected", "rejected"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cannot schedule an interview for a finished application.")
    start = data.scheduled_start
    if start.tzinfo is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Interview time must include a timezone")
    if start <= datetime.now(timezone.utc):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Interview time must be in the future.")
    if data.mode in ("online", "in_person") and not (data.location_or_link or "").strip():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Add a meeting link or a location for this interview.")
    end = start + timedelta(minutes=data.duration_minutes)
    ensure_no_conflict(db, app, start, end)

    interview = Interview(
        application_id=app.id, scheduled_start=start, duration_minutes=data.duration_minutes,
        mode=data.mode, location_or_link=(data.location_or_link or None), notes=data.notes or None,
    )
    db.add(interview)
    if app.status != "interview_scheduled":
        old, app.status = app.status, "interview_scheduled"
        add_history(db, app, old, "interview_scheduled", recruiter.user_id)
    title, company = app.opportunity.title, app.opportunity.company.name
    notify(db, app.student.user_id, "interview_scheduled",
           f"Interview for {title} at {company} on {_fmt(start)}.")
    db.commit()
    background.add_task(
        send_email, app.student.user.email, "Interview scheduled",
        f"<p>Your interview for <b>{title}</b> at {company} is on <b>{_fmt(start)}</b> "
        f"({data.mode.replace('_', ' ')}). Details are in your CampusConnect dashboard.</p>",
    )
    db.refresh(interview)
    return interview_out(interview)


@router.get("", response_model=list[InterviewOut])
def list_interviews(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    stmt = select(Interview).join(Application, Interview.application_id == Application.id)
    if user.role == "student":
        stmt = stmt.where(Application.student_id == user.student.id)
    else:
        stmt = stmt.join(Opportunity, Application.opportunity_id == Opportunity.id).where(
            Opportunity.recruiter_id == user.recruiter.id)
    rows = db.scalars(stmt.options(*_loaders).order_by(Interview.scheduled_start)).all()
    return [interview_out(i) for i in rows]


@router.put("/{interview_id}/cancel", response_model=InterviewOut)
def cancel(interview_id: int, recruiter: Recruiter = Depends(get_current_recruiter), db: Session = Depends(get_db)):
    interview = db.scalar(
        select(Interview).join(Application, Interview.application_id == Application.id)
        .join(Opportunity, Application.opportunity_id == Opportunity.id)
        .where(Interview.id == interview_id, Opportunity.recruiter_id == recruiter.id).options(*_loaders)
    )
    if interview is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Interview not found")
    if interview.status != "scheduled":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Only scheduled interviews can be cancelled.")
    interview.status = "cancelled"
    app = interview.application
    notify(db, app.student.user_id, "interview_cancelled",
           f"Your interview for {app.opportunity.title} on {_fmt(interview.scheduled_start)} was cancelled.")
    db.commit()
    return interview_out(interview)
