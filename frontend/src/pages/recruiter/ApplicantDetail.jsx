import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarPlus, CheckCircle2, Eye, XCircle } from "lucide-react";
import { api, errorMessage, fieldErrors, openProtectedFile } from "../../api/client";
import { MODE_LABEL, TYPE_LABEL, fmtDate, fmtDateTime, localToIso, splitList } from "../../api/format";
import Pipeline from "../../components/Pipeline";
import { Button, Card, Chip, ConfirmDialog, ErrorState, Field, Input, Modal, Select, Spinner, StatusBadge, Textarea, useToast } from "../../components/ui";
import { useForm } from "../../hooks/useForm";

// Mirrors the server's rules. The server still checks every change.
const NEXT = {
  applied: ["under_review", "shortlisted", "rejected"],
  under_review: ["shortlisted", "rejected"],
  shortlisted: ["selected", "rejected"],
  interview_scheduled: ["selected", "rejected"],
  selected: [], rejected: [],
};
const ACTION = {
  under_review: { label: "Mark under review", variant: "secondary" },
  shortlisted: { label: "Shortlist", variant: "primary" },
  selected: { label: "Select candidate", variant: "primary", icon: CheckCircle2 },
  rejected: { label: "Reject", variant: "danger", icon: XCircle },
};

function InterviewForm({ appId, onDone }) {
  const qc = useQueryClient();
  const toast = useToast();
  const { values, errors, setErrors, bind } = useForm({ when: "", duration_minutes: "30", mode: "online", location_or_link: "", notes: "" });
  const create = useMutation({
    mutationFn: () => api.post("/interviews", {
      application_id: appId, scheduled_start: localToIso(values.when), duration_minutes: Number(values.duration_minutes),
      mode: values.mode, location_or_link: values.location_or_link.trim() || null, notes: values.notes.trim() || null,
    }),
    onSuccess: () => {
      toast.success("Interview scheduled. The student has been notified.");
      ["application", "applicants", "interviews", "recruiter-stats"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      onDone();
    },
    onError: (err) => { setErrors(fieldErrors(err)); toast.error(errorMessage(err)); },
  });
  return (
    <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date and time" htmlFor="when" error={errors.scheduled_start}><Input {...bind("when")} type="datetime-local" required /></Field>
        <Field label="Duration" htmlFor="duration_minutes">
          <Select {...bind("duration_minutes")}>{[15, 30, 45, 60, 90, 120].map((m) => <option key={m} value={m}>{m} minutes</option>)}</Select>
        </Field>
        <Field label="Mode" htmlFor="mode"><Select {...bind("mode")}><option value="online">Online</option><option value="in_person">In person</option><option value="phone">Phone</option></Select></Field>
        <Field label={values.mode === "online" ? "Meeting link" : values.mode === "in_person" ? "Venue" : "Phone / details (optional)"} htmlFor="location_or_link">
          <Input {...bind("location_or_link")} required={values.mode !== "phone"} placeholder={values.mode === "online" ? "https://meet.google.com/…" : ""} />
        </Field>
      </div>
      <Field label="Notes for the student (optional)" htmlFor="notes"><Textarea {...bind("notes")} rows={3} maxLength={2000} placeholder="What to bring, who they will meet…" /></Field>
      <div className="flex justify-end gap-2"><Button variant="secondary" type="button" onClick={onDone}>Cancel</Button><Button type="submit" loading={create.isPending}>Schedule interview</Button></div>
    </form>
  );
}

export default function ApplicantDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const toast = useToast();
  const [confirm, setConfirm] = useState(null);
  const [schedule, setSchedule] = useState(false);

  const { data: a, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["application", id],
    queryFn: async () => (await api.get(`/applications/${id}`)).data,
  });

  const move = useMutation({
    mutationFn: (status) => api.put(`/applications/${id}/status`, { status }),
    onSuccess: (_, status) => {
      toast.success(`Status updated. The student has been notified.`);
      setConfirm(null);
      ["application", "applicants", "recent-applicants", "recruiter-stats"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
    onError: (err) => { setConfirm(null); toast.error(errorMessage(err)); },
  });

  if (isLoading) return <Spinner />;
  if (isError) return <ErrorState message={errorMessage(error)} onRetry={refetch} />;
  const s = a.student;
  const next = NEXT[a.status];
  const finished = a.status === "selected" || a.status === "rejected";
  const info = [["Roll number", s.roll_number], ["Email", s.email], ["Phone", s.phone], ["Father's name", s.father_name], ["College", s.college],
    ["Course", s.course], ["Branch", s.branch], ["Semester", s.semester ?? "—"], ["CGPA", s.cgpa ?? "—"]];

  return (
    <>
      <Link to="/recruiter/applicants" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-campus-600 hover:underline"><ArrowLeft className="h-4 w-4" /> Applicants</Link>
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{s.full_name}</h1>
            <p className="text-sm text-muted">Applied for <b>{a.opportunity.title}</b> <Chip>{TYPE_LABEL[a.opportunity.type]}</Chip> on {fmtDate(a.created_at)}</p>
          </div>
          <StatusBadge status={a.status} />
        </div>
        <div className="mt-6"><Pipeline status={a.status} history={a.history} /></div>
        <div className="mt-6 flex flex-wrap gap-2 border-t border-line pt-5">
          {next.map((st) => {
            const { label, variant, icon: Icon } = ACTION[st];
            const risky = st === "rejected" || st === "selected";
            return (
              <Button key={st} variant={variant} loading={move.isPending && move.variables === st}
                onClick={() => (risky ? setConfirm(st) : move.mutate(st))}>
                {Icon && <Icon className="h-4 w-4" />}{label}
              </Button>
            );
          })}
          {!finished && <Button variant="secondary" onClick={() => setSchedule(true)}><CalendarPlus className="h-4 w-4" /> Schedule interview</Button>}
          {finished && <p className="text-sm text-muted">This application is finished, so its status can no longer change.</p>}
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="text-lg font-semibold">Academic and personal details</h2>
          <dl className="mt-4 grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
            {info.map(([k, v]) => <div key={k}><dt className="text-muted">{k}</dt><dd className="mt-0.5 break-words font-medium">{v}</dd></div>)}
          </dl>
          <h3 className="mt-6 text-sm text-muted">Skills</h3>
          <div className="mt-2 flex flex-wrap gap-1.5">{splitList(s.skills).length ? splitList(s.skills).map((x) => <Chip key={x}>{x}</Chip>) : <span className="text-sm">Not provided</span>}</div>
          {a.cover_note && (<><h3 className="mt-6 text-sm text-muted">Cover note</h3><p className="mt-1 whitespace-pre-line text-sm">{a.cover_note}</p></>)}
        </Card>

        <div className="space-y-6">
          <Card>
            <h2 className="text-lg font-semibold">Resume</h2>
            {s.has_resume ? (
              <Button variant="secondary" className="mt-3" onClick={() => openProtectedFile(`/applications/${a.id}/resume`).catch((e) => toast.error("Could not open the resume."))}>
                <Eye className="h-4 w-4" /> Open resume (PDF)
              </Button>
            ) : <p className="mt-2 text-sm text-muted">This student has not uploaded a resume.</p>}
          </Card>
          <Card>
            <h2 className="text-lg font-semibold">Interviews</h2>
            {a.interviews.length === 0 ? <p className="mt-2 text-sm text-muted">None scheduled yet.</p> : (
              <ul className="mt-3 space-y-3 text-sm">
                {a.interviews.map((i) => (
                  <li key={i.id} className="rounded-md bg-paper p-3">
                    <p className="font-medium">{fmtDateTime(i.scheduled_start)} <span className="font-normal text-muted">· {i.duration_minutes} min · {MODE_LABEL[i.mode]}</span></p>
                    {i.location_or_link && <p className="break-all text-muted">{i.location_or_link}</p>}
                    <p className="mt-1 text-xs font-semibold capitalize text-muted">{i.status}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <ConfirmDialog open={Boolean(confirm)} loading={move.isPending}
        title={confirm === "rejected" ? "Reject this application?" : "Select this candidate?"}
        confirmLabel={confirm === "rejected" ? "Reject" : "Select"}
        message={`${s.full_name} will be notified and the application will be closed. This cannot be undone.`}
        onCancel={() => setConfirm(null)} onConfirm={() => move.mutate(confirm)} />
      <Modal open={schedule} onClose={() => setSchedule(false)} title={`Schedule interview with ${s.full_name}`} wide>
        <InterviewForm appId={a.id} onDone={() => setSchedule(false)} />
      </Modal>
    </>
  );
}
