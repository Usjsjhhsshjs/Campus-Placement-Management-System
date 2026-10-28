import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, CalendarClock, PlusCircle, UserCheck, Users } from "lucide-react";
import { api, errorMessage } from "../../api/client";
import { STATUS, fmtDate } from "../../api/format";
import { Card, EmptyState, ErrorState, PageHeader, Spinner, StatusBadge } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";

export default function RecruiterDashboard() {
  const { user } = useAuth();
  const stats = useQuery({ queryKey: ["recruiter-stats"], queryFn: async () => (await api.get("/recruiters/stats")).data });
  const recent = useQuery({ queryKey: ["recent-applicants"], queryFn: async () => (await api.get("/recruiter/applications", { params: { page_size: 5 } })).data });

  if (stats.isLoading || recent.isLoading) return <Spinner />;
  if (stats.isError || recent.isError) return <ErrorState message={errorMessage(stats.error || recent.error)} onRetry={() => { stats.refetch(); recent.refetch(); }} />;

  const s = stats.data;
  const cards = [
    { label: "Active postings", value: s.postings_active, icon: Briefcase },
    { label: "Applications received", value: s.applications_total, icon: Users },
    { label: "Shortlisted", value: (s.by_status.shortlisted || 0) + (s.by_status.interview_scheduled || 0), icon: UserCheck },
    { label: "Upcoming interviews", value: s.upcoming_interviews, icon: CalendarClock },
  ];
  const total = s.applications_total || 1;

  return (
    <>
      <PageHeader title={`Welcome, ${user.full_name.split(" ")[0]}`} subtitle="A snapshot of your hiring."
        action={<Link to="/recruiter/postings/new" className="inline-flex items-center gap-2 rounded-md bg-campus-500 px-4 py-2 text-sm font-semibold text-white hover:bg-campus-600"><PlusCircle className="h-4 w-4" /> Post an opening</Link>} />

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
        <Card>
          <h2 className="text-lg font-semibold">Applicants by stage</h2>
          {s.applications_total === 0 ? <p className="mt-3 text-sm text-muted">No applications yet.</p> : (
            <ul className="mt-4 space-y-3">
              {Object.keys(STATUS).map((key) => (
                <li key={key}>
                  <div className="mb-1 flex justify-between text-sm"><span>{STATUS[key].label}</span><span className="font-semibold">{s.by_status[key] || 0}</span></div>
                  <div className="h-2 rounded bg-paper"><div className={`h-2 rounded ${key === "rejected" ? "bg-brick" : key === "selected" ? "bg-moss" : "bg-campus-500"}`} style={{ width: `${((s.by_status[key] || 0) / total) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Latest applicants</h2>
            <Link to="/recruiter/applicants" className="text-sm font-semibold text-campus-600 hover:underline">View all</Link>
          </div>
          {recent.data.items.length === 0 ? (
            <EmptyState icon={Users} title="No applicants yet">Once students apply to your postings they will show up here.</EmptyState>
          ) : (
            <ul className="space-y-3">
              {recent.data.items.map((a) => (
                <li key={a.id}>
                  <Link to={`/recruiter/applicants/${a.id}`} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white p-4 hover:shadow-md">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{a.student.full_name}</p>
                      <p className="truncate text-sm text-muted">{a.opportunity.title} · {fmtDate(a.created_at)}</p>
                    </div>
                    <StatusBadge status={a.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
