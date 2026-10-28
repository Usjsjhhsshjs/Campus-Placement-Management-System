import { Link } from "react-router-dom";
import { ArrowRight, Bell, CalendarClock, ClipboardCheck, FileX2, Search, Users } from "lucide-react";
import { Logo } from "../components/Layout";
import Pipeline from "../components/Pipeline";

const SAMPLE_HISTORY = ["applied", "under_review", "shortlisted"].map((s, i) => ({
  new_status: s, changed_at: new Date(Date.now() - (3 - i) * 86400000).toISOString(),
}));

const STEPS = [
  ["Recruiter publishes", "A recruiter registers with their company and posts a job or internship with eligibility, package and deadline."],
  ["Student finds it", "Eligible students see it in Browse openings and can search by role, company, location or skill."],
  ["Apply in one click", "The student applies inside CampusConnect. No Google Form, and duplicate applications are blocked."],
  ["Recruiter reviews", "The application appears on the recruiter's dashboard with the full academic profile and resume."],
  ["Status flows back", "Shortlist, interview or selection updates reach the student instantly as a notification."],
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-paper">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <Logo />
        <nav className="flex items-center gap-2 text-sm font-semibold">
          <Link to="/login" className="rounded-md px-4 py-2 text-ink hover:bg-white">Log in</Link>
          <Link to="/register" className="rounded-md bg-campus-500 px-4 py-2 text-white hover:bg-campus-600">Sign up</Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-8 lg:grid-cols-2 lg:pt-14">
        <div>
          <h1 className="text-4xl font-bold leading-tight text-ink sm:text-5xl">
            Apply inside the portal.<br />
            <span className="text-campus-500">Track every step.</span>
          </h1>
          <p className="mt-5 max-w-lg text-lg text-muted">
            CampusConnect is a modern Campus Placement Management System that helps students discover opportunities, apply with ease, and track hiring progress in real time. Recruiters can efficiently post openings, review applications, and manage campus hiring from a single platform.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/register?role=student" className="inline-flex items-center gap-2 rounded-md bg-campus-500 px-5 py-3 font-semibold text-white hover:bg-campus-600">
              I'm a student <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/register?role=recruiter" className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-5 py-3 font-semibold text-ink hover:bg-paper">
              I'm a recruiter
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold">What a student sees for every application</p>
          <p className="mb-5 text-xs text-muted">Illustration of the progress tracker</p>
          <Pipeline status="shortlisted" history={SAMPLE_HISTORY} />
          <p className="mt-6 rounded-md bg-paper p-3 text-sm text-muted">
            Each change is saved with its date, and the student is notified the moment a recruiter moves them forward.
          </p>
        </div>
      </section>

      <section className="border-y border-line bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold">For students</h2>
            <ul className="mt-5 space-y-4 text-sm">
              <li className="flex gap-3"><Search className="mt-0.5 h-5 w-5 shrink-0 text-campus-500" /><span>Search jobs and internships and filter by the ones you are eligible for.</span></li>
              <li className="flex gap-3"><ClipboardCheck className="mt-0.5 h-5 w-5 shrink-0 text-campus-500" /><span>Fill your academic profile once and reuse it for every application.</span></li>
              <li className="flex gap-3"><CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-campus-500" /><span>See interview dates, timings and meeting links in one place.</span></li>
            </ul>
          </div>
          <div>
            <h2 className="text-2xl font-bold">For recruiters</h2>
            <ul className="mt-5 space-y-4 text-sm">
              <li className="flex gap-3"><FileX2 className="mt-0.5 h-5 w-5 shrink-0 text-campus-500" /><span>Publish an opening without building a form or collecting spreadsheets.</span></li>
              <li className="flex gap-3"><Users className="mt-0.5 h-5 w-5 shrink-0 text-campus-500" /><span>Filter applicants by CGPA, branch and skills, and open their resumes.</span></li>
              <li className="flex gap-3"><Bell className="mt-0.5 h-5 w-5 shrink-0 text-campus-500" /><span>Shortlist, reject, select and schedule interviews with clash checking.</span></li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl font-bold">How it works</h2>
        <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map(([title, text], i) => (
            <li key={title}>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-campus-500 text-sm font-bold text-white">{i + 1}</span>
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <footer className="border-t border-line bg-white py-6 text-center text-sm text-muted">
        CampusConnect © 2026 · Smart Campus Placement Management System
      </footer>
    </div>
  );
}
