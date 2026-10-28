import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowRight, Bell, CalendarClock, FileText, Search } from "lucide-react";
import { api, errorMessage } from "../../api/client";
import { MODE_LABEL, fmtDate, fmtDateTime } from "../../api/format";
import { Card, EmptyState, ErrorState, PageHeader, Spinner, StatusBadge } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";

const get = (url) => async () => (await api.get(url)).data;

export default function StudentDashboard() {
  const { user } = useAuth();
  const stats = useQuery({ queryKey: ["student-stats"], queryFn: get("/students/stats") });
  const apps = useQuery({ queryKey: ["my-applications"], queryFn: get("/students/applications") });
  const interviews = useQuery({ queryKey: ["interviews"], queryFn: get("/interviews") });
  const profile = useQuery({ queryKey: ["student-profile"], queryFn: get("/students/profile") });

  if (stats.isLoading || apps.isLoading) return <Spinner />;
  if (stats.isError || apps.isError) return <ErrorState message={errorMessage(stats.error || apps.error)} onRetry={() => { stats.refetch(); apps.refetch(); }} />;

  const s = stats.data;
  const upcoming = (interviews.data || []).filter((i) => i.status === "scheduled" && new Date(i.scheduled_start) > new Date()).slice(0, 3);
  const inProgress = (s.by_status.under_review || 0) + (s.by_status.shortlisted || 0) + (s.by_status.interview_scheduled || 0);
  const missing = profile.data && [!profile.data.cgpa && "CGPA", !profile.data.skills && "skills", !profile.data.has_resume && "resume"].filter(Boolean);
  const cards = [
    { label: "Applications sent", value: s.applications_total, icon: FileText },
    { label: "In progress", value: inProgress, icon: ArrowRight },
    { label: "Upcoming interviews", value: s.upcoming_interviews, icon: CalendarClock },
    { label: "Unread notifications", value: s.unread_notifications, icon: Bell },
  ];

  return (
    <>
      <PageHeader title={`Hello, ${user.full_name.split(" ")[0]}`} subtitle="Here is where your applications stand." />

      {missing?.length > 0 && (
        <Link to="/student/profile" className="mb-6 flex items-start gap-3 rounded-lg border border-saffron/40 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <span>Your profile is missing your <b>{missing.join(", ")}</b>. Recruiters look at these first. <u>Complete it now</u></span>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <Icon className="h-5 w-5 text-campus-500" aria-hidden />
            <p className="mt-3 font-display text-3xl font-bold">{value}</p>
            <p className="text-sm text-muted">{label}</p>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent applications</h2>
            <Link to="/student/applications" className="text-sm font-semibold text-campus-600 hover:underline">View all</Link>
          </div>
          {apps.data.length === 0 ? (
            <EmptyState icon={Search} title="No applications yet" action={<Link to="/student/jobs" className="text-sm font-semibold text-campus-600 hover:underline">Browse openings</Link>}>
              When you apply to a job or internship, you can follow it here.
            </EmptyState>
          ) : (
            <ul className="space-y-3">
              {apps.data.slice(0, 4).map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white p-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{a.opportunity.title}</p>
                    <p className="truncate text-sm text-muted">{a.opportunity.company_name} · applied {fmtDate(a.created_at)}</p>
                  </div>
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Upcoming interviews</h2>
            <Link to="/student/interviews" className="text-sm font-semibold text-campus-600 hover:underline">View all</Link>
          </div>
          {upcoming.length === 0 ? (
            <EmptyState icon={CalendarClock} title="No interviews scheduled">Interview details will show up here when a recruiter schedules one.</EmptyState>
          ) : (
            <ul className="space-y-3">
              {upcoming.map((i) => (
                <li key={i.id} className="rounded-lg border border-line bg-white p-4">
                  <p className="font-medium">{i.opportunity_title} · {i.company_name}</p>
                  <p className="text-sm text-muted">{fmtDateTime(i.scheduled_start)} · {MODE_LABEL[i.mode]}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
