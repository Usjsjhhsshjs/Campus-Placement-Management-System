"""Reusable FastAPI dependencies: who is logged in, and are they the right role?"""
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models import Recruiter, Student, User

bearer_scheme = HTTPBearer(auto_error=False)


def _unauthorized(message: str) -> HTTPException:
    return HTTPException(status.HTTP_401_UNAUTHORIZED, message, headers={"WWW-Authenticate": "Bearer"})


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if creds is None:
        raise _unauthorized("Not authenticated")
    try:
        payload = decode_access_token(creds.credentials)
        user_id = int(payload["sub"])
    except jwt.ExpiredSignatureError:
        raise _unauthorized("Your session has expired. Please log in again.")
    except (jwt.PyJWTError, KeyError, ValueError):
        raise _unauthorized("Invalid authentication token")
    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise _unauthorized("Account not found or disabled")
    return user


def get_current_student(user: User = Depends(get_current_user)) -> Student:
    if user.role != "student" or user.student is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This action is only for students")
    return user.student


def get_current_recruiter(user: User = Depends(get_current_user)) -> Recruiter:
    if user.role != "recruiter" or user.recruiter is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This action is only for recruiters")
    return user.recruiter
