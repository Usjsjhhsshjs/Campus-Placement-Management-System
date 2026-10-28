import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, FileText } from "lucide-react";
import { api, errorMessage } from "../../api/client";
import { MODE_LABEL, TYPE_LABEL, fmtDate, fmtDateTime } from "../../api/format";
import Pipeline from "../../components/Pipeline";
import { Card, Chip, EmptyState, ErrorState, PageHeader, Spinner, StatusBadge } from "../../components/ui";

export default function Applications() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["my-applications"],
    queryFn: async () => (await api.get("/students/applications")).data,
  });

  if (isLoading) return <Spinner />;
  if (isError) return <ErrorState message={errorMessage(error)} onRetry={refetch} />;

  return (
    <>
      <PageHeader title="My applications" subtitle="Every application you have sent and where it stands now." />
      {data.length === 0 ? (
        <EmptyState icon={FileText} title="You have not applied anywhere yet" action={<Link to="/student/jobs" className="text-sm font-semibold text-campus-600 hover:underline">Browse openings</Link>}>
          Applications you submit will appear here with live status updates.
        </EmptyState>
      ) : (
        <div className="space-y-5">
          {data.map((a) => (
            <Card key={a.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link to={`/student/jobs/${a.opportunity.id}`} className="text-lg font-semibold hover:underline">{a.opportunity.title}</Link>
                    <Chip>{TYPE_LABEL[a.opportunity.type]}</Chip>
                  </div>
                  <p className="text-sm text-muted">{a.opportunity.company_name} · applied on {fmtDate(a.created_at)}</p>
                </div>
                <StatusBadge status={a.status} />
              </div>
              <div className="mt-5"><Pipeline status={a.status} history={a.history} /></div>
              {a.interviews.filter((i) => i.status === "scheduled").map((i) => (
                <div key={i.id} className="mt-5 flex items-start gap-3 rounded-md bg-campus-50 p-3 text-sm">
                  <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-campus-600" aria-hidden />
                  <div>
                    <p className="font-semibold text-campus-700">Interview on {fmtDateTime(i.scheduled_start)} ({i.duration_minutes} min, {MODE_LABEL[i.mode]})</p>
                    {i.location_or_link && <p className="break-all">{/^https?:/.test(i.location_or_link)
                      ? <a href={i.location_or_link} target="_blank" rel="noopener noreferrer" className="underline">{i.location_or_link}</a> : i.location_or_link}</p>}
                    {i.notes && <p className="text-muted">{i.notes}</p>}
                  </div>
                </div>
              ))}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
