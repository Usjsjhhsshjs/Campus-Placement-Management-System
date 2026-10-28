"""Ownership checks. A recruiter can only reach rows that belong to them (404 otherwise)."""
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Application, Opportunity, Recruiter


def application_loaders():
    return (
        selectinload(Application.student),
        selectinload(Application.opportunity).selectinload(Opportunity.company),
        selectinload(Application.history),
        selectinload(Application.interviews),
    )


def get_owned_opportunity(db: Session, recruiter: Recruiter, opp_id: int) -> Opportunity:
    opp = db.scalar(
        select(Opportunity).where(
            Opportunity.id == opp_id,
            Opportunity.recruiter_id == recruiter.id,
            Opportunity.deleted_at.is_(None),
        )
    )
    if opp is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Opportunity not found")
    return opp


def get_owned_application(db: Session, recruiter: Recruiter, app_id: int) -> Application:
    app = db.scalar(
        select(Application)
        .join(Opportunity, Application.opportunity_id == Opportunity.id)
        .where(Application.id == app_id, Opportunity.recruiter_id == recruiter.id)
        .options(*application_loaders())
    )
    if app is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Application not found")
    return app
