import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { api, errorMessage } from "../../api/client";
import { fmtDateTime } from "../../api/format";
import { Button, EmptyState, ErrorState, PageHeader, Spinner } from "../../components/ui";

export default function Notifications() {
  const qc = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => (await api.get("/notifications")).data,
  });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["notifications"] }); qc.invalidateQueries({ queryKey: ["unread"] }); };
  const markOne = useMutation({ mutationFn: (id) => api.post(`/notifications/${id}/read`), onSuccess: refresh });
  const markAll = useMutation({ mutationFn: () => api.post("/notifications/read-all"), onSuccess: refresh });

  if (isLoading) return <Spinner />;
  if (isError) return <ErrorState message={errorMessage(error)} onRetry={refetch} />;
  const unread = data.filter((n) => !n.is_read).length;

  return (
    <>
      <PageHeader title="Notifications" subtitle={unread ? `${unread} unread` : "You are all caught up."}
        action={unread > 0 && <Button variant="secondary" loading={markAll.isPending} onClick={() => markAll.mutate()}><CheckCheck className="h-4 w-4" /> Mark all as read</Button>} />
      {data.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications yet">Updates about applications and interviews will appear here.</EmptyState>
      ) : (
        <ul className="space-y-2">
          {data.map((n) => (
            <li key={n.id}>
              <button onClick={() => !n.is_read && markOne.mutate(n.id)}
                className={`flex w-full items-start gap-3 rounded-lg border p-4 text-left ${n.is_read ? "border-line bg-white" : "border-campus-100 bg-campus-50"}`}>
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.is_read ? "bg-transparent" : "bg-campus-500"}`} aria-label={n.is_read ? "" : "Unread"} />
                <span className="flex-1"><span className="block text-sm">{n.message}</span><span className="mt-1 block text-xs text-muted">{fmtDateTime(n.created_at)}</span></span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
