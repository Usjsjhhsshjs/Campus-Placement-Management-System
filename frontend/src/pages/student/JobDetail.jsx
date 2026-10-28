import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Clock, ExternalLink, GraduationCap, IndianRupee, MapPin } from "lucide-react";
import { api, errorMessage } from "../../api/client";
import { TYPE_LABEL, daysLeft, fmtDate, splitList } from "../../api/format";
import { CompanyLogo } from "../../components/OpportunityCard";
import { Button, Card, Chip, ErrorState, Field, Modal, Spinner, Textarea, useToast } from "../../components/ui";

export default function JobDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");

  const { data: opp, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["opportunity", id],
    queryFn: async () => (await api.get(`/opportunities/${id}`)).data,
  });
  const profile = useQuery({ queryKey: ["student-profile"], queryFn: async () => (await api.get("/students/profile")).data });

  const apply = useMutation({
    mutationFn: async () => (await api.post(`/opportunities/${id}/apply`, { cover_note: note.trim() || null })).data,
    onSuccess: () => {
      toast.success("Application submitted. You can track it under My applications.");
      setOpen(false);
      ["opportunity", "opportunities", "my-applications", "student-stats", "unread"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  if (isLoading) return <Spinner />;
  if (isError) return <ErrorState message={errorMessage(error, "This opening could not be found.")} onRetry={refetch} />;

  const blocked = opp.has_applied ? null : !opp.is_open ? "Applications for this opening are closed." : !opp.eligible ? opp.ineligible_reason : null;

  return (
    <>
      <Link to="/student/jobs" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-campus-600 hover:underline"><ArrowLeft className="h-4 w-4" /> All openings</Link>
      <Card>
        <div className="flex flex-wrap items-start gap-4">
          <CompanyLogo company={opp.company} size="h-14 w-14" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">{opp.title}</h1>
              <Chip>{TYPE_LABEL[opp.type]}</Chip>
            </div>
            <p className="text-muted">{opp.company.name}</p>
          </div>
          <div className="w-full sm:w-auto">
            {opp.has_applied ? (
              <Link to="/student/applications" className="flex items-center justify-center gap-2 rounded-md bg-emerald-50 px-4 py-2 text-sm font-semibold text-moss">
                <CheckCircle2 className="h-4 w-4" /> Applied · view status
              </Link>
            ) : (
              <Button disabled={Boolean(blocked)} onClick={() => setOpen(true)} className="w-full sm:w-auto">Apply now</Button>
            )}
          </div>
        </div>
        {blocked && <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900" role="status">{blocked}</p>}

        <dl className="mt-6 grid gap-4 border-t border-line pt-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div><dt className="flex items-center gap-1 text-muted"><MapPin className="h-4 w-4" />Location</dt><dd className="mt-1 font-medium">{opp.location || "Not specified"}</dd></div>
          <div><dt className="flex items-center gap-1 text-muted"><IndianRupee className="h-4 w-4" />{opp.type === "job" ? "Package" : "Stipend"}</dt><dd className="mt-1 font-medium">{opp.compensation || "Not disclosed"}</dd></div>
          <div><dt className="flex items-center gap-1 text-muted"><Clock className="h-4 w-4" />Apply by</dt><dd className="mt-1 font-medium">{fmtDate(opp.deadline)} <span className="text-saffron">({daysLeft(opp.deadline)})</span></dd></div>
          <div><dt className="flex items-center gap-1 text-muted"><GraduationCap className="h-4 w-4" />Eligibility</dt>
            <dd className="mt-1 font-medium">{opp.min_cgpa ? `CGPA ${opp.min_cgpa}+` : "Any CGPA"}{opp.eligible_branches ? ` · ${opp.eligible_branches}` : " · All branches"}</dd></div>
        </dl>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="text-lg font-semibold">About the role</h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">{opp.description}</p>
          {opp.skills && (
            <>
              <h3 className="mt-6 font-semibold">Skills required</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">{splitList(opp.skills).map((s) => <Chip key={s}>{s}</Chip>)}</div>
            </>
          )}
        </Card>
        <Card>
          <h2 className="text-lg font-semibold">About {opp.company.name}</h2>
          <p className="mt-3 whitespace-pre-line text-sm text-muted">{opp.company.description || "No description added."}</p>
          {opp.company.location && <p className="mt-3 flex items-center gap-1 text-sm"><MapPin className="h-4 w-4 text-muted" />{opp.company.location}</p>}
          {opp.company.website && (
            <a href={opp.company.website} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-campus-600 hover:underline">
              Website <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </Card>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={`Apply to ${opp.company.name}`}>
        <p className="mb-4 text-sm text-muted">
          Your profile (roll number, branch, CGPA, skills{profile.data?.has_resume ? " and resume" : ""}) is shared with the recruiter.
        </p>
        {profile.data && !profile.data.has_resume && (
          <p className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
            You have not uploaded a resume. <Link to="/student/profile" className="font-semibold underline">Add one</Link> before applying to improve your chances.
          </p>
        )}
        <Field label="Cover note (optional)" htmlFor="note" hint="Why are you a good fit? Maximum 2000 characters.">
          <Textarea id="note" maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          <Button loading={apply.isPending} onClick={() => apply.mutate()}>Submit application</Button>
        </div>
      </Modal>
    </>
  );
}
