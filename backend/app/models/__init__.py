"""Import every model so Alembic and SQLAlchemy can see all tables."""
from app.models.application import Application, ApplicationStatusHistory
from app.models.company import Company
from app.models.interview import Interview
from app.models.notification import Notification
from app.models.opportunity import Opportunity
from app.models.password_reset import PasswordResetToken
from app.models.recruiter import Recruiter
from app.models.student import Student
from app.models.user import User

__all__ = [
    "Application", "ApplicationStatusHistory", "Company", "Interview", "Notification",
    "Opportunity", "PasswordResetToken", "Recruiter", "Student", "User",
]
