from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_recruiter, get_current_student, get_current_user
from app.models import Application, Opportunity, Recruiter, Student, User
from app.schemas.application import ApplicationOut, ApplyRequest, StatusUpdate
from app.schemas.common import Page
from app.services.access import application_loaders, get_owned_application
from app.services.application_service import STATUS_LABELS, change_status, submit_application
from app.services.email_service import send_email
from app.services.file_service import upload_dir
from app.services.serializers import application_out

router = APIRouter(tags=["applications"])


@router.post("/opportunities/{opp_id}/apply", response_model=ApplicationOut, status_code=status.HTTP_201_CREATED)
def apply(opp_id: int, data: ApplyRequest, student: Student = Depends(get_current_student), db: Session = Depends(get_db)):
    opp = db.scalar(select(Opportunity).where(Opportunity.id == opp_id, Opportunity.deleted_at.is_(None)))
    if opp is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Opportunity not found")
    app = submit_application(db, student, opp, data.cover_note)
    app = db.scalar(select(Application).where(Application.id == app.id).options(*application_loaders()))
    return application_out(app)


@router.get("/recruiter/applications", response_model=Page[ApplicationOut])
def applicants(
    opportunity_id: int | None = None,
    status_: str | None = Query(None, alias="status"),
    q: str | None = None,
    min_cgpa: float | None = Query(None, ge=0, le=10),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    recruiter: Recruiter = Depends(get_current_recruiter),
    db: Session = Depends(get_db),
):
    """Applications received on the logged-in recruiter's postings only."""
    stmt = (
        select(Application)
        .join(Opportunity, Application.opportunity_id == Opportunity.id)
        .join(Student, Application.student_id == Student.id)
        .where(Opportunity.recruiter_id == recruiter.id)
    )
    if opportunity_id:
        stmt = stmt.where(Application.opportunity_id == opportunity_id)
    if status_:
        if status_ not in STATUS_LABELS:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Unknown status")
        stmt = stmt.where(Application.status == status_)
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(Student.full_name.ilike(like), Student.roll_number.ilike(like),
                              Student.branch.ilike(like), Student.skills.ilike(like)))
    if min_cgpa is not None:
        stmt = stmt.where(Student.cgpa >= min_cgpa)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(
        stmt.options(*application_loaders()).order_by(Application.created_at.desc())
        .offset((page - 1) * page_size).limit(page_size)
    ).all()
    return Page(items=[application_out(a, include_student=True) for a in rows], total=total, page=page, page_size=page_size)


@router.get("/applications/{app_id}", response_model=ApplicationOut)
def application_detail(app_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role == "recruiter":
        return application_out(get_owned_application(db, user.recruiter, app_id), include_student=True)
    app = db.scalar(select(Application).where(Application.id == app_id, Application.student_id == user.student.id)
                    .options(*application_loaders()))
    if app is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Application not found")
    return application_out(app)


@router.put("/applications/{app_id}/status", response_model=ApplicationOut)
def update_status(
    app_id: int, data: StatusUpdate, background: BackgroundTasks,
    recruiter: Recruiter = Depends(get_current_recruiter), db: Session = Depends(get_db),
):
    app = get_owned_application(db, recruiter, app_id)
    change_status(db, app, data.status, recruiter.user_id)
    db.commit()
    background.add_task(
        send_email, app.student.user.email, "Your application status changed",
        f"<p>Your application for <b>{app.opportunity.title}</b> at {app.opportunity.company.name} "
        f"is now <b>{STATUS_LABELS[app.status]}</b>.</p>",
    )
    return application_out(app, include_student=True)


@router.get("/applications/{app_id}/resume")
def applicant_resume(app_id: int, recruiter: Recruiter = Depends(get_current_recruiter), db: Session = Depends(get_db)):
    app = get_owned_application(db, recruiter, app_id)
    if not app.student.resume_path:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "This student has not uploaded a resume")
    return FileResponse(upload_dir("resumes") / app.student.resume_path, media_type="application/pdf",
                        filename=f"{app.student.roll_number}_resume.pdf")
