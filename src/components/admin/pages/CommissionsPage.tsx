import { useState, useEffect } from "react";
import { Award } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import PageShell, { Card, TableWrapper, Th, Td, SearchInput, Select } from "../shared/PageShell";
import { SkeletonTable } from "../shared/Skeleton";
import EmptyState from "../shared/EmptyState";
import StatusBadge from "../shared/StatusBadge";

interface Commission {
  id: string; distributorId: string; email: string; orderId: string;
  type: string; level: number; amountXaf: number; status: string; createdAt: string;
}

export default function CommissionsPage() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [comRes, profRes] = await Promise.all([
        supabase.from("commissions").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("id, email"),
      ]);
      const emailMap: Record<string, string> = {};
      (profRes.data ?? []).forEach(p => { emailMap[p.id] = p.email; });
      setCommissions((comRes.data ?? []).map(c => ({
        id: c.id, distributorId: c.distributor_id, email: emailMap[c.distributor_id] ?? "—",
        orderId: c.order_id ?? "—", type: c.type ?? "direct", level: c.level ?? 0,
        amountXaf: c.amount_xaf ?? 0, status: c.status ?? "completed", createdAt: c.created_at,
      })));
      setLoading(false);
    })();
  }, []);

  const filtered = commissions.filter(c => {
    if (typeFilter !== "all" && c.type !== typeFilter) return false;
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    const q = search.toLowerCase();
    return !q || c.email.toLowerCase().includes(q) || c.orderId.toLowerCase().includes(q);
  });

  const totalXaf = filtered.reduce((s, c) => s + c.amountXaf, 0);

  return (
    <PageShell title="Commissions" subtitle={`${filtered.length} records · ${totalXaf.toLocaleString()} XAF total`}>
      <Card>
        <div className="flex flex-wrap gap-3 p-4 border-b border-stone-800">
          <SearchInput value={search} onChange={setSearch} placeholder="Email, order ID…" />
          <Select value={typeFilter} onChange={setTypeFilter}>
            <option value="all">All types</option>
            {["direct","level","rank_bonus","leadership"].map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
          <Select value={statusFilter} onChange={setStatusFilter}>
            <option value="all">All statuses</option>
            {["pending","approved","paid","completed"].map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
        <TableWrapper>
          <thead><tr>
            <Th>Distributor</Th><Th>Order Ref</Th><Th>Type</Th><Th>Level</Th><Th>Amount</Th><Th>Status</Th><Th>Date</Th>
          </tr></thead>
          {loading ? <SkeletonTable cols={7} /> : (
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7}><EmptyState icon={Award} title="No commissions found" description="Commission records appear here after orders are paid." /></td></tr>
              ) : filtered.map(c => (
                <tr key={c.id} className="border-b border-stone-800/50 hover:bg-stone-800/20">
                  <Td><span className="text-white text-xs">{c.email}</span></Td>
                  <Td><span className="font-mono text-[#C9A227] text-[11px]">{c.orderId.slice(0,14)}</span></Td>
                  <Td><StatusBadge status={c.type} /></Td>
                  <Td><span className="text-stone-400 font-mono text-xs">{c.level > 0 ? `L${c.level}` : "—"}</span></Td>
                  <Td><span className="font-mono font-bold text-emerald-400 text-xs">+{c.amountXaf.toLocaleString()} XAF</span></Td>
                  <Td><StatusBadge status={c.status} /></Td>
                  <Td><span className="text-stone-500 text-[10px]">{new Date(c.createdAt).toLocaleDateString()}</span></Td>
                </tr>
              ))}
            </tbody>
          )}
        </TableWrapper>
        <div className="px-4 py-3 border-t border-stone-800 text-stone-500 text-xs">
          {filtered.length} records · {totalXaf.toLocaleString()} XAF
        </div>
      </Card>
    </PageShell>
  );
}
