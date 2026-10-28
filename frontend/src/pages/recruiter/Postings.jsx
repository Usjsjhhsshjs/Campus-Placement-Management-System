import { useState } from "react";
import { Link } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Briefcase, Pencil, PlusCircle, Trash2, Users } from "lucide-react";
import { api, errorMessage } from "../../api/client";
import { TYPE_LABEL, fmtDate } from "../../api/format";
import { Button, Chip, ConfirmDialog, EmptyState, ErrorState, Input, PageHeader, Pagination, Select, Spinner, useToast } from "../../components/ui";
import { useDebounced } from "../../hooks/useDebounced";

export default function Postings() {
  const qc = useQueryClient();
  const toast = useToast();
  const [state, setState] = useState("all");
  const [type, setType] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState(null);
  const dq = useDebounced(q);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["my-postings", state, type, dq, page],
    placeholderData: keepPreviousData,
    queryFn: async () => (await api.get("/recruiter/opportunities", { params: { state, type: type || undefined, q: dq || undefined, page, page_size: 8 } })).data,
  });

  const refresh = () => ["my-postings", "recruiter-stats", "applicant-postings"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const toggle = useMutation({
    mutationFn: ({ id, status }) => api.post(`/opportunities/${id}/status`, { status }),
    onSuccess: (_, v) => { toast.success(v.status === "closed" ? "Posting closed." : "Posting reopened."); refresh(); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (id) => api.delete(`/opportunities/${id}`),
    onSuccess: () => { toast.success("Posting deleted."); setToDelete(null); refresh(); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <>
      <PageHeader title="Job postings" subtitle="Everything you have published, active and closed."
        action={<Link to="/recruiter/postings/new" className="inline-flex items-center gap-2 rounded-md bg-campus-500 px-4 py-2 text-sm font-semibold text-white hover:bg-campus-600"><PlusCircle className="h-4 w-4" /> New posting</Link>} />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Input aria-label="Search postings" placeholder="Search title, location or skill" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <Select aria-label="State" value={state} onChange={(e) => { setState(e.target.value); setPage(1); }}>
          <option value="all">Active and closed</option><option value="active">Active only</option><option value="closed">Closed / expired only</option>
        </Select>
        <Select aria-label="Type" value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
          <option value="">Jobs and internships</option><option value="job">Jobs</option><option value="internship">Internships</option>
        </Select>
      </div>

      {isLoading ? <Spinner /> : isError ? <ErrorState message={errorMessage(error)} onRetry={refetch} /> : data.items.length === 0 ? (
        <EmptyState icon={Briefcase} title="No postings found" action={<Link to="/recruiter/postings/new" className="text-sm font-semibold text-campus-600 hover:underline">Create your first posting</Link>}>
          Publish a job or internship and eligible students will see it right away.
        </EmptyState>
      ) : (
        <>
          <ul className="space-y-4">
            {data.items.map((o) => (
              <li key={o.id} className="rounded-lg border border-line bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold">{o.title}</h2>
                      <Chip>{TYPE_LABEL[o.type]}</Chip>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${o.is_open ? "bg-emerald-50 text-moss" : "bg-slate-100 text-slate-600"}`}>
                        {o.is_open ? "Active" : o.status === "closed" ? "Closed" : "Expired"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted">{[o.location, o.compensation, `Deadline ${fmtDate(o.deadline)}`].filter(Boolean).join(" · ")}</p>
                  </div>
                  <Link to={`/recruiter/applicants?opportunity=${o.id}`} className="flex items-center gap-2 rounded-md bg-campus-50 px-3 py-1.5 text-sm font-semibold text-campus-700 hover:bg-campus-100">
                    <Users className="h-4 w-4" /> {o.applications_count} applicant{o.applications_count === 1 ? "" : "s"}
                  </Link>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link to={`/recruiter/postings/${o.id}/edit`} className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-sm font-semibold hover:bg-paper"><Pencil className="h-4 w-4" /> Edit</Link>
                  {o.status === "active" ? (
                    <Button variant="secondary" loading={toggle.isPending && toggle.variables?.id === o.id} onClick={() => toggle.mutate({ id: o.id, status: "closed" })}>Close</Button>
                  ) : (
                    <Button variant="secondary" loading={toggle.isPending && toggle.variables?.id === o.id} onClick={() => toggle.mutate({ id: o.id, status: "active" })}>Reopen</Button>
                  )}
                  <Button variant="ghost" className="!text-brick hover:!bg-red-50" onClick={() => setToDelete(o)}><Trash2 className="h-4 w-4" /> Delete</Button>
                </div>
              </li>
            ))}
          </ul>
          <Pagination page={data.page} pageSize={data.page_size} total={data.total} onChange={setPage} />
        </>
      )}

      <ConfirmDialog open={Boolean(toDelete)} title="Delete this posting?" confirmLabel="Delete" loading={remove.isPending}
        message={toDelete ? `“${toDelete.title}” will disappear for students. Applications already received are kept on record.` : ""}
        onCancel={() => setToDelete(null)} onConfirm={() => remove.mutate(toDelete.id)} />
    </>
  );
}
