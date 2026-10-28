from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_recruiter
from app.models import Application, Company, Interview, Notification, Opportunity, Recruiter
from app.schemas.recruiter import RecruiterOut, RecruiterStats, RecruiterUpdate
from app.services.file_service import delete_file, save_logo

router = APIRouter(prefix="/recruiters", tags=["recruiters"])


def _out(r: Recruiter) -> RecruiterOut:
    return RecruiterOut(
        id=r.id, email=r.user.email, full_name=r.full_name, designation=r.designation,
        phone=r.phone, company=r.company,
    )


@router.get("/profile", response_model=RecruiterOut)
def get_profile(recruiter: Recruiter = Depends(get_current_recruiter)):
    return _out(recruiter)


@router.put("/profile", response_model=RecruiterOut)
def update_profile(data: RecruiterUpdate, recruiter: Recruiter = Depends(get_current_recruiter), db: Session = Depends(get_db)):
    recruiter.full_name, recruiter.designation, recruiter.phone = data.full_name, data.designation, data.phone
    if recruiter.company is None:
        recruiter.company = Company(name=data.company_name)
    c = recruiter.company
    c.name, c.description = data.company_name, data.company_description
    c.website, c.location = data.company_website, data.company_location
    db.commit()
    return _out(recruiter)


@router.post("/company/logo", response_model=RecruiterOut)
def upload_logo(file: UploadFile = File(...), recruiter: Recruiter = Depends(get_current_recruiter), db: Session = Depends(get_db)):
    name = save_logo(file)
    delete_file("logos", recruiter.company.logo_path)
    recruiter.company.logo_path = name
    db.commit()
    return _out(recruiter)


@router.get("/stats", response_model=RecruiterStats)
def stats(recruiter: Recruiter = Depends(get_current_recruiter), db: Session = Depends(get_db)):
    own = (Opportunity.recruiter_id == recruiter.id, Opportunity.deleted_at.is_(None))
    total = db.scalar(select(func.count()).select_from(Opportunity).where(*own)) or 0
    active = db.scalar(select(func.count()).select_from(Opportunity).where(
        *own, Opportunity.status == "active", Opportunity.deadline > datetime.now(timezone.utc))) or 0
    by_status = dict(db.execute(
        select(Application.status, func.count()).join(Opportunity, Application.opportunity_id == Opportunity.id)
        .where(*own).group_by(Application.status)).all())
    upcoming = db.scalar(
        select(func.count()).select_from(Interview)
        .join(Application, Interview.application_id == Application.id)
        .join(Opportunity, Application.opportunity_id == Opportunity.id)
        .where(Opportunity.recruiter_id == recruiter.id, Interview.status == "scheduled",
               Interview.scheduled_start > datetime.now(timezone.utc))) or 0
    unread = db.scalar(select(func.count()).select_from(Notification).where(
        Notification.user_id == recruiter.user_id, Notification.is_read.is_(False))) or 0
    return RecruiterStats(postings_total=total, postings_active=active, applications_total=sum(by_status.values()),
                          by_status=by_status, upcoming_interviews=upcoming, unread_notifications=unread)
