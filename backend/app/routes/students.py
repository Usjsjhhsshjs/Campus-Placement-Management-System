from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_student
from app.models import Application, Interview, Notification, Student
from app.schemas.application import ApplicationOut
from app.schemas.student import StudentOut, StudentStats, StudentUpdate
from app.services.access import application_loaders
from app.services.file_service import delete_file, save_resume, upload_dir
from app.services.serializers import application_out

router = APIRouter(prefix="/students", tags=["students"])


@router.get("/profile", response_model=StudentOut)
def get_profile(student: Student = Depends(get_current_student)):
    return student


@router.put("/profile", response_model=StudentOut)
def update_profile(data: StudentUpdate, student: Student = Depends(get_current_student), db: Session = Depends(get_db)):
    for field, value in data.model_dump().items():
        setattr(student, field, value)
    db.commit()
    return student


@router.post("/resume", response_model=StudentOut)
def upload_resume(file: UploadFile = File(...), student: Student = Depends(get_current_student), db: Session = Depends(get_db)):
    new_name = save_resume(file)
    delete_file("resumes", student.resume_path)
    student.resume_path = new_name
    db.commit()
    return student


@router.get("/resume")
def download_own_resume(student: Student = Depends(get_current_student)):
    if not student.resume_path:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No resume uploaded")
    return FileResponse(upload_dir("resumes") / student.resume_path, media_type="application/pdf", filename="resume.pdf")


@router.get("/applications", response_model=list[ApplicationOut])
def my_applications(student: Student = Depends(get_current_student), db: Session = Depends(get_db)):
    rows = db.scalars(
        select(Application).where(Application.student_id == student.id)
        .options(*application_loaders()).order_by(Application.created_at.desc())
    ).all()
    return [application_out(a) for a in rows]


@router.get("/stats", response_model=StudentStats)
def my_stats(student: Student = Depends(get_current_student), db: Session = Depends(get_db)):
    by_status = dict(db.execute(
        select(Application.status, func.count()).where(Application.student_id == student.id).group_by(Application.status)
    ).all())
    upcoming = db.scalar(
        select(func.count()).select_from(Interview).join(Application, Interview.application_id == Application.id)
        .where(Application.student_id == student.id, Interview.status == "scheduled",
               Interview.scheduled_start > datetime.now(timezone.utc))
    )
    unread = db.scalar(select(func.count()).select_from(Notification).where(
        Notification.user_id == student.user_id, Notification.is_read.is_(False)))
    return StudentStats(applications_total=sum(by_status.values()), by_status=by_status,
                        upcoming_interviews=upcoming or 0, unread_notifications=unread or 0)
