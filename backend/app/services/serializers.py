"""Turn database objects into the response shapes the frontend expects."""
from app.models import Application, Interview, Opportunity, Student
from app.schemas.application import ApplicationOut, HistoryOut, InterviewOut, OpportunityBrief
from app.schemas.opportunity import OpportunityOut
from app.schemas.recruiter import CompanyOut
from app.schemas.student import StudentOut
from app.services.application_service import eligibility_problem, is_open


def opportunity_out(
    opp: Opportunity,
    student: Student | None = None,
    applied_ids: set[int] | None = None,
    app_count: int | None = None,
) -> OpportunityOut:
    out = OpportunityOut(
        id=opp.id, type=opp.type, title=opp.title, description=opp.description, skills=opp.skills,
        location=opp.location, compensation=opp.compensation, min_cgpa=opp.min_cgpa,
        eligible_branches=opp.eligible_branches, deadline=opp.deadline, status=opp.status,
        is_open=is_open(opp), created_at=opp.created_at, company=CompanyOut.model_validate(opp.company),
    )
    if student is not None:
        problem = eligibility_problem(student, opp)
        out.has_applied = opp.id in (applied_ids or set())
        out.eligible = problem is None
        out.ineligible_reason = problem
    if app_count is not None:
        out.applications_count = app_count
    return out


def interview_out(i: Interview) -> InterviewOut:
    app = i.application
    return InterviewOut(
        id=i.id, application_id=i.application_id, scheduled_start=i.scheduled_start,
        duration_minutes=i.duration_minutes, mode=i.mode, location_or_link=i.location_or_link,
        notes=i.notes, status=i.status, opportunity_title=app.opportunity.title,
        company_name=app.opportunity.company.name, student_name=app.student.full_name,
    )


def application_out(app: Application, include_student: bool = False) -> ApplicationOut:
    opp = app.opportunity
    return ApplicationOut(
        id=app.id, status=app.status, cover_note=app.cover_note, created_at=app.created_at,
        updated_at=app.updated_at,
        opportunity=OpportunityBrief(
            id=opp.id, title=opp.title, type=opp.type, location=opp.location,
            deadline=opp.deadline, company_name=opp.company.name,
        ),
        history=[HistoryOut.model_validate(h) for h in app.history],
        interviews=[interview_out(i) for i in sorted(app.interviews, key=lambda x: x.scheduled_start)],
        student=StudentOut.model_validate(app.student) if include_student else None,
    )
