
# CampusConnect — Internship & Placement Management Portal

Students and recruiters on one portal. Recruiters publish jobs and internships, students apply
directly (no Google Forms), recruiters review applicants and update statuses, and students see the
result. Everything is saved in PostgreSQL and goes through a real FastAPI backend.

**Stack:** React + Vite + Tailwind + React Query · FastAPI + SQLAlchemy + Alembic · PostgreSQL · JWT + bcrypt

---

## 1. First-time setup (Windows, VS Code terminal)

### Install once
Python 3.12 (tick "Add to PATH"), Node.js LTS, PostgreSQL 16, VS Code.

### Create the databases (SQL Shell / psql, logged in as `postgres`)
```sql
CREATE USER campus_user WITH PASSWORD 'choose_a_password';
CREATE DATABASE campusconnect OWNER campus_user;
CREATE DATABASE campusconnect_test OWNER campus_user;
```
(`campusconnect_test` is only for automated tests. It is wiped on every test run.)

### Backend
```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```
Edit `backend\.env`: put your password in `DATABASE_URL` and a random `SECRET_KEY`
(`python -c "import secrets; print(secrets.token_urlsafe(48))"`).
```powershell
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```
Keep this terminal open. API docs: http://localhost:8000/docs

### Frontend (second terminal)
```powershell
cd frontend
copy .env.example .env
npm install
npm run dev
```
Open http://localhost:5173

---

## 2. Demo script (the acceptance scenario)

Use two browser windows (or one normal + one private window) so both users stay logged in.

1. **Recruiter window:** Sign up → *Recruiter* tab → fill your details and company → you land on the recruiter dashboard.
2. **Company & profile:** (optional) add a logo and company description.
3. **Job postings → New posting:** choose Job or Internship, fill title, description, package/stipend,
   location, skills, min CGPA, eligible branches, deadline → **Publish**.
4. **Student window:** Sign up → *Student* tab → fill roll number, father's name, branch, CGPA, skills etc.
   (use branch exactly as the recruiter wrote it, e.g. `Computer Science`).
5. **Browse openings:** the job appears. Search, filter, open it, click **Apply now**.
6. Try applying again: it is blocked (duplicate).
7. **Recruiter window → Applicants:** the application appears with the full academic profile and resume.
   Open it → **Shortlist** (or Mark under review / Reject / Select).
8. **Schedule interview** (date, time, mode, link). Try the same time for another student: it is blocked.
9. **Student window → My applications / Interviews / Notifications:** the new status, interview details
   and notifications are all there (refresh the page).

## 3. Run the automated tests
```powershell
cd backend
copy .env.test.example .env.test
```
Edit `.env.test` with your password (database name must stay `campusconnect_test`), then:
```powershell
.venv\Scripts\Activate.ps1
pytest -v
```
The tests build the schema using the real Alembic migration, then exercise registration, login, roles,
posting, applying, duplicate prevention, recruiter isolation, status flow, interviews and conflicts,
notifications, resume upload and password reset.

## 4. How the database fits together (for the viva)
- **users** holds every login (email, hashed password, role). A **students** or **recruiters** row extends it (one-to-one).
- A recruiter belongs to a **company** and owns **opportunities** (a job or an internship; the `type` column says which).
- A student applies to an opportunity, creating an **applications** row. A UNIQUE rule on
  (student, opportunity) makes duplicate applications impossible even if two requests arrive together.
- Every status change adds a row to **application_status_history**, which feeds the progress tracker.
- **interviews** belong to an application. **notifications** belong to a user. **password_reset_tokens**
  store only a hash of the one-hour reset token.
- Deleting a posting is a *soft delete* (`deleted_at`), so applications are never orphaned.

## 5. Security notes
- Passwords are hashed with bcrypt. Login tokens are JWTs that expire after 24 hours.
- Roles are enforced on the **server** for every private endpoint. A recruiter asking for another
  recruiter's posting or applicant gets "not found".
- Resumes are not publicly served; only the owning student and the recruiter who received the application can open them.
- The JWT is kept in `localStorage` (as in the project report). Trade-off: a script injected into the page
  could read it. A production system would use httpOnly cookies.
- Password reset: if no email provider is configured and `APP_ENV=development`, the reset link is printed in the
  **backend terminal** (development only). Set `RESEND_API_KEY` and `EMAIL_FROM` to send real emails.
  Emails are only reported as sent when the provider confirms; otherwise the app logs "not sent" and carries on.

## 6. What is and is not done
| Feature | Status |
|---|---|
| Student/recruiter registration, login, logout, role guards | Implemented |
| Forgot / reset password | Implemented (email optional) |
| Student profile, resume upload, browse + filters, apply, applications, interviews, notifications | Implemented |
| Recruiter company profile + logo, postings CRUD, close/reopen, applicants + filters, status flow, interviews, stats | Implemented |
| Duplicate / expired / ineligible application checks | Implemented |
| Interview overlap detection (student and recruiter) | Implemented |
| Email notifications | Optional via Resend; in-app notifications always work |
| Admin role, email verification, token refresh, slot-picking by students, bulk actions | Not built (future scope) |
| Docker | Only PostgreSQL via `docker-compose.yml`; backend `Dockerfile` provided, not tested |
| Load / uptime / performance figures | Not measured. Do not quote numbers from the old report unless you have evidence |

Known limits: no rate limiting on login; interview times are shown in your browser's timezone but
emails use UTC; forms rely on browser validation plus server validation.

# Campus-Placement-Management-System
Campus Placement Management System is a web-based platform that simplifies campus recruitment by connecting students, recruiters, and administrators. It streamlines job applications, candidate management, placement drives, and recruitment activities through a secure, centralized, and user-friendly system.
