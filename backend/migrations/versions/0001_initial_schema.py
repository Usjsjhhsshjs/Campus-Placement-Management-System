"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-10-23
"""
import sqlalchemy as sa
from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None

TS = lambda name: sa.Column(name, sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False)  # noqa: E731
STATUSES = "'applied','under_review','shortlisted','interview_scheduled','selected','rejected'"


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        TS("created_at"), TS("updated_at"),
        sa.CheckConstraint("role IN ('student','recruiter')", name="ck_users_role"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "companies",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.Text),
        sa.Column("website", sa.String(300)),
        sa.Column("location", sa.String(200)),
        sa.Column("logo_path", sa.String(300)),
        TS("created_at"), TS("updated_at"),
    )
    op.create_index("ix_companies_name", "companies", ["name"])

    op.create_table(
        "students",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("full_name", sa.String(150), nullable=False),
        sa.Column("roll_number", sa.String(30), nullable=False),
        sa.Column("father_name", sa.String(150), nullable=False),
        sa.Column("phone", sa.String(20), nullable=False),
        sa.Column("college", sa.String(200), nullable=False),
        sa.Column("course", sa.String(100), nullable=False),
        sa.Column("branch", sa.String(100), nullable=False),
        sa.Column("semester", sa.Integer),
        sa.Column("cgpa", sa.Numeric(4, 2)),
        sa.Column("skills", sa.Text),
        sa.Column("resume_path", sa.String(300)),
        TS("created_at"), TS("updated_at"),
        sa.CheckConstraint("cgpa IS NULL OR (cgpa >= 0 AND cgpa <= 10)", name="ck_students_cgpa"),
        sa.CheckConstraint("semester IS NULL OR (semester >= 1 AND semester <= 12)", name="ck_students_semester"),
    )
    op.create_index("ix_students_roll_number", "students", ["roll_number"], unique=True)

    op.create_table(
        "recruiters",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("company_id", sa.Integer, sa.ForeignKey("companies.id", ondelete="SET NULL")),
        sa.Column("full_name", sa.String(150), nullable=False),
        sa.Column("designation", sa.String(150)),
        sa.Column("phone", sa.String(20)),
        TS("created_at"), TS("updated_at"),
    )

    op.create_table(
        "opportunities",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("recruiter_id", sa.Integer, sa.ForeignKey("recruiters.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("company_id", sa.Integer, sa.ForeignKey("companies.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("type", sa.String(20), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("skills", sa.Text),
        sa.Column("location", sa.String(200)),
        sa.Column("compensation", sa.String(100)),
        sa.Column("min_cgpa", sa.Numeric(4, 2)),
        sa.Column("eligible_branches", sa.Text),
        sa.Column("deadline", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
        TS("created_at"), TS("updated_at"),
        sa.CheckConstraint("type IN ('job','internship')", name="ck_opp_type"),
        sa.CheckConstraint("status IN ('active','closed')", name="ck_opp_status"),
    )
    op.create_index("ix_opportunities_recruiter_id", "opportunities", ["recruiter_id"])
    op.create_index("ix_opportunities_company_id", "opportunities", ["company_id"])
    op.create_index("ix_opportunities_type", "opportunities", ["type"])
    op.create_index("ix_opp_status_deadline", "opportunities", ["status", "deadline"])

    op.create_table(
        "applications",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("student_id", sa.Integer, sa.ForeignKey("students.id", ondelete="CASCADE"), nullable=False),
        sa.Column("opportunity_id", sa.Integer, sa.ForeignKey("opportunities.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("cover_note", sa.Text),
        sa.Column("status", sa.String(30), nullable=False, server_default="applied"),
        TS("created_at"), TS("updated_at"),
        sa.UniqueConstraint("student_id", "opportunity_id", name="uq_application_student_opportunity"),
        sa.CheckConstraint(f"status IN ({STATUSES})", name="ck_application_status"),
    )
    op.create_index("ix_applications_student_id", "applications", ["student_id"])
    op.create_index("ix_applications_opportunity_id", "applications", ["opportunity_id"])
    op.create_index("ix_applications_status", "applications", ["status"])

    op.create_table(
        "application_status_history",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("application_id", sa.Integer, sa.ForeignKey("applications.id", ondelete="CASCADE"), nullable=False),
        sa.Column("old_status", sa.String(30)),
        sa.Column("new_status", sa.String(30), nullable=False),
        sa.Column("changed_by_user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="SET NULL")),
        TS("changed_at"),
    )
    op.create_index("ix_status_history_application_id", "application_status_history", ["application_id"])

    op.create_table(
        "interviews",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("application_id", sa.Integer, sa.ForeignKey("applications.id", ondelete="CASCADE"), nullable=False),
        sa.Column("scheduled_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("duration_minutes", sa.Integer, nullable=False, server_default="30"),
        sa.Column("mode", sa.String(20), nullable=False),
        sa.Column("location_or_link", sa.String(500)),
        sa.Column("notes", sa.Text),
        sa.Column("status", sa.String(20), nullable=False, server_default="scheduled"),
        TS("created_at"), TS("updated_at"),
        sa.CheckConstraint("mode IN ('online','in_person','phone')", name="ck_interview_mode"),
        sa.CheckConstraint("status IN ('scheduled','completed','cancelled')", name="ck_interview_status"),
        sa.CheckConstraint("duration_minutes > 0 AND duration_minutes <= 480", name="ck_interview_duration"),
    )
    op.create_index("ix_interviews_application_id", "interviews", ["application_id"])
    op.create_index("ix_interviews_scheduled_start", "interviews", ["scheduled_start"])

    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("type", sa.String(50), nullable=False),
        sa.Column("message", sa.Text, nullable=False),
        sa.Column("is_read", sa.Boolean, nullable=False, server_default=sa.false()),
        TS("created_at"),
    )
    op.create_index("ix_notifications_user_read", "notifications", ["user_id", "is_read"])

    op.create_table(
        "password_reset_tokens",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(128), nullable=False, unique=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True)),
        TS("created_at"),
    )
    op.create_index("ix_password_reset_tokens_user_id", "password_reset_tokens", ["user_id"])


def downgrade() -> None:
    for table in (
        "password_reset_tokens", "notifications", "interviews", "application_status_history",
        "applications", "opportunities", "recruiters", "students", "companies", "users",
    ):
        op.drop_table(table)
