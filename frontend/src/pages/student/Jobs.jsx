import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Search, SearchX } from "lucide-react";
import { api, errorMessage } from "../../api/client";
import OpportunityCard from "../../components/OpportunityCard";
import { EmptyState, ErrorState, Input, PageHeader, Pagination, Select, Spinner } from "../../components/ui";
import { useDebounced } from "../../hooks/useDebounced";

export default function Jobs() {
  const [f, setF] = useState({ q: "", type: "", location: "", skill: "", eligible_only: false });
  const [page, setPage] = useState(1);
  const debounced = useDebounced(f);
  const set = (k, v) => { setF((x) => ({ ...x, [k]: v })); setPage(1); };

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["opportunities", debounced, page],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const params = { page, page_size: 8 };
      Object.entries(debounced).forEach(([k, v]) => v && (params[k] = v));
      return (await api.get("/opportunities", { params })).data;
    },
  });

  return (
    <>
      <PageHeader title="Browse openings" subtitle="Jobs and internships posted by recruiters. Closed and expired ones are hidden." />
      <div className="mb-6 grid gap-3 rounded-lg border border-line bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted" aria-hidden />
          <Input aria-label="Search by title, company, location or skill" placeholder="Search title, company, location or skill" className="pl-9" value={f.q} onChange={(e) => set("q", e.target.value)} />
        </div>
        <Select aria-label="Type" value={f.type} onChange={(e) => set("type", e.target.value)}>
          <option value="">Jobs and internships</option>
          <option value="job">Jobs only</option>
          <option value="internship">Internships only</option>
        </Select>
        <Input aria-label="Location" placeholder="Location" value={f.location} onChange={(e) => set("location", e.target.value)} />
        <Input aria-label="Skill" placeholder="Skill, e.g. Python" value={f.skill} onChange={(e) => set("skill", e.target.value)} />
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" checked={f.eligible_only} onChange={(e) => set("eligible_only", e.target.checked)} className="h-4 w-4 accent-campus-500" />
          Show only openings I am eligible for
        </label>
      </div>

      {isLoading ? <Spinner /> : isError ? <ErrorState message={errorMessage(error)} onRetry={refetch} /> : data.items.length === 0 ? (
        <EmptyState icon={SearchX} title="No openings match">Try removing a filter, or check back later as recruiters post new openings.</EmptyState>
      ) : (
        <div className={isFetching ? "opacity-70" : ""}>
          <div className="space-y-4">{data.items.map((o) => <OpportunityCard key={o.id} opp={o} />)}</div>
          <Pagination page={data.page} pageSize={data.page_size} total={data.total} onChange={setPage} />
        </div>
      )}
    </>
  );
}
