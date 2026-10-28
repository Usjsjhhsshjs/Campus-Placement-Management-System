import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AuthShell, { RoleTabs } from "../../components/AuthShell";
import { Button, Field, Input, Textarea } from "../../components/ui";
import { errorMessage, fieldErrors } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useForm } from "../../hooks/useForm";

const PASSWORD_HINT = "At least 8 characters with a letter and a number";

function useSubmit(role, build, form) {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.values.password !== form.values.confirm) {
      form.setErrors({ confirm: "Passwords do not match" });
      return;
    }
    setBusy(true);
    try {
      const user = await register(role, build(form.values));
      navigate(`/${user.role}`, { replace: true });
    } catch (err) {
      const fields = fieldErrors(err);
      form.setErrors(fields);
      setError(Object.keys(fields).length ? "Please fix the highlighted fields." : errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return { submit, error, busy };
}

const blank = (v) => (v && String(v).trim() ? String(v).trim() : null);

function StudentForm() {
  const form = useForm({
    full_name: "", roll_number: "", email: "", phone: "", father_name: "", college: "Gulzar Group of Institutions",
    course: "B.Tech", branch: "", semester: "", cgpa: "", skills: "", password: "", confirm: "",
  });
  const { bind, errors } = form;
  const { submit, error, busy } = useSubmit("student", (v) => ({
    full_name: v.full_name, roll_number: v.roll_number, email: v.email, phone: v.phone, father_name: v.father_name,
    college: v.college, course: v.course, branch: v.branch, password: v.password,
    semester: v.semester ? Number(v.semester) : null, cgpa: v.cgpa ? Number(v.cgpa) : null, skills: blank(v.skills),
  }), form);

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <p className="rounded-md bg-red-50 p-3 text-sm text-brick" role="alert">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="full_name" error={errors.full_name}><Input {...bind("full_name")} required minLength={2} error={errors.full_name} autoComplete="name" /></Field>
        <Field label="Roll number" htmlFor="roll_number" error={errors.roll_number}><Input {...bind("roll_number")} required pattern="[A-Za-z0-9\-/]+" title="Letters, numbers, - or /" error={errors.roll_number} /></Field>
        <Field label="Email" htmlFor="email" error={errors.email}><Input {...bind("email")} type="email" required error={errors.email} autoComplete="email" /></Field>
        <Field label="Phone" htmlFor="phone" error={errors.phone}><Input {...bind("phone")} type="tel" required placeholder="10-digit mobile number" error={errors.phone} autoComplete="tel" /></Field>
        <Field label="Father's name" htmlFor="father_name" error={errors.father_name}><Input {...bind("father_name")} required minLength={2} error={errors.father_name} /></Field>
        <Field label="College" htmlFor="college" error={errors.college}><Input {...bind("college")} required error={errors.college} /></Field>
        <Field label="Degree / course" htmlFor="course" error={errors.course}><Input {...bind("course")} required error={errors.course} placeholder="B.Tech" /></Field>
        <Field label="Branch / department" htmlFor="branch" error={errors.branch}><Input {...bind("branch")} required error={errors.branch} placeholder="Computer Science" /></Field>
        <Field label="Current semester" htmlFor="semester" error={errors.semester}><Input {...bind("semester")} type="number" min="1" max="12" error={errors.semester} /></Field>
        <Field label="CGPA" htmlFor="cgpa" error={errors.cgpa} hint="Out of 10"><Input {...bind("cgpa")} type="number" step="0.01" min="0" max="10" error={errors.cgpa} /></Field>
      </div>
      <Field label="Skills" htmlFor="skills" error={errors.skills} hint="Separate with commas, e.g. Python, React, SQL"><Input {...bind("skills")} error={errors.skills} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Password" htmlFor="password" error={errors.password} hint={PASSWORD_HINT}><Input {...bind("password")} type="password" required minLength={8} error={errors.password} autoComplete="new-password" /></Field>
        <Field label="Confirm password" htmlFor="confirm" error={errors.confirm}><Input {...bind("confirm")} type="password" required error={errors.confirm} autoComplete="new-password" /></Field>
      </div>
      <Button type="submit" loading={busy} className="w-full">Create student account</Button>
    </form>
  );
}

function RecruiterForm() {
  const form = useForm({
    full_name: "", designation: "", email: "", phone: "", company_name: "", company_location: "",
    company_website: "", company_description: "", password: "", confirm: "",
  });
  const { bind, errors } = form;
  const { submit, error, busy } = useSubmit("recruiter", (v) => ({
    full_name: v.full_name, designation: blank(v.designation), email: v.email, phone: v.phone, password: v.password,
    company_name: v.company_name, company_location: blank(v.company_location),
    company_website: blank(v.company_website), company_description: blank(v.company_description),
  }), form);

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <p className="rounded-md bg-red-50 p-3 text-sm text-brick" role="alert">{error}</p>}
      <h2 className="text-sm font-semibold text-muted">About you</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="full_name" error={errors.full_name}><Input {...bind("full_name")} required minLength={2} error={errors.full_name} autoComplete="name" /></Field>
        <Field label="Designation" htmlFor="designation" error={errors.designation}><Input {...bind("designation")} placeholder="HR Manager" error={errors.designation} /></Field>
        <Field label="Work email" htmlFor="email" error={errors.email}><Input {...bind("email")} type="email" required error={errors.email} autoComplete="email" /></Field>
        <Field label="Phone" htmlFor="phone" error={errors.phone}><Input {...bind("phone")} type="tel" required error={errors.phone} autoComplete="tel" /></Field>
      </div>
      <h2 className="pt-2 text-sm font-semibold text-muted">Your company</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Company name" htmlFor="company_name" error={errors.company_name}><Input {...bind("company_name")} required minLength={2} error={errors.company_name} /></Field>
        <Field label="Location" htmlFor="company_location" error={errors.company_location}><Input {...bind("company_location")} placeholder="Ludhiana, Punjab" error={errors.company_location} /></Field>
      </div>
      <Field label="Website" htmlFor="company_website" error={errors.company_website}><Input {...bind("company_website")} type="url" placeholder="https://example.com" error={errors.company_website} /></Field>
      <Field label="About the company" htmlFor="company_description" error={errors.company_description}><Textarea {...bind("company_description")} error={errors.company_description} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Password" htmlFor="password" error={errors.password} hint={PASSWORD_HINT}><Input {...bind("password")} type="password" required minLength={8} error={errors.password} autoComplete="new-password" /></Field>
        <Field label="Confirm password" htmlFor="confirm" error={errors.confirm}><Input {...bind("confirm")} type="password" required error={errors.confirm} autoComplete="new-password" /></Field>
      </div>
      <Button type="submit" loading={busy} className="w-full">Create recruiter account</Button>
    </form>
  );
}

export default function Register() {
  const [params] = useSearchParams();
  const [role, setRole] = useState(params.get("role") === "recruiter" ? "recruiter" : "student");
  return (
    <AuthShell wide title="Create your account" subtitle="Students and recruiters sign up with different details.">
      <RoleTabs role={role} onChange={setRole} />
      {role === "student" ? <StudentForm key="s" /> : <RecruiterForm key="r" />}
      <p className="mt-6 text-center text-sm text-muted">
        Already registered? <Link to={`/login?role=${role}`} className="font-semibold text-campus-600 hover:underline">Log in</Link>
      </p>
    </AuthShell>
  );
}
