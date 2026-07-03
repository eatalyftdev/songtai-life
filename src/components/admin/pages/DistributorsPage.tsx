import React from "react";
import { useState, useEffect } from "react";
import { Users, Copy, Check, GitBranch } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import PageShell, { Card, TableWrapper, Th, Td, Btn, SearchInput, Select } from "../shared/PageShell";
import SlideOver from "../shared/SlideOver";
import { SkeletonTable } from "../shared/Skeleton";
import EmptyState from "../shared/EmptyState";
import StatusBadge from "../shared/StatusBadge";

interface Distributor {
  id: string; email: string; phone: string; distributorCode: string;
  rank: string; kycStatus: string; sponsorId: string | null;
  joinedAt: string; pv: number;
}

const KYC_STATUSES = ["none","pending","verified","rejected"];
const RANKS = ["bronze","silver","gold","platinum","diamond"];

export default function DistributorsPage() {
  const [dists, setDists] = useState<Distributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [kycFilter, setKycFilter] = useState("all");
  const [rankFilter, setRankFilter] = useState("all");
  const [selected, setSelected] = useState<Distributor | null>(null);
  const [copied, setCopied] = useState("");
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideForm, setOverrideForm] = useState({ distId: "", sponsorCode: "", placementCode: "" });
  const [overrideSaving, setOverrideSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [distRes, profRes] = await Promise.all([
      supabase.from("distributors").select("*").order("joined_at", { ascending: false }),
      supabase.from("profiles").select("id, email, phone"),
    ]);
    const profMap: Record<string, any> = {};
    (profRes.data ?? []).forEach(p => { profMap[p.id] = p; });
    setDists((distRes.data ?? []).map(d => ({
      id: d.id, email: profMap[d.id]?.email ?? "—", phone: profMap[d.id]?.phone ?? "—",
      distributorCode: d.distributor_code ?? "—", rank: d.rank ?? "bronze",
      kycStatus: d.kyc_status ?? "none", sponsorId: d.sponsor_id ?? null,
      joinedAt: d.joined_at, pv: d.pv ?? 0,
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = dists.filter(d => {
    if (kycFilter !== "all" && d.kycStatus !== kycFilter) return false;
    if (rankFilter !== "all" && d.rank !== rankFilter) return false;
    const q = search.toLowerCase();
    return !q || d.email.toLowerCase().includes(q) || d.distributorCode.toLowerCase().includes(q) || (d.sponsorId ?? "").toLowerCase().includes(q);
  });

  const handleKyc = async (id: string, status: "verified" | "rejected") => {
    await supabase.from("distributors").update({ kyc_status: status }).eq("id", id);
    await supabase.from("audit_logs").insert({ action: "KYC Updated", details: `${id} → ${status}` });
    setDists(prev => prev.map(d => d.id === id ? { ...d, kycStatus: status } : d));
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, kycStatus: status } : null);
  };

  const handleGenealogyOverride = async (e: React.FormEvent) => {
    e.preventDefault(); setOverrideSaving(true);
    const { data: allDists } = await supabase.from("distributors").select("id, distributor_code");
    const target = (allDists ?? []).find(d => d.distributor_code === overrideForm.distId || d.id === overrideForm.distId);
    if (!target) { alert("Distributor not found."); setOverrideSaving(false); return; }
    await supabase.from("distributors").update({ sponsor_id: overrideForm.sponsorCode, placement_id: overrideForm.placementCode || overrideForm.sponsorCode }).eq("id", target.id);
    await supabase.from("audit_logs").insert({ action: "Genealogy Override", details: `${overrideForm.distId} → sponsor:${overrideForm.sponsorCode}` });
    setOverrideSaving(false); setOverrideOpen(false); load();
  };

  const copy = (text: string) => { navigator.clipboard.writeText(text); setCopied(text); setTimeout(() => setCopied(""), 2000); };
  const relTime = (iso: string) => { const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000); return d === 0 ? "Today" : `${d}d ago`; };

  return (
    <PageShell
      title="Distributors & KYC"
      subtitle={`${dists.length} distributors · ${dists.filter(d => d.kycStatus === "pending").length} pending KYC`}
      actions={<Btn variant="secondary" onClick={() => setOverrideOpen(true)}><GitBranch className="w-3.5 h-3.5" /> Genealogy Override</Btn>}
    >
      <Card>
        <div className="flex flex-wrap gap-3 p-4 border-b border-stone-800">
          <SearchInput value={search} onChange={setSearch} placeholder="Email, code, sponsor…" />
          <Select value={kycFilter} onChange={setKycFilter}>
            <option value="all">All KYC</option>
            {KYC_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Select value={rankFilter} onChange={setRankFilter}>
            <option value="all">All Ranks</option>
            {RANKS.map(r => <option key={r} value={r}>{r}</option>)}
          </Select>
        </div>

        <TableWrapper>
          <thead>
            <tr>
              <Th>Distributor</Th>
              <Th>Code</Th>
              <Th>Sponsor</Th>
              <Th>Rank</Th>
              <Th>KYC</Th>
              <Th>PV</Th>
              <Th>Joined</Th>
            </tr>
          </thead>
          {loading ? <SkeletonTable cols={7} /> : (
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7}><EmptyState icon={Users} title="No distributors found" /></td></tr>
              ) : filtered.map(d => (
                <tr key={d.id} onClick={() => setSelected(d)} className="border-b border-stone-800/50 hover:bg-stone-800/20 cursor-pointer transition-colors">
                  <Td>
                    <div>
                      <p className="text-white font-medium text-xs">{d.email}</p>
                      <p className="text-stone-500 text-[10px]">{d.phone}</p>
                    </div>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#C9A227] font-mono text-[11px]">{d.distributorCode}</span>
                      <button onClick={e => { e.stopPropagation(); copy(d.distributorCode); }} className="text-stone-500 hover:text-white cursor-pointer">
                        {copied === d.distributorCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </Td>
                  <Td><span className="text-stone-400 text-[10px] font-mono">{d.sponsorId ?? "—"}</span></Td>
                  <Td><StatusBadge status={d.rank} /></Td>
                  <Td><StatusBadge status={d.kycStatus} /></Td>
                  <Td><span className="text-[#C9A227] font-mono text-[11px]">{d.pv} PV</span></Td>
                  <Td><span className="text-stone-500">{relTime(d.joinedAt)}</span></Td>
                </tr>
              ))}
            </tbody>
          )}
        </TableWrapper>
        <div className="px-4 py-3 border-t border-stone-800 text-stone-500 text-xs">
          Showing {filtered.length} of {dists.length} distributors
        </div>
      </Card>

      {/* Detail slide-over */}
      <SlideOver open={!!selected} onClose={() => setSelected(null)} title="Distributor Profile">
        {selected && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Email", value: selected.email },
                { label: "Phone", value: selected.phone },
                { label: "Code", value: <span className="text-[#C9A227] font-mono">{selected.distributorCode}</span> },
                { label: "Sponsor", value: <span className="font-mono text-[10px]">{selected.sponsorId ?? "Root"}</span> },
                { label: "Rank", value: <StatusBadge status={selected.rank} /> },
                { label: "KYC", value: <StatusBadge status={selected.kycStatus} /> },
                { label: "PV Points", value: <span className="text-[#C9A227] font-mono font-bold">{selected.pv}</span> },
                { label: "Joined", value: new Date(selected.joinedAt).toLocaleDateString() },
              ].map(row => (
                <div key={row.label} className="bg-stone-800/40 rounded-xl p-3">
                  <p className="text-stone-500 text-[10px] uppercase font-semibold mb-1">{row.label}</p>
                  <div className="text-xs text-stone-300">{row.value}</div>
                </div>
              ))}
            </div>

            {selected.kycStatus === "pending" && (
              <div className="border border-amber-900/50 bg-amber-950/20 rounded-xl p-4 space-y-3">
                <p className="text-amber-300 text-xs font-semibold">KYC Review Required</p>
                <p className="text-stone-400 text-xs">Review submitted documents and approve or reject this distributor's KYC application.</p>
                <div className="flex gap-2">
                  <Btn variant="primary" onClick={() => handleKyc(selected.id, "verified")} className="flex-1">✓ Approve</Btn>
                  <Btn variant="danger" onClick={() => handleKyc(selected.id, "rejected")} className="flex-1">✗ Reject</Btn>
                </div>
              </div>
            )}
          </div>
        )}
      </SlideOver>

      {/* Genealogy override */}
      <SlideOver open={overrideOpen} onClose={() => setOverrideOpen(false)} title="Genealogy Override" subtitle="Manually rewire a distributor's sponsor">
        <form onSubmit={handleGenealogyOverride} className="space-y-4">
          <div>
            <label className="text-stone-400 text-xs block mb-1.5">Distributor Code or ID *</label>
            <input value={overrideForm.distId} onChange={e => setOverrideForm(p => ({ ...p, distId: e.target.value }))} required
              className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32]" />
          </div>
          <div>
            <label className="text-stone-400 text-xs block mb-1.5">New Sponsor Code *</label>
            <input value={overrideForm.sponsorCode} onChange={e => setOverrideForm(p => ({ ...p, sponsorCode: e.target.value }))} required
              placeholder="Use 'Root' for top-level"
              className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32]" />
          </div>
          <div>
            <label className="text-stone-400 text-xs block mb-1.5">New Placement Code (optional)</label>
            <input value={overrideForm.placementCode} onChange={e => setOverrideForm(p => ({ ...p, placementCode: e.target.value }))}
              placeholder="Defaults to sponsor"
              className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32]" />
          </div>
          <div className="bg-red-950/20 border border-red-900/40 rounded-xl p-3 text-xs text-red-300">
            ⚠ This action is irreversible and will be logged in the audit trail.
          </div>
          <div className="flex gap-3">
            <Btn variant="secondary" onClick={() => setOverrideOpen(false)} className="flex-1">Cancel</Btn>
            <Btn variant="danger" loading={overrideSaving} className="flex-1">Apply Override</Btn>
          </div>
        </form>
      </SlideOver>
    </PageShell>
  );
}
