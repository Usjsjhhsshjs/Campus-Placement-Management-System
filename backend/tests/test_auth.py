import jwt
from datetime import datetime, timedelta, timezone

from app.core.config import get_settings
from app.core.security import hash_token
from app.core import security  # noqa: F401
from tests.helpers import PASSWORD, auth, recruiter_payload, register_recruiter, register_student, student_payload


def test_health(client):
    assert client.get("/api/v1/health").json() == {"status": "ok", "database": "connected"}


def test_student_register_and_login(client):
    register_student(client)
    r = client.post("/api/v1/auth/login", json={"email": "student1@example.com", "password": PASSWORD, "role": "student"})
    assert r.status_code == 200
    assert r.json()["user"]["role"] == "student"
    assert "password" not in r.text.lower().replace("password_hash", "")


def test_recruiter_register_and_login(client):
    register_recruiter(client)
    r = client.post("/api/v1/auth/login", json={"email": "recruiter1@example.com", "password": PASSWORD, "role": "recruiter"})
    assert r.status_code == 200 and r.json()["user"]["full_name"] == "Recruiter 1"


def test_wrong_password_and_wrong_role(client):
    register_student(client)
    bad = client.post("/api/v1/auth/login", json={"email": "student1@example.com", "password": "Wrong1234", "role": "student"})
    assert bad.status_code == 401
    wrong_role = client.post("/api/v1/auth/login", json={"email": "student1@example.com", "password": PASSWORD, "role": "recruiter"})
    assert wrong_role.status_code == 403


def test_duplicate_email_and_roll_number_blocked(client):
    register_student(client, 1)
    same_email = client.post("/api/v1/auth/register/student", json=student_payload(2, email="student1@example.com"))
    assert same_email.status_code == 409
    same_roll = client.post("/api/v1/auth/register/student", json=student_payload(3, roll_number="2300001"))
    assert same_roll.status_code == 409
    rec_dup = client.post("/api/v1/auth/register/recruiter", json=recruiter_payload(1, email="student1@example.com"))
    assert rec_dup.status_code == 409


def test_invalid_registration_input(client):
    weak = client.post("/api/v1/auth/register/student", json=student_payload(1, password="short"))
    assert weak.status_code == 422
    bad_cgpa = client.post("/api/v1/auth/register/student", json=student_payload(1, cgpa=11))
    assert bad_cgpa.status_code == 422
    bad_phone = client.post("/api/v1/auth/register/student", json=student_payload(1, phone="12"))
    assert bad_phone.status_code == 422
    bad_email = client.post("/api/v1/auth/register/student", json=student_payload(1, email="nope"))
    assert bad_email.status_code == 422


def test_no_token_invalid_token_and_expired_token(client):
    assert client.get("/api/v1/students/profile").status_code == 401
    assert client.get("/api/v1/students/profile", headers=auth("garbage")).status_code == 401
    s = get_settings()
    expired = jwt.encode({"sub": "1", "role": "student", "exp": datetime.now(timezone.utc) - timedelta(minutes=1)},
                         s.SECRET_KEY, algorithm="HS256")
    r = client.get("/api/v1/students/profile", headers=auth(expired))
    assert r.status_code == 401 and "expired" in r.json()["detail"].lower()


def test_roles_are_enforced_by_the_server(client):
    student = register_student(client)
    recruiter = register_recruiter(client)
    assert client.get("/api/v1/recruiters/profile", headers=student).status_code == 403
    assert client.get("/api/v1/students/profile", headers=recruiter).status_code == 403
    assert client.post("/api/v1/opportunities", json={}, headers=student).status_code == 403
    assert client.get("/api/v1/recruiter/applications", headers=student).status_code == 403
    assert client.get("/api/v1/opportunities", headers=recruiter).status_code == 403


def test_password_reset_flow(client, monkeypatch):
    register_student(client)
    token = "known-test-token-0123456789"
    monkeypatch.setattr("app.routes.auth.generate_reset_token", lambda: (token, hash_token(token)))
    r = client.post("/api/v1/auth/forgot-password", json={"email": "student1@example.com"})
    assert r.status_code == 200
    unknown = client.post("/api/v1/auth/forgot-password", json={"email": "nobody@example.com"})
    assert unknown.json() == r.json()  # same answer: emails cannot be probed
    assert client.post("/api/v1/auth/reset-password", json={"token": "wrong-token-123456", "new_password": "NewPass123"}).status_code == 400
    ok = client.post("/api/v1/auth/reset-password", json={"token": token, "new_password": "NewPass123"})
    assert ok.status_code == 200
    again = client.post("/api/v1/auth/reset-password", json={"token": token, "new_password": "Another123"})
    assert again.status_code == 400  # token is single-use
    login = client.post("/api/v1/auth/login", json={"email": "student1@example.com", "password": "NewPass123", "role": "student"})
    assert login.status_code == 200
