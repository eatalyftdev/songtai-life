import { useState, useEffect } from "react";
import { CalendarCheck } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import PageShell, { Card, TableWrapper, Th, Td, Select, SearchInput } from "../shared/PageShell";
import SlideOver from "../shared/SlideOver";
import { SkeletonTable } from "../shared/Skeleton";
import EmptyState from "../shared/EmptyState";
import StatusBadge from "../shared/StatusBadge";

interface Appointment {
  id: string; name: string; email: string; phone: string;
  typeName: string; preferredDate: string; preferredTime: string;
  message: string; status: string; createdAt: string;
}

const STATUSES = ["requested","confirmed","completed","cancelled"];

export default function AppointmentsPage() {
  const [apts, setApts] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<Appointment | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("appointments")
      .select("*, appointment_types(name_en)")
      .order("created_at", { ascending: false });
    setApts((data ?? []).map(a => ({
      id: a.id, name: a.name ?? "", email: a.email ?? "", phone: a.phone ?? "",
      typeName: (a.appointment_types as any)?.name_en ?? "—",
      preferredDate: a.preferred_date ?? "", preferredTime: a.preferred_time ?? "",
      message: a.message ?? "", status: a.status ?? "requested", createdAt: a.created_at,
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = apts.filter(a => {
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    const q = search.toLowerCase();
    return !q || a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q);
  });

  const handleStatus = async (id: string, status: string) => {
    await supabase.from("appointments").update({ status }).eq("id", id);
    await supabase.from("audit_logs").insert({ action: "Appointment Status Updated", details: `${id} → ${status}` });
    setApts(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : null);
  };

  const pendingCount = apts.filter(a => a.status === "requested").length;

  return (
    <PageShell title="Appointments" subtitle={`${pendingCount} pending · ${apts.length} total`}>
      <Card>
        <div className="flex flex-wrap gap-3 p-4 border-b border-stone-800">
          <SearchInput value={search} onChange={setSearch} placeholder="Name, email…" />
          <Select value={statusFilter} onChange={setStatusFilter}>
            <option value="all">All</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
        <TableWrapper>
          <thead><tr><Th>Requester</Th><Th>Type</Th><Th>Date</Th><Th>Time</Th><Th>Status</Th><Th>Received</Th></tr></thead>
          {loading ? <SkeletonTable cols={6} /> : (
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6}><EmptyState icon={CalendarCheck} title="No appointments" /></td></tr>
              ) : filtered.map(a => (
                <tr key={a.id} onClick={() => setSelected(a)}
                  className={`border-b border-stone-800/50 hover:bg-stone-800/20 cursor-pointer transition-colors ${a.status === "requested" ? "bg-amber-950/5" : ""}`}>
                  <Td>
                    <div>
                      <p className="text-white text-xs font-medium">{a.name}</p>
                      <p className="text-stone-500 text-[10px]">{a.email}</p>
                    </div>
                  </Td>
                  <Td><span className="text-stone-400 text-[11px]">{a.typeName}</span></Td>
                  <Td><span className="text-stone-300 text-[11px] font-mono">{a.preferredDate}</span></Td>
                  <Td><span className="text-stone-300 text-[11px] font-mono">{a.preferredTime}</span></Td>
                  <Td><StatusBadge status={a.status} /></Td>
                  <Td><span className="text-stone-500 text-[10px]">{new Date(a.createdAt).toLocaleDateString()}</span></Td>
                </tr>
              ))}
            </tbody>
          )}
        </TableWrapper>
      </Card>

      <SlideOver open={!!selected} onClose={() => setSelected(null)} title={selected?.name ?? ""} subtitle={selected?.email}>
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Type", value: selected.typeName },
                { label: "Status", value: <StatusBadge status={selected.status} /> },
                { label: "Date", value: <span className="font-mono">{selected.preferredDate}</span> },
                { label: "Time", value: <span className="font-mono">{selected.preferredTime}</span> },
                { label: "Phone", value: selected.phone || "—" },
              ].map(row => (
                <div key={row.label} className="bg-stone-800/40 rounded-xl p-3">
                  <p className="text-stone-500 text-[10px] uppercase font-semibold mb-1">{row.label}</p>
                  <div className="text-xs text-stone-300">{row.value}</div>
                </div>
              ))}
            </div>
            {selected.message && (
              <div className="bg-stone-800/40 rounded-xl p-4">
                <p className="text-stone-500 text-[10px] uppercase font-semibold mb-2">Message</p>
                <p className="text-stone-200 text-xs leading-relaxed">{selected.message}</p>
              </div>
            )}
            <div>
              <p className="text-stone-400 text-xs font-semibold mb-2">Update Status</p>
              <div className="grid grid-cols-2 gap-2">
                {STATUSES.map(s => (
                  <button key={s} onClick={() => handleStatus(selected.id, s)}
                    className={`py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${selected.status === s ? "bg-[#0A7D32] text-white" : "bg-stone-800 text-stone-400 hover:text-white hover:bg-stone-700"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </SlideOver>
    </PageShell>
  );
}
