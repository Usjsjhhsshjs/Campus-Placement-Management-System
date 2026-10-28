import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.security import (
    create_access_token, generate_reset_token, hash_password, hash_token, verify_password,
)
from app.models import Company, PasswordResetToken, Recruiter, Student, User
from app.schemas.auth import (
    ForgotPasswordRequest, LoginRequest, RecruiterRegister, ResetPasswordRequest,
    StudentRegister, TokenResponse, UserOut,
)
from app.schemas.common import Message
from app.services.email_service import send_email

logger = logging.getLogger("campusconnect.auth")
router = APIRouter(prefix="/auth", tags=["auth"])


def _display_name(user: User) -> str:
    profile = user.student or user.recruiter
    return profile.full_name if profile else user.email


def _token_response(user: User) -> TokenResponse:
    return TokenResponse(
        access_token=create_access_token(user.id, user.role),
        user=UserOut(id=user.id, email=user.email, role=user.role, full_name=_display_name(user)),
    )


def _ensure_email_free(db: Session, email: str) -> None:
    if db.scalar(select(User.id).where(User.email == email)):
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists.")


@router.post("/register/student", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register_student(data: StudentRegister, db: Session = Depends(get_db)):
    _ensure_email_free(db, data.email)
    if db.scalar(select(Student.id).where(Student.roll_number == data.roll_number)):
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this roll number already exists.")
    user = User(email=data.email, password_hash=hash_password(data.password), role="student")
    student = Student(
        user=user, full_name=data.full_name, roll_number=data.roll_number, father_name=data.father_name,
        phone=data.phone, college=data.college, course=data.course, branch=data.branch,
        semester=data.semester, cgpa=data.cgpa, skills=data.skills,
    )
    db.add(student)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "This email or roll number is already registered.")
    return _token_response(user)


@router.post("/register/recruiter", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register_recruiter(data: RecruiterRegister, db: Session = Depends(get_db)):
    _ensure_email_free(db, data.email)
    user = User(email=data.email, password_hash=hash_password(data.password), role="recruiter")
    company = Company(
        name=data.company_name, description=data.company_description,
        website=data.company_website, location=data.company_location,
    )
    recruiter = Recruiter(
        user=user, company=company, full_name=data.full_name,
        designation=data.designation, phone=data.phone,
    )
    db.add(recruiter)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists.")
    return _token_response(user)


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == data.email))
    if user is None or not verify_password(data.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password.")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This account is disabled.")
    if user.role != data.role:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            f"This is a {user.role} account. Please use the {user.role} login.",
        )
    return _token_response(user)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return UserOut(id=user.id, email=user.email, role=user.role, full_name=_display_name(user))


@router.post("/forgot-password", response_model=Message)
def forgot_password(data: ForgotPasswordRequest, background: BackgroundTasks, db: Session = Depends(get_db)):
    settings = get_settings()
    generic = Message(message="If an account exists for that email, a reset link has been prepared.")
    user = db.scalar(select(User).where(User.email == data.email))
    if user is None:
        return generic  # same answer either way, so emails cannot be probed
    token, token_hash = generate_reset_token()
    db.add(PasswordResetToken(
        user_id=user.id, token_hash=token_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
    ))
    db.commit()
    link = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    email_ready = bool(settings.RESEND_API_KEY and settings.EMAIL_FROM)
    if email_ready:
        background.add_task(
            send_email, user.email, "Reset your CampusConnect password",
            f'<p>Click to reset your password (valid for 1 hour):</p><p><a href="{link}">{link}</a></p>',
        )
    elif settings.APP_ENV == "development":
        # LOCAL DEVELOPMENT ONLY: no email provider is configured, so print the link here.
        logger.warning("DEV ONLY - password reset link for %s: %s", user.email, link)
    return generic


@router.post("/reset-password", response_model=Message)
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    record = db.scalar(select(PasswordResetToken).where(PasswordResetToken.token_hash == hash_token(data.token)))
    now = datetime.now(timezone.utc)
    if record is None or record.used_at is not None or record.expires_at < now:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This reset link is invalid or has expired.")
    user = db.get(User, record.user_id)
    user.password_hash = hash_password(data.new_password)
    record.used_at = now
    db.commit()
    return Message(message="Password updated. You can now log in.")
