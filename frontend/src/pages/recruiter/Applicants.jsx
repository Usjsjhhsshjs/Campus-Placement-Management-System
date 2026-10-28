import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { api, errorMessage } from "../../api/client";
import { STATUS, fmtDate } from "../../api/format";
import { EmptyState, ErrorState, Input, PageHeader, Pagination, Select, Spinner, StatusBadge } from "../../components/ui";
import { useDebounced } from "../../hooks/useDebounced";

export default function Applicants() {
  const [params] = useSearchParams();
  const [f, setF] = useState({ opportunity_id: params.get("opportunity") || "", status: "", q: "", min_cgpa: "" });
  const [page, setPage] = useState(1);
  const df = useDebounced(f);
  const set = (k, v) => { setF((x) => ({ ...x, [k]: v })); setPage(1); };

  const postings = useQuery({
    queryKey: ["applicant-postings"],
    queryFn: async () => (await api.get("/recruiter/opportunities", { params: { page_size: 50 } })).data.items,
  });
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["applicants", df, page], placeholderData: keepPreviousData,
    queryFn: async () => {
      const p = { page, page_size: 10 };
      Object.entries(df).forEach(([k, v]) => v && (p[k] = v));
      return (await api.get("/recruiter/applications", { params: p })).data;
    },
  });

  return (
    <>
      <PageHeader title="Applicants" subtitle="Students who applied to your postings." />
      <div className="mb-6 grid gap-3 rounded-lg border border-line bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Input aria-label="Search applicants" placeholder="Name, roll no., branch or skill" value={f.q} onChange={(e) => set("q", e.target.value)} />
        <Select aria-label="Posting" value={f.opportunity_id} onChange={(e) => set("opportunity_id", e.target.value)}>
          <option value="">All postings</option>
          {(postings.data || []).map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
        </Select>
        <Select aria-label="Status" value={f.status} onChange={(e) => set("status", e.target.value)}>
          <option value="">Any status</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </Select>
        <Input aria-label="Minimum CGPA" type="number" step="0.1" min="0" max="10" placeholder="Min. CGPA" value={f.min_cgpa} onChange={(e) => set("min_cgpa", e.target.value)} />
      </div>

      {isLoading ? <Spinner /> : isError ? <ErrorState message={errorMessage(error)} onRetry={refetch} /> : data.items.length === 0 ? (
        <EmptyState icon={Users} title="No applicants found">Try clearing the filters. New applications appear here as soon as students apply.</EmptyState>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-line bg-white">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-line bg-paper text-muted">
                <tr>{["Student", "Roll no.", "Branch", "CGPA", "Applied for", "Applied on", "Status", ""].map((h) => <th key={h} scope="col" className="px-4 py-3 font-medium">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.items.map((a) => (
                  <tr key={a.id} className="hover:bg-paper/60">
                    <td className="px-4 py-3 font-medium">{a.student.full_name}</td>
                    <td className="px-4 py-3">{a.student.roll_number}</td>
                    <td className="px-4 py-3">{a.student.branch}</td>
                    <td className="px-4 py-3">{a.student.cgpa ?? "—"}</td>
                    <td className="px-4 py-3">{a.opportunity.title}</td>
                    <td className="whitespace-nowrap px-4 py-3">{fmtDate(a.created_at)}</td>
                    <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                    <td className="px-4 py-3"><Link to={`/recruiter/applicants/${a.id}`} className="font-semibold text-campus-600 hover:underline">Review</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} pageSize={data.page_size} total={data.total} onChange={setPage} />
        </>
      )}
    </>
  );
}
