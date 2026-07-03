import { useState, useEffect } from "react";
import { Mail } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import PageShell, { Card, TableWrapper, Th, Td, Select, SearchInput } from "../shared/PageShell";
import SlideOver from "../shared/SlideOver";
import { SkeletonTable } from "../shared/Skeleton";
import EmptyState from "../shared/EmptyState";
import StatusBadge from "../shared/StatusBadge";

interface Message { id: string; name: string; email: string; phone: string; message: string; status: string; createdAt: string; }

export default function ContactsPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<Message | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("contact_messages").select("*").order("created_at", { ascending: false });
    setMessages((data ?? []).map(m => ({
      id: m.id, name: m.name ?? "", email: m.email ?? "", phone: m.phone ?? "",
      message: m.message ?? "", status: m.status ?? "unread", createdAt: m.created_at,
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = messages.filter(m => {
    if (statusFilter !== "all" && m.status !== statusFilter) return false;
    const q = search.toLowerCase();
    return !q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || m.message.toLowerCase().includes(q);
  });

  const markStatus = async (id: string, status: string) => {
    await supabase.from("contact_messages").update({ status }).eq("id", id);
    setMessages(prev => prev.map(m => m.id === id ? { ...m, status } : m));
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : null);
  };

  const openMessage = async (m: Message) => {
    setSelected(m);
    if (m.status === "unread") markStatus(m.id, "read");
  };

  const unreadCount = messages.filter(m => m.status === "unread").length;

  return (
    <PageShell title="Contact Messages" subtitle={`${unreadCount} unread · ${messages.length} total`}>
      <Card>
        <div className="flex flex-wrap gap-3 p-4 border-b border-stone-800">
          <SearchInput value={search} onChange={setSearch} placeholder="Name, email, message…" />
          <Select value={statusFilter} onChange={setStatusFilter}>
            <option value="all">All</option>
            {["unread","read","responded"].map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
        <TableWrapper>
          <thead><tr><Th>Sender</Th><Th>Email</Th><Th>Preview</Th><Th>Status</Th><Th>When</Th></tr></thead>
          {loading ? <SkeletonTable cols={5} /> : (
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5}><EmptyState icon={Mail} title="No messages" /></td></tr>
              ) : filtered.map(m => (
                <tr key={m.id} onClick={() => openMessage(m)}
                  className={`border-b border-stone-800/50 hover:bg-stone-800/20 cursor-pointer transition-colors ${m.status === "unread" ? "bg-stone-800/10" : ""}`}>
                  <Td><span className={`text-xs ${m.status === "unread" ? "text-white font-semibold" : "text-stone-300"}`}>{m.name}</span></Td>
                  <Td><span className="text-stone-400 text-[11px]">{m.email}</span></Td>
                  <Td><span className="text-stone-500 text-[11px] truncate block max-w-xs">{m.message.slice(0, 60)}…</span></Td>
                  <Td><StatusBadge status={m.status} /></Td>
                  <Td><span className="text-stone-500 text-[10px]">{new Date(m.createdAt).toLocaleDateString()}</span></Td>
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
              <div className="bg-stone-800/40 rounded-xl p-3">
                <p className="text-stone-500 text-[10px] uppercase font-semibold mb-1">Status</p>
                <StatusBadge status={selected.status} />
              </div>
              <div className="bg-stone-800/40 rounded-xl p-3">
                <p className="text-stone-500 text-[10px] uppercase font-semibold mb-1">Phone</p>
                <p className="text-stone-300 text-xs">{selected.phone || "—"}</p>
              </div>
            </div>
            <div className="bg-stone-800/40 rounded-xl p-4">
              <p className="text-stone-500 text-[10px] uppercase font-semibold mb-2">Message</p>
              <p className="text-stone-200 text-xs leading-relaxed whitespace-pre-wrap">{selected.message}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => markStatus(selected.id, "read")}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${selected.status === "read" ? "bg-[#0A7D32] text-white" : "bg-stone-800 text-stone-400 hover:text-white"}`}>
                Mark Read
              </button>
              <button onClick={() => markStatus(selected.id, "responded")}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${selected.status === "responded" ? "bg-[#0A7D32] text-white" : "bg-stone-800 text-stone-400 hover:text-white"}`}>
                Mark Responded
              </button>
            </div>
            <a href={`mailto:${selected.email}?subject=Re: Your Songtai Life inquiry`}
              className="block w-full text-center py-2.5 bg-[#C9A227] hover:bg-[#b08f20] text-stone-950 rounded-xl text-xs font-bold transition-all">
              Reply via Email ↗
            </a>
          </div>
        )}
      </SlideOver>
    </PageShell>
  );
}
