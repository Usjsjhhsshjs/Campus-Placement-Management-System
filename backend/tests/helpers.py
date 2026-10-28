from datetime import datetime, timedelta, timezone

PASSWORD = "Passw0rd123"
PDF_BYTES = b"%PDF-1.4\n%fake but valid-looking pdf for tests\n%%EOF"


def future(days=7, hours=0):
    return (datetime.now(timezone.utc) + timedelta(days=days, hours=hours)).isoformat()


def student_payload(n=1, **over):
    data = {
        "full_name": f"Student {n}", "roll_number": f"23{n:05d}", "email": f"student{n}@example.com",
        "phone": "9876543210", "password": PASSWORD, "father_name": "Father Name",
        "college": "Gulzar Group of Institutions", "course": "B.Tech", "branch": "Computer Science",
        "semester": 6, "cgpa": 8.5, "skills": "Python, React",
    }
    data.update(over)
    return data


def recruiter_payload(n=1, **over):
    data = {
        "full_name": f"Recruiter {n}", "email": f"recruiter{n}@example.com", "phone": "9123456780",
        "password": PASSWORD, "designation": "HR Manager", "company_name": f"Company {n}",
        "company_description": "We build things.", "company_website": "https://example.com",
        "company_location": "Ludhiana",
    }
    data.update(over)
    return data


def job_payload(**over):
    data = {
        "type": "job", "title": "Backend Developer",
        "description": "Build and maintain REST APIs using Python and FastAPI.",
        "skills": "Python, FastAPI", "location": "Ludhiana", "compensation": "6 LPA",
        "min_cgpa": 7, "eligible_branches": "Computer Science, IT", "deadline": future(10),
    }
    data.update(over)
    return data


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def register_student(client, n=1, **over):
    r = client.post("/api/v1/auth/register/student", json=student_payload(n, **over))
    assert r.status_code == 201, r.text
    return auth(r.json()["access_token"])


def register_recruiter(client, n=1, **over):
    r = client.post("/api/v1/auth/register/recruiter", json=recruiter_payload(n, **over))
    assert r.status_code == 201, r.text
    return auth(r.json()["access_token"])


def post_job(client, headers, **over):
    r = client.post("/api/v1/opportunities", json=job_payload(**over), headers=headers)
    assert r.status_code == 201, r.text
    return r.json()
