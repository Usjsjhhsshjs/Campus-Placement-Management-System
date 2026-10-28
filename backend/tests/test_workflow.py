"""The full acceptance scenario: recruiter posts, student applies, recruiter reviews, student sees it."""
from tests.helpers import PDF_BYTES, auth, future, job_payload, post_job, register_recruiter, register_student

API = "/api/v1"


def test_profile_update_is_saved(client):
    h = register_student(client)
    body = client.get(f"{API}/students/profile", headers=h).json()
    body.update(father_name="New Father", cgpa=9.1, branch="IT", skills="Go")
    r = client.put(f"{API}/students/profile", json={k: body[k] for k in (
        "full_name", "father_name", "phone", "college", "course", "branch", "semester", "cgpa", "skills")}, headers=h)
    assert r.status_code == 200
    again = client.get(f"{API}/students/profile", headers=h).json()
    assert again["father_name"] == "New Father" and again["cgpa"] == 9.1 and again["roll_number"] == "2300001"


def test_recruiter_profile_and_company(client):
    h = register_recruiter(client)
    p = client.get(f"{API}/recruiters/profile", headers=h).json()
    assert p["company"]["name"] == "Company 1"
    upd = {"full_name": "R One", "designation": "CTO", "phone": "9123456780", "company_name": "Acme",
           "company_description": "Acme corp", "company_website": None, "company_location": "Delhi"}
    assert client.put(f"{API}/recruiters/profile", json=upd, headers=h).json()["company"]["name"] == "Acme"


def test_posting_validation(client):
    h = register_recruiter(client)
    past = client.post(f"{API}/opportunities", json=job_payload(deadline="2020-01-01T00:00:00+00:00"), headers=h)
    assert past.status_code == 422
    short = client.post(f"{API}/opportunities", json=job_payload(title="x"), headers=h)
    assert short.status_code == 422


def test_full_application_workflow(client):
    rec, stu = register_recruiter(client), register_student(client)
    job = post_job(client, rec)

    # student can browse, search and open the job
    listing = client.get(f"{API}/opportunities", headers=stu).json()
    assert listing["total"] == 1 and listing["items"][0]["company"]["name"] == "Company 1"
    assert client.get(f"{API}/opportunities?q=fastapi", headers=stu).json()["total"] == 1
    assert client.get(f"{API}/opportunities?q=nothing-like-this", headers=stu).json()["total"] == 0
    assert client.get(f"{API}/opportunities?type=internship", headers=stu).json()["total"] == 0
    detail = client.get(f"{API}/opportunities/{job['id']}", headers=stu).json()
    assert detail["eligible"] is True and detail["has_applied"] is False

    # apply directly
    applied = client.post(f"{API}/opportunities/{job['id']}/apply", json={"cover_note": "Hire me"}, headers=stu)
    assert applied.status_code == 201 and applied.json()["status"] == "applied"
    app_id = applied.json()["id"]

    # duplicate blocked
    assert client.post(f"{API}/opportunities/{job['id']}/apply", json={}, headers=stu).status_code == 409
    assert client.get(f"{API}/opportunities/{job['id']}", headers=stu).json()["has_applied"] is True

    # recruiter sees that exact application with the student's academic details
    rl = client.get(f"{API}/recruiter/applications", headers=rec).json()
    assert rl["total"] == 1 and rl["items"][0]["id"] == app_id
    s = rl["items"][0]["student"]
    assert s["roll_number"] == "2300001" and s["father_name"] == "Father Name" and s["cgpa"] == 8.5
    assert client.get(f"{API}/recruiter/opportunities", headers=rec).json()["items"][0]["applications_count"] == 1

    # recruiter updates status, student sees it, notifications exist
    up = client.put(f"{API}/applications/{app_id}/status", json={"status": "shortlisted"}, headers=rec)
    assert up.status_code == 200 and up.json()["status"] == "shortlisted"
    mine = client.get(f"{API}/students/applications", headers=stu).json()
    assert mine[0]["status"] == "shortlisted" and [h["new_status"] for h in mine[0]["history"]] == ["applied", "shortlisted"]
    texts = " ".join(n["message"] for n in client.get(f"{API}/notifications", headers=stu).json())
    assert "submitted" in texts and "Shortlisted" in texts
    assert any("applied" in n["message"] for n in client.get(f"{API}/notifications", headers=rec).json())


def test_invalid_status_transition_blocked(client):
    rec, stu = register_recruiter(client), register_student(client)
    job = post_job(client, rec)
    app_id = client.post(f"{API}/opportunities/{job['id']}/apply", json={}, headers=stu).json()["id"]
    assert client.put(f"{API}/applications/{app_id}/status", json={"status": "rejected"}, headers=rec).status_code == 200
    assert client.put(f"{API}/applications/{app_id}/status", json={"status": "selected"}, headers=rec).status_code == 400
    assert client.put(f"{API}/applications/{app_id}/status", json={"status": "interview_scheduled"}, headers=rec).status_code == 422


def test_application_safeguards(client):
    rec, stu = register_recruiter(client), register_student(client, cgpa=6.0)
    strict = post_job(client, rec, min_cgpa=8)
    assert client.post(f"{API}/opportunities/{strict['id']}/apply", json={}, headers=stu).status_code == 403
    wrong_branch = post_job(client, rec, title="Mechanical role", eligible_branches="Mechanical", min_cgpa=None)
    assert client.post(f"{API}/opportunities/{wrong_branch['id']}/apply", json={}, headers=stu).status_code == 403
    assert client.get(f"{API}/opportunities?eligible_only=true", headers=stu).json()["total"] == 0
    closed = post_job(client, rec, title="Closed role", min_cgpa=None, eligible_branches=None)
    client.post(f"{API}/opportunities/{closed['id']}/status", json={"status": "closed"}, headers=rec)
    assert client.post(f"{API}/opportunities/{closed['id']}/apply", json={}, headers=stu).status_code == 400
    assert client.post(f"{API}/opportunities/9999/apply", json={}, headers=stu).status_code == 404
    assert client.get(f"{API}/opportunities", headers=stu).json()["total"] == 2  # closed one is hidden


def test_recruiter_cannot_touch_another_recruiters_data(client):
    r1, r2, stu = register_recruiter(client, 1), register_recruiter(client, 2), register_student(client)
    job = post_job(client, r1)
    app_id = client.post(f"{API}/opportunities/{job['id']}/apply", json={}, headers=stu).json()["id"]
    assert client.get(f"{API}/recruiter/applications", headers=r2).json()["total"] == 0
    assert client.get(f"{API}/applications/{app_id}", headers=r2).status_code == 404
    assert client.put(f"{API}/applications/{app_id}/status", json={"status": "shortlisted"}, headers=r2).status_code == 404
    assert client.put(f"{API}/opportunities/{job['id']}", json=job_payload(title="Hacked title"), headers=r2).status_code == 404
    assert client.delete(f"{API}/opportunities/{job['id']}", headers=r2).status_code == 404
    assert client.get(f"{API}/opportunities/{job['id']}", headers=r2).status_code == 404
    assert client.get(f"{API}/applications/{app_id}/resume", headers=r2).status_code == 404


def test_student_cannot_see_another_students_application(client):
    rec, s1, s2 = register_recruiter(client), register_student(client, 1), register_student(client, 2)
    job = post_job(client, rec)
    app_id = client.post(f"{API}/opportunities/{job['id']}/apply", json={}, headers=s1).json()["id"]
    assert client.get(f"{API}/applications/{app_id}", headers=s2).status_code == 404
    assert client.get(f"{API}/students/applications", headers=s2).json() == []


def test_applicant_filters(client):
    rec = register_recruiter(client)
    s1, s2 = register_student(client, 1, cgpa=9.0), register_student(client, 2, cgpa=7.5, full_name="Zed Zebra")
    job = post_job(client, rec, min_cgpa=None)
    for h in (s1, s2):
        client.post(f"{API}/opportunities/{job['id']}/apply", json={}, headers=h)
    assert client.get(f"{API}/recruiter/applications?q=zebra", headers=rec).json()["total"] == 1
    assert client.get(f"{API}/recruiter/applications?min_cgpa=8", headers=rec).json()["total"] == 1
    assert client.get(f"{API}/recruiter/applications?status=applied", headers=rec).json()["total"] == 2
    assert client.get(f"{API}/recruiter/applications?status=selected", headers=rec).json()["total"] == 0
    assert client.get(f"{API}/recruiter/applications?page_size=1", headers=rec).json()["items"].__len__() == 1


def test_interview_scheduling_and_conflicts(client):
    rec = register_recruiter(client)
    s1, s2 = register_student(client, 1), register_student(client, 2)
    job = post_job(client, rec, min_cgpa=None)
    a1 = client.post(f"{API}/opportunities/{job['id']}/apply", json={}, headers=s1).json()["id"]
    a2 = client.post(f"{API}/opportunities/{job['id']}/apply", json={}, headers=s2).json()["id"]
    when = future(3)
    body = {"application_id": a1, "scheduled_start": when, "duration_minutes": 60, "mode": "online",
            "location_or_link": "https://meet.example.com/abc", "notes": "Bring ID"}
    ok = client.post(f"{API}/interviews", json=body, headers=rec)
    assert ok.status_code == 201, ok.text

    mine = client.get(f"{API}/interviews", headers=s1).json()
    assert len(mine) == 1 and mine[0]["location_or_link"].startswith("https://meet")
    assert client.get(f"{API}/students/applications", headers=s1).json()[0]["status"] == "interview_scheduled"
    assert client.get(f"{API}/interviews", headers=s2).json() == []

    # the recruiter cannot be double-booked, even with a different student
    clash = client.post(f"{API}/interviews", json={**body, "application_id": a2}, headers=rec)
    assert clash.status_code == 409
    # a non-overlapping slot is fine
    later = client.post(f"{API}/interviews", json={**body, "application_id": a2, "scheduled_start": future(3, 2)}, headers=rec)
    assert later.status_code == 201

    # validation
    assert client.post(f"{API}/interviews", json={**body, "scheduled_start": "2020-01-01T10:00:00+00:00"}, headers=rec).status_code == 400
    assert client.post(f"{API}/interviews", json={**body, "location_or_link": None, "scheduled_start": future(5)}, headers=rec).status_code == 400
    assert client.post(f"{API}/interviews", json=body, headers=s1).status_code == 403

    # cancelling frees the slot
    iid = ok.json()["id"]
    assert client.put(f"{API}/interviews/{iid}/cancel", headers=rec).json()["status"] == "cancelled"
    assert client.post(f"{API}/interviews", json={**body, "application_id": a2, "scheduled_start": when}, headers=rec).status_code == 201


def test_notifications_read_flow(client):
    rec, stu = register_recruiter(client), register_student(client)
    job = post_job(client, rec, min_cgpa=None)
    client.post(f"{API}/opportunities/{job['id']}/apply", json={}, headers=stu)
    assert client.get(f"{API}/notifications/unread-count", headers=stu).json()["count"] == 1
    nid = client.get(f"{API}/notifications", headers=stu).json()[0]["id"]
    assert client.post(f"{API}/notifications/{nid}/read", headers=rec).status_code == 404  # not theirs
    assert client.post(f"{API}/notifications/{nid}/read", headers=stu).status_code == 200
    assert client.get(f"{API}/notifications/unread-count", headers=stu).json()["count"] == 0
    assert client.post(f"{API}/notifications/read-all", headers=rec).status_code == 200


def test_resume_upload_and_recruiter_access(client):
    rec, rec2, stu = register_recruiter(client, 1), register_recruiter(client, 2), register_student(client)
    job = post_job(client, rec, min_cgpa=None)
    app_id = client.post(f"{API}/opportunities/{job['id']}/apply", json={}, headers=stu).json()["id"]
    assert client.get(f"{API}/applications/{app_id}/resume", headers=rec).status_code == 404  # none yet

    bad = client.post(f"{API}/students/resume", files={"file": ("cv.pdf", b"not a pdf", "application/pdf")}, headers=stu)
    assert bad.status_code == 400
    big = client.post(f"{API}/students/resume", files={"file": ("cv.pdf", b"%PDF-" + b"0" * (3 * 1024 * 1024), "application/pdf")}, headers=stu)
    assert big.status_code == 413
    ok = client.post(f"{API}/students/resume", files={"file": ("cv.pdf", PDF_BYTES, "application/pdf")}, headers=stu)
    assert ok.status_code == 200 and ok.json()["has_resume"] is True

    got = client.get(f"{API}/applications/{app_id}/resume", headers=rec)
    assert got.status_code == 200 and got.content == PDF_BYTES
    assert client.get(f"{API}/applications/{app_id}/resume", headers=rec2).status_code == 404
    assert client.get(f"{API}/applications/{app_id}/resume").status_code == 401


def test_deleting_a_posting_keeps_existing_applications(client):
    rec, stu = register_recruiter(client), register_student(client)
    job = post_job(client, rec, min_cgpa=None)
    client.post(f"{API}/opportunities/{job['id']}/apply", json={}, headers=stu)
    assert client.delete(f"{API}/opportunities/{job['id']}", headers=rec).status_code == 200
    assert client.get(f"{API}/opportunities", headers=stu).json()["total"] == 0
    mine = client.get(f"{API}/students/applications", headers=stu).json()
    assert len(mine) == 1 and mine[0]["opportunity"]["title"] == "Backend Developer"
    assert client.get(f"{API}/recruiter/opportunities", headers=rec).json()["total"] == 0


def test_stats(client):
    rec, stu = register_recruiter(client), register_student(client)
    job = post_job(client, rec, min_cgpa=None)
    client.post(f"{API}/opportunities/{job['id']}/apply", json={}, headers=stu)
    rs = client.get(f"{API}/recruiters/stats", headers=rec).json()
    assert rs["postings_active"] == 1 and rs["applications_total"] == 1 and rs["by_status"] == {"applied": 1}
    ss = client.get(f"{API}/students/stats", headers=stu).json()
    assert ss["applications_total"] == 1 and ss["unread_notifications"] == 1
