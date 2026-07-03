import { useState, useEffect } from "react";
import { Wallet, ArrowDownLeft } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import PageShell, { Card, TableWrapper, Th, Td, Select } from "../shared/PageShell";
import { SkeletonTable } from "../shared/Skeleton";
import EmptyState from "../shared/EmptyState";
import StatusBadge from "../shared/StatusBadge";

interface Withdrawal {
  id: string; distributorId: string; email: string; code: string;
  amountXaf: number; method: string; status: string; createdAt: string;
}
interface WalletTx {
  id: string; walletId: string; email: string; type: string;
  amountXaf: number; description: string; status: string; createdAt: string;
}

export default function WalletsPage() {
  const [tab, setTab] = useState<"withdrawals"|"ledger">("withdrawals");
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [txs, setTxs] = useState<WalletTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [txFilter, setTxFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    const [wdRes, txRes, distRes, profRes] = await Promise.all([
      supabase.from("withdrawals").select("*").order("created_at", { ascending: false }),
      supabase.from("wallet_transactions").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("distributors").select("id, distributor_code"),
      supabase.from("profiles").select("id, email"),
    ]);
    const codeMap: Record<string, string> = {};
    (distRes.data ?? []).forEach(d => { codeMap[d.id] = d.distributor_code; });
    const emailMap: Record<string, string> = {};
    (profRes.data ?? []).forEach(p => { emailMap[p.id] = p.email; });

    setWithdrawals((wdRes.data ?? []).map(w => ({
      id: w.id, distributorId: w.distributor_id, email: emailMap[w.distributor_id] ?? "—",
      code: codeMap[w.distributor_id] ?? "—", amountXaf: w.amount_xaf ?? 0,
      method: w.method ?? "—", status: w.status ?? "requested", createdAt: w.created_at,
    })));
    setTxs((txRes.data ?? []).map(t => ({
      id: t.id, walletId: t.wallet_id, email: emailMap[t.wallet_id] ?? "—",
      type: t.type ?? "adjustment", amountXaf: t.amount_xaf ?? 0,
      description: t.description ?? "", status: t.status ?? "completed", createdAt: t.created_at,
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleStatusChange = async (id: string, status: string) => {
    await supabase.from("withdrawals").update({ status }).eq("id", id);
    await supabase.from("audit_logs").insert({ action: "Withdrawal Status Updated", details: `${id} → ${status}` });
    setWithdrawals(prev => prev.map(w => w.id === id ? { ...w, status } : w));
  };

  const filteredTxs = txFilter === "all" ? txs : txs.filter(t => t.type === txFilter);

  return (
    <PageShell title="Wallets & Withdrawals" subtitle="Process payouts and reconcile transactions">
      <div className="flex gap-2 mb-4">
        {(["withdrawals","ledger"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${tab === t ? "bg-[#0A7D32] text-white" : "bg-stone-800 text-stone-400 hover:text-white"}`}>
            {t === "withdrawals" ? "Withdrawals" : "Wallet Ledger"}
          </button>
        ))}
      </div>

      {tab === "withdrawals" && (
        <Card>
          <TableWrapper>
            <thead><tr>
              <Th>Distributor</Th><Th>Code</Th><Th>Amount</Th><Th>Method</Th><Th>Status</Th><Th>Requested</Th><Th>Action</Th>
            </tr></thead>
            {loading ? <SkeletonTable cols={7} /> : (
              <tbody>
                {withdrawals.length === 0 ? (
                  <tr><td colSpan={7}><EmptyState icon={Wallet} title="No withdrawal requests" /></td></tr>
                ) : withdrawals.map(w => (
                  <tr key={w.id} className="border-b border-stone-800/50 hover:bg-stone-800/20">
                    <Td><span className="text-white text-xs">{w.email}</span></Td>
                    <Td><span className="text-[#C9A227] font-mono text-[11px]">{w.code}</span></Td>
                    <Td><span className="font-mono font-bold text-white">{w.amountXaf.toLocaleString()} XAF</span></Td>
                    <Td><StatusBadge status={w.method} /></Td>
                    <Td><StatusBadge status={w.status} /></Td>
                    <Td><span className="text-stone-500 text-[10px]">{new Date(w.createdAt).toLocaleDateString()}</span></Td>
                    <Td>
                      <Select value={w.status} onChange={v => handleStatusChange(w.id, v)}>
                        {["requested","processing","completed","failed"].map(s => <option key={s} value={s}>{s}</option>)}
                      </Select>
                    </Td>
                  </tr>
                ))}
              </tbody>
            )}
          </TableWrapper>
          <div className="px-4 py-3 border-t border-stone-800 text-stone-500 text-xs">
            {withdrawals.filter(w => w.status === "requested").length} pending · Total requested: {withdrawals.filter(w => w.status === "requested").reduce((s, w) => s + w.amountXaf, 0).toLocaleString()} XAF
          </div>
        </Card>
      )}

      {tab === "ledger" && (
        <Card>
          <div className="flex gap-3 p-4 border-b border-stone-800">
            <Select value={txFilter} onChange={setTxFilter}>
              <option value="all">All types</option>
              {["commission","withdrawal","adjustment","refund"].map(t => <option key={t} value={t}>{t}</option>)}
            </Select>
          </div>
          <TableWrapper>
            <thead><tr>
              <Th>User</Th><Th>Type</Th><Th>Amount</Th><Th>Description</Th><Th>Status</Th><Th>Date</Th>
            </tr></thead>
            {loading ? <SkeletonTable cols={6} /> : (
              <tbody>
                {filteredTxs.length === 0 ? (
                  <tr><td colSpan={6}><EmptyState icon={ArrowDownLeft} title="No transactions" /></td></tr>
                ) : filteredTxs.map(t => (
                  <tr key={t.id} className="border-b border-stone-800/50 hover:bg-stone-800/20">
                    <Td><span className="text-white text-xs">{t.email}</span></Td>
                    <Td><StatusBadge status={t.type} /></Td>
                    <Td><span className={`font-mono font-bold text-xs ${t.amountXaf >= 0 ? "text-emerald-400" : "text-red-400"}`}>{t.amountXaf >= 0 ? "+" : ""}{t.amountXaf.toLocaleString()} XAF</span></Td>
                    <Td><span className="text-stone-400 text-[11px]">{t.description || "—"}</span></Td>
                    <Td><StatusBadge status={t.status} /></Td>
                    <Td><span className="text-stone-500 text-[10px]">{new Date(t.createdAt).toLocaleDateString()}</span></Td>
                  </tr>
                ))}
              </tbody>
            )}
          </TableWrapper>
          <div className="px-4 py-3 border-t border-stone-800 text-stone-500 text-xs">Showing {filteredTxs.length} transactions</div>
        </Card>
      )}
    </PageShell>
  );
}
