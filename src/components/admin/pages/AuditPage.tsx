import { useState, useEffect } from "react";
import { History } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import PageShell, { Card, TableWrapper, Th, Td, SearchInput } from "../shared/PageShell";
import { SkeletonTable } from "../shared/Skeleton";
import EmptyState from "../shared/EmptyState";

interface AuditLog { id: string; adminEmail: string; action: string; details: string; createdAt: string; }

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(500);
      setLogs((data ?? []).map(a => ({
        id: a.id, adminEmail: a.admin_email ?? "", action: a.action ?? "",
        details: a.details ?? "", createdAt: a.created_at,
      })));
      setLoading(false);
    })();
  }, []);

  const filtered = logs.filter(l => {
    const q = search.toLowerCase();
    return !q || l.action.toLowerCase().includes(q) || l.adminEmail.toLowerCase().includes(q) || l.details.toLowerCase().includes(q);
  });

  return (
    <PageShell title="Audit Log" subtitle={`${logs.length} recent records`}>
      <Card>
        <div className="flex gap-3 p-4 border-b border-stone-800">
          <SearchInput value={search} onChange={setSearch} placeholder="Action, admin, details…" />
        </div>
        <TableWrapper>
          <thead><tr><Th>Time</Th><Th>Admin</Th><Th>Action</Th><Th>Details</Th></tr></thead>
          {loading ? <SkeletonTable cols={4} /> : (
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={4}><EmptyState icon={History} title="No audit records" /></td></tr>
              ) : filtered.map(l => (
                <tr key={l.id} className="border-b border-stone-800/50 hover:bg-stone-800/20">
                  <Td><span className="text-stone-500 text-[10px] font-mono whitespace-nowrap">{new Date(l.createdAt).toLocaleString()}</span></Td>
                  <Td><span className="text-stone-300 text-xs">{l.adminEmail?.split("@")[0] ?? "—"}</span></Td>
                  <Td><span className="text-white text-xs font-medium">{l.action}</span></Td>
                  <Td><span className="text-stone-500 text-[11px] truncate block max-w-xs">{l.details}</span></Td>
                </tr>
              ))}
            </tbody>
          )}
        </TableWrapper>
        <div className="px-4 py-3 border-t border-stone-800 text-stone-500 text-xs">Showing {filtered.length} of {logs.length}</div>
      </Card>
    </PageShell>
  );
}
