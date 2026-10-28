from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.database import get_db
from app.core.deps import get_current_recruiter, get_current_student, get_current_user
from app.models import Application, Company, Opportunity, Recruiter, Student, User
from app.schemas.common import Message, Page
from app.schemas.opportunity import OpportunityIn, OpportunityOut, OpportunityStatusIn
from app.services.access import get_owned_opportunity
from app.services.serializers import opportunity_out

router = APIRouter(tags=["opportunities"])


def _page(db: Session, stmt, page: int, page_size: int):
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(
        stmt.options(selectinload(Opportunity.company))
        .order_by(Opportunity.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    ).all()
    return total, rows


def _text_filter(stmt, q: str | None):
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(
            Opportunity.title.ilike(like), Company.name.ilike(like),
            Opportunity.location.ilike(like), Opportunity.skills.ilike(like),
        ))
    return stmt


@router.get("/opportunities", response_model=Page[OpportunityOut])
def browse(
    q: str | None = None,
    type_: str | None = Query(None, alias="type", pattern="^(job|internship)$"),
    location: str | None = None,
    skill: str | None = None,
    eligible_only: bool = False,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    """Open opportunities for students: active, not deleted, deadline not passed."""
    stmt = (
        select(Opportunity).join(Company, Opportunity.company_id == Company.id)
        .where(Opportunity.deleted_at.is_(None), Opportunity.status == "active",
               Opportunity.deadline > datetime.now(timezone.utc))
    )
    stmt = _text_filter(stmt, q)
    if type_:
        stmt = stmt.where(Opportunity.type == type_)
    if location:
        stmt = stmt.where(Opportunity.location.ilike(f"%{location.strip()}%"))
    if skill:
        stmt = stmt.where(Opportunity.skills.ilike(f"%{skill.strip()}%"))
    if eligible_only:
        branch = student.branch.strip().lower().replace("%", "").replace("_", "")
        stmt = stmt.where(or_(Opportunity.min_cgpa.is_(None),
                              Opportunity.min_cgpa <= (student.cgpa if student.cgpa is not None else -1)))
        stmt = stmt.where(or_(
            Opportunity.eligible_branches.is_(None), Opportunity.eligible_branches == "",
            func.lower(func.concat(",", Opportunity.eligible_branches, ",")).like(f"%,{branch},%"),
        ))
    total, rows = _page(db, stmt, page, page_size)
    applied = set(db.scalars(select(Application.opportunity_id).where(
        Application.student_id == student.id, Application.opportunity_id.in_([o.id for o in rows]))).all())
    return Page(items=[opportunity_out(o, student, applied) for o in rows], total=total, page=page, page_size=page_size)


@router.get("/opportunities/{opp_id}", response_model=OpportunityOut)
def detail(opp_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role == "student":
        opp = db.scalar(select(Opportunity).where(Opportunity.id == opp_id, Opportunity.deleted_at.is_(None)))
        if opp is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Opportunity not found")
        applied = set(db.scalars(select(Application.opportunity_id).where(
            Application.student_id == user.student.id, Application.opportunity_id == opp.id)).all())
        return opportunity_out(opp, user.student, applied)
    opp = get_owned_opportunity(db, user.recruiter, opp_id)
    count = db.scalar(select(func.count()).select_from(Application).where(Application.opportunity_id == opp.id))
    return opportunity_out(opp, app_count=count or 0)


@router.get("/recruiter/opportunities", response_model=Page[OpportunityOut])
def my_postings(
    q: str | None = None,
    type_: str | None = Query(None, alias="type", pattern="^(job|internship)$"),
    state: str = Query("all", pattern="^(all|active|closed)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    recruiter: Recruiter = Depends(get_current_recruiter),
    db: Session = Depends(get_db),
):
    stmt = (
        select(Opportunity).join(Company, Opportunity.company_id == Company.id)
        .where(Opportunity.recruiter_id == recruiter.id, Opportunity.deleted_at.is_(None))
    )
    stmt = _text_filter(stmt, q)
    now = datetime.now(timezone.utc)
    if type_:
        stmt = stmt.where(Opportunity.type == type_)
    if state == "active":
        stmt = stmt.where(Opportunity.status == "active", Opportunity.deadline > now)
    elif state == "closed":
        stmt = stmt.where(or_(Opportunity.status == "closed", Opportunity.deadline <= now))
    total, rows = _page(db, stmt, page, page_size)
    counts = dict(db.execute(
        select(Application.opportunity_id, func.count()).where(Application.opportunity_id.in_([o.id for o in rows]))
        .group_by(Application.opportunity_id)).all())
    return Page(items=[opportunity_out(o, app_count=counts.get(o.id, 0)) for o in rows],
                total=total, page=page, page_size=page_size)


@router.post("/opportunities", response_model=OpportunityOut, status_code=status.HTTP_201_CREATED)
def create(data: OpportunityIn, recruiter: Recruiter = Depends(get_current_recruiter), db: Session = Depends(get_db)):
    if recruiter.company_id is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Add your company details before posting.")
    opp = Opportunity(recruiter_id=recruiter.id, company_id=recruiter.company_id, status="active", **data.model_dump())
    db.add(opp)
    db.commit()
    return opportunity_out(opp, app_count=0)


@router.put("/opportunities/{opp_id}", response_model=OpportunityOut)
def update(opp_id: int, data: OpportunityIn, recruiter: Recruiter = Depends(get_current_recruiter), db: Session = Depends(get_db)):
    opp = get_owned_opportunity(db, recruiter, opp_id)
    for field, value in data.model_dump().items():
        setattr(opp, field, value)
    db.commit()
    count = db.scalar(select(func.count()).select_from(Application).where(Application.opportunity_id == opp.id))
    return opportunity_out(opp, app_count=count or 0)


@router.post("/opportunities/{opp_id}/status", response_model=OpportunityOut)
def set_status(opp_id: int, data: OpportunityStatusIn, recruiter: Recruiter = Depends(get_current_recruiter), db: Session = Depends(get_db)):
    opp = get_owned_opportunity(db, recruiter, opp_id)
    if data.status == "active" and opp.deadline <= datetime.now(timezone.utc):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Extend the deadline (edit the posting) before reopening it.")
    opp.status = data.status
    db.commit()
    count = db.scalar(select(func.count()).select_from(Application).where(Application.opportunity_id == opp.id))
    return opportunity_out(opp, app_count=count or 0)


@router.delete("/opportunities/{opp_id}", response_model=Message)
def delete(opp_id: int, recruiter: Recruiter = Depends(get_current_recruiter), db: Session = Depends(get_db)):
    """Soft delete: the row stays so existing applications keep a valid link."""
    opp = get_owned_opportunity(db, recruiter, opp_id)
    opp.deleted_at = datetime.now(timezone.utc)
    opp.status = "closed"
    db.commit()
    return Message(message="Posting deleted.")
