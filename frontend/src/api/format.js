import { API_ORIGIN } from "./client";

export const STATUS = {
  applied: { label: "Applied", cls: "bg-slate-100 text-slate-700" },
  under_review: { label: "Under review", cls: "bg-amber-50 text-amber-800" },
  shortlisted: { label: "Shortlisted", cls: "bg-campus-50 text-campus-700" },
  interview_scheduled: { label: "Interview scheduled", cls: "bg-campus-100 text-campus-700" },
  selected: { label: "Selected", cls: "bg-emerald-50 text-moss" },
  rejected: { label: "Rejected", cls: "bg-red-50 text-brick" },
};

export const PIPELINE = ["applied", "under_review", "shortlisted", "interview_scheduled", "selected"];

export const fmtDate = (v) =>
  v ? new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

export const fmtDateTime = (v) =>
  v
    ? new Date(v).toLocaleString("en-IN", {
        day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit",
      })
    : "";

export function daysLeft(deadline) {
  const ms = new Date(deadline).getTime() - Date.now();
  if (ms <= 0) return "Closed";
  const d = Math.ceil(ms / 86400000);
  return d === 1 ? "1 day left" : `${d} days left`;
}

export const splitList = (s) => (s ? s.split(",").map((x) => x.trim()).filter(Boolean) : []);
export const logoSrc = (url) => (url ? `${API_ORIGIN}${url}` : null);
export const MODE_LABEL = { online: "Online", in_person: "In person", phone: "Phone" };
export const TYPE_LABEL = { job: "Job", internship: "Internship" };

/** Converts a <input type="datetime-local"> value to an ISO string with timezone. */
export const localToIso = (v) => (v ? new Date(v).toISOString() : null);

/** ISO string -> value for <input type="datetime-local"> in the user's timezone. */
export function isoToLocal(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
