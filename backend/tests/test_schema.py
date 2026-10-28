from app.core.database import Base


def test_duplicate_applications_blocked_by_unique_constraint():
    names = {c.name for c in Base.metadata.tables["applications"].constraints}
    assert "uq_application_student_opportunity" in names


def test_roll_number_and_email_have_unique_indexes():
    assert any(i.unique for i in Base.metadata.tables["students"].indexes if "roll_number" in [c.name for c in i.columns])
    assert any(i.unique for i in Base.metadata.tables["users"].indexes if "email" in [c.name for c in i.columns])
