import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock } from "lucide-react";
import { Link } from "react-router-dom";
import { api, errorMessage } from "../../api/client";
import { MODE_LABEL, fmtDateTime } from "../../api/format";
import { Button, Card, ConfirmDialog, EmptyState, ErrorState, PageHeader, Spinner, useToast } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";

function InterviewCard({ i, recruiter, onCancel }) {
  const link = i.location_or_link;
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{i.opportunity_title} · {i.company_name}</p>
          {recruiter && <p className="text-sm text-muted">Candidate: <Link className="underline" to={`/recruiter/applicants/${i.application_id}`}>{i.student_name}</Link></p>}
          <p className="mt-2 text-sm"><b>{fmtDateTime(i.scheduled_start)}</b> · {i.duration_minutes} min · {MODE_LABEL[i.mode]}</p>
          {link && <p className="mt-1 break-all text-sm">{/^https?:/.test(link) ? <a href={link} target="_blank" rel="noopener noreferrer" className="text-campus-600 underline">{link}</a> : link}</p>}
          {i.notes && <p className="mt-1 text-sm text-muted">{i.notes}</p>}
        </div>
        <div className="text-right">
          <span className={`text-xs font-semibold capitalize ${i.status === "cancelled" ? "text-brick" : "text-muted"}`}>{i.status}</span>
          {recruiter && i.status === "scheduled" && <div className="mt-2"><Button variant="secondary" onClick={() => onCancel(i)}>Cancel</Button></div>}
        </div>
      </div>
    </Card>
  );
}

export default function Interviews() {
  const { user } = useAuth();
  const recruiter = user.role === "recruiter";
  const qc = useQueryClient();
  const toast = useToast();
  const [toCancel, setToCancel] = useState(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["interviews"],
    queryFn: async () => (await api.get("/interviews")).data,
  });
  const cancel = useMutation({
    mutationFn: (id) => api.put(`/interviews/${id}/cancel`),
    onSuccess: () => {
      toast.success("Interview cancelled. The student has been notified.");
      setToCancel(null);
      ["interviews", "recruiter-stats", "application"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
    onError: (e) => { setToCancel(null); toast.error(errorMessage(e)); },
  });

  if (isLoading) return <Spinner />;
  if (isError) return <ErrorState message={errorMessage(error)} onRetry={refetch} />;
  const now = new Date();
  const upcoming = data.filter((i) => i.status === "scheduled" && new Date(i.scheduled_start) > now);
  const past = data.filter((i) => !upcoming.includes(i)).reverse();

  return (
    <>
      <PageHeader title="Interviews" subtitle={recruiter ? "Interviews you have scheduled. Schedule new ones from an applicant's page." : "Your interview schedule."} />
      {data.length === 0 ? (
        <EmptyState icon={CalendarClock} title="No interviews yet">{recruiter ? "Open an applicant and choose Schedule interview." : "When a recruiter schedules an interview, the date, time and link show up here."}</EmptyState>
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-lg font-semibold">Upcoming</h2>
            {upcoming.length ? <div className="space-y-3">{upcoming.map((i) => <InterviewCard key={i.id} i={i} recruiter={recruiter} onCancel={setToCancel} />)}</div> : <p className="text-sm text-muted">Nothing upcoming.</p>}
          </section>
          {past.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold">Past and cancelled</h2>
              <div className="space-y-3">{past.map((i) => <InterviewCard key={i.id} i={i} recruiter={recruiter} onCancel={setToCancel} />)}</div>
            </section>
          )}
        </div>
      )}
      <ConfirmDialog open={Boolean(toCancel)} title="Cancel this interview?" confirmLabel="Cancel interview" loading={cancel.isPending}
        message="The student will be notified. The time slot becomes free again." onCancel={() => setToCancel(null)} onConfirm={() => cancel.mutate(toCancel.id)} />
    </>
  );
}
