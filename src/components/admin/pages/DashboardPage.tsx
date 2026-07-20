import { useState, useEffect, useMemo } from "react";
import { DollarSign, Users, Clock, Wallet, BarChart3, ShoppingBag } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import KPICard from "../shared/KPICard";
import { SkeletonCard } from "../shared/Skeleton";
import PageShell, { Card } from "../shared/PageShell";
import StatusBadge from "../shared/StatusBadge";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend
} from "recharts";

const GREEN = "#0A7D32";
const GOLD  = "#C9A227";
const PIE_COLORS = ["#6b7280","#3b82f6","#f59e0b","#8b5cf6","#10b981","#ef4444"];

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[color:var(--color-surface)] border border-[color:var(--color-border)] rounded-xl px-3 py-2.5 text-xs shadow-xl">
      <p className="text-[color:var(--color-muted)] font-semibold mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-bold">
          {p.name}: {typeof p.value === "number" && p.name?.includes("XAF")
            ? p.value.toLocaleString() + " XAF" : p.value}
        </p>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<30|90>(30);
  const [stats, setStats] = useState({ revenue: 0, prevRevenue: 0, newDists: 0, prevDists: 0, pendingKyc: 0, pendingWithdrawals: 0, pendingWithdrawalsXaf: 0 });
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [orderStatusData, setOrderStatusData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [recentAudit, setRecentAudit] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const rangeStart = new Date(Date.now() - range * 86400000).toISOString();

      const [ordersRes, distsRes, kycRes, wdRes, auditRes] = await Promise.all([
        supabase.from("orders").select("amount_xaf, status, created_at"),
        supabase.from("distributors").select("joined_at"),
        supabase.from("distributors").select("id", { count: "exact", head: true }).eq("kyc_status", "pending"),
        supabase.from("withdrawals").select("amount_xaf").eq("status", "requested"),
        supabase.from("audit_logs").select("id, admin_email, action, details, created_at").order("created_at", { ascending: false }).limit(10),
      ]);

      const orders = ordersRes.data ?? [];
      const dists = distsRes.data ?? [];

      const paid = (o: any) => o.status === "paid" || o.status === "completed";
      const revenue = orders.filter(o => paid(o) && o.created_at >= thisMonthStart).reduce((s: number, o: any) => s + (o.amount_xaf || 0), 0);
      const prevRevenue = orders.filter(o => paid(o) && o.created_at >= lastMonthStart && o.created_at < thisMonthStart).reduce((s: number, o: any) => s + (o.amount_xaf || 0), 0);
      const newDists = dists.filter((d: any) => d.joined_at >= thisMonthStart).length;
      const prevDists = dists.filter((d: any) => d.joined_at >= lastMonthStart && d.joined_at < thisMonthStart).length;

      setStats({
        revenue, prevRevenue, newDists, prevDists,
        pendingKyc: kycRes.count ?? 0,
        pendingWithdrawals: (wdRes.data ?? []).length,
        pendingWithdrawalsXaf: (wdRes.data ?? []).reduce((s: number, w: any) => s + (w.amount_xaf || 0), 0),
      });

      // Daily revenue chart
      const dayMap: Record<string, number> = {};
      for (let i = range - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        const key = d.toLocaleDateString("en", { month: "short", day: "numeric" });
        dayMap[key] = 0;
      }
      orders.filter(o => paid(o) && o.created_at >= rangeStart).forEach((o: any) => {
        const key = new Date(o.created_at).toLocaleDateString("en", { month: "short", day: "numeric" });
        if (key in dayMap) dayMap[key] += o.amount_xaf || 0;
      });
      setRevenueData(Object.entries(dayMap).map(([date, revenue]) => ({ date, "Revenue XAF": revenue })));

      // Order status donut
      const statusCounts: Record<string, number> = {};
      orders.forEach((o: any) => { statusCounts[o.status] = (statusCounts[o.status] || 0) + 1; });
      setOrderStatusData(Object.entries(statusCounts).map(([name, value]) => ({ name, value })));

      setRecentAudit((auditRes.data ?? []).map((a: any) => ({
        id: a.id, adminEmail: a.admin_email, action: a.action, details: a.details, createdAt: a.created_at,
      })));
      setLoading(false);
    };
    load();
  }, [range]);

  const pct = (curr: number, prev: number) => prev > 0 ? ((curr - prev) / prev) * 100 : curr > 0 ? 100 : 0;
  const sparkRevenue = revenueData.slice(-14).map(d => d["Revenue XAF"]);

  return (
    <PageShell
      title="Dashboard"
      subtitle="Real-time overview of Songtai Life operations"
      actions={
        <div className="flex gap-2">
          {([30, 90] as const).map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${range === r ? "bg-[#0A7D32] text-white" : "bg-stone-800 text-stone-400 hover:text-white"}`}>
              {r}d
            </button>
          ))}
        </div>
      }
    >
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />) : (
          <>
            <KPICard icon={DollarSign} label="Revenue this month" value={`${stats.revenue.toLocaleString()} XAF`}
              change={pct(stats.revenue, stats.prevRevenue)} changeLabel="vs last month" sparkline={sparkRevenue} />
            <KPICard icon={Users} label="New Distributors" value={stats.newDists}
              change={pct(stats.newDists, stats.prevDists)} changeLabel="vs last month" />
            <KPICard icon={Clock} label="Pending KYC" value={stats.pendingKyc} highlight={stats.pendingKyc > 0}
              iconColor="text-amber-400"
              changeLabel={stats.pendingKyc > 0 ? "Needs review" : "All clear"} />
            <KPICard icon={Wallet} label="Pending Withdrawals" value={`${stats.pendingWithdrawalsXaf.toLocaleString()} XAF`}
              highlight={stats.pendingWithdrawals > 0} iconColor="text-[#C9A227]"
              changeLabel={`${stats.pendingWithdrawals} requests`} />
          </>
        )}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-stone-300 text-sm font-semibold">Revenue over time</p>
          </div>
          {loading ? <div className="h-48 bg-stone-800 rounded-xl animate-pulse" /> : revenueData.every(d => d["Revenue XAF"] === 0) ? (
            <div className="h-48 flex items-center justify-center text-stone-500 text-xs">No paid orders in this period</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={GREEN} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={GREEN} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fill: "var(--color-muted)", fontSize: 10 }} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: "var(--color-muted)", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="Revenue XAF" stroke={GREEN} fill="url(#revGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5">
          <p className="text-stone-300 text-sm font-semibold mb-4">Order status</p>
          {loading ? <div className="h-48 bg-stone-800 rounded-xl animate-pulse" /> : orderStatusData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-stone-500 text-xs">No orders yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={orderStatusData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                  {orderStatusData.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "10px", color: "var(--color-muted)" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Recent audit log */}
      <Card>
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800">
          <p className="text-stone-300 text-sm font-semibold">Recent Activity</p>
          <button onClick={() => navigate("/admin/audit")} className="text-xs text-[#C9A227] hover:underline cursor-pointer">View all</button>
        </div>
        <div className="divide-y divide-stone-800">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-5 py-3 flex gap-4 animate-pulse">
                <div className="h-3 bg-stone-800 rounded w-24" />
                <div className="h-3 bg-stone-800 rounded w-32" />
                <div className="h-3 bg-stone-800 rounded w-40" />
              </div>
            ))
          ) : recentAudit.length === 0 ? (
            <div className="px-5 py-8 text-center text-stone-500 text-xs">No audit activity yet.</div>
          ) : recentAudit.map(log => (
            <div key={log.id} className="px-5 py-3 flex items-center gap-4 hover:bg-stone-800/30 transition-colors">
              <span className="text-stone-500 text-[10px] w-28 flex-shrink-0 font-mono">{new Date(log.createdAt).toLocaleTimeString()}</span>
              <span className="text-stone-400 text-xs w-24 flex-shrink-0 truncate">{log.adminEmail?.split("@")[0]}</span>
              <span className="text-white text-xs font-medium flex-shrink-0">{log.action}</span>
              <span className="text-stone-500 text-xs truncate">{log.details}</span>
            </div>
          ))}
        </div>
      </Card>
    </PageShell>
  );
}
