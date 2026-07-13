import { useState, useEffect, FormEvent, ChangeEvent, useRef, MouseEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import {
  Users, Wallet, Award, ArrowUpRight, ArrowDownLeft, Send, Sparkles, Plus,
  Trash2, FileCheck2, UserPlus, UploadCloud, Smartphone, CreditCard,
  CheckCircle2, ShieldAlert, BadgeInfo, Copy, Check, ZoomIn, ZoomOut,
  ShoppingBag, TrendingUp, ChevronDown, ChevronRight, Star, LogOut,
  Shield, QrCode, ExternalLink, GitBranch, BarChart3, Lock
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from "recharts";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { StatCard } from "./ui/StatCard";
import { Card } from "./ui/Card";
import { Input } from "./ui/Input";

interface Transaction {
  id: string;
  type: "commission" | "withdrawal" | "adjustment" | "refund";
  amountXaf: number;
  description: string;
  createdAt: any;
}

interface Order {
  id: string;
  amountXaf: number;
  pvPoints: number;
  createdAt: any;
  status: string;
}

const RANK_ORDER = ["bronze", "silver", "gold", "platinum", "diamond"] as const;
type RankName = typeof RANK_ORDER[number];

// Must mirror the server-side rank thresholds in calculateUnilevelCommissions() (server.ts)
const RANK_MILESTONES: Record<RankName, { pv: number; label: string }> = {
  bronze:   { pv: 0,     label: "Bronze" },
  silver:   { pv: 500,   label: "Silver" },
  gold:     { pv: 2000,  label: "Gold" },
  platinum: { pv: 5000,  label: "Platinum" },
  diamond:  { pv: 10000, label: "Diamond" },
};

function RankProgressBar({ currentRank, currentPv }: { currentRank: string; currentPv: number }) {
  const rankIdx = RANK_ORDER.indexOf(currentRank as RankName);
  const nextRank = rankIdx < RANK_ORDER.length - 1 ? RANK_ORDER[rankIdx + 1] : null;
  const currentMilestone = RANK_MILESTONES[currentRank as RankName] ?? RANK_MILESTONES.bronze;
  const nextMilestone = nextRank ? RANK_MILESTONES[nextRank] : null;

  const progress = nextMilestone
    ? Math.min(((currentPv - currentMilestone.pv) / (nextMilestone.pv - currentMilestone.pv)) * 100, 100)
    : 100;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[color:var(--color-muted)] text-xs font-semibold uppercase tracking-wide">Rank Progression</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="rank" rank={currentRank}>{currentRank}</Badge>
            {nextRank && (
              <>
                <ChevronRight className="w-3 h-3 text-[color:var(--color-muted)]" />
                <Badge variant="rank" rank={nextRank}>{nextRank}</Badge>
              </>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-[color:var(--color-gold)] font-black text-lg">{currentPv.toLocaleString()}</p>
          <p className="text-[color:var(--color-muted)] text-[10px]">
            {nextMilestone ? `/ ${nextMilestone.pv.toLocaleString()} PV` : "Max Rank ✓"}
          </p>
        </div>
      </div>
      <div className="h-2 rounded-full bg-[color:var(--color-border)] overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[color:var(--color-primary)] to-[color:var(--color-gold)] transition-all duration-700"
          style={{ width: `${progress}%` }}
        />
      </div>
      {nextMilestone && (
        <p className="text-[color:var(--color-muted)] text-[10px] mt-1.5">
          {(nextMilestone.pv - currentPv).toLocaleString()} PV to {nextMilestone.label}
        </p>
      )}
    </Card>
  );
}

function KycBanner({ kycStatus, onGoToKyc }: { kycStatus: string; onGoToKyc: () => void }) {
  if (kycStatus === "verified") {
    return (
      <div className="p-4 bg-emerald-950/30 border border-emerald-900/40 rounded-2xl flex items-center gap-3 text-xs">
        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
        <div className="flex-1">
          <strong className="text-[color:var(--color-fg)] font-bold block">Profile Fully Verified</strong>
          <p className="text-[color:var(--color-muted)]">Compliant with CEMAC & Cameroon Law No. 2010/012.</p>
        </div>
        <Badge variant="success">Compliant</Badge>
      </div>
    );
  }
  if (kycStatus === "pending") {
    return (
      <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-3 text-xs">
        <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0 animate-pulse" />
        <div className="flex-1">
          <strong className="text-[color:var(--color-fg)] font-bold block">Verification In Progress</strong>
          <p className="text-[color:var(--color-muted)]">Our compliance team is auditing your documents.</p>
        </div>
        <Badge variant="warning">Under Review</Badge>
      </div>
    );
  }
  if (kycStatus === "rejected") {
    return (
      <div className="p-4 bg-red-950/40 border border-red-900/50 rounded-2xl flex items-center gap-3 text-xs">
        <ShieldAlert className="w-4 h-4 text-red-500 flex-shrink-0" />
        <div className="flex-1">
          <strong className="text-[color:var(--color-fg)] font-bold block">Document Rejected</strong>
          <p className="text-[color:var(--color-muted)]">Upload a high-resolution ID document to retry.</p>
        </div>
        <Button variant="danger" size="sm" onClick={onGoToKyc}>Re-upload</Button>
      </div>
    );
  }
  return (
    <div className="p-4 bg-[color:var(--color-surface)] border border-[color:var(--color-border)] rounded-2xl flex items-center gap-3 text-xs">
      <BadgeInfo className="w-4 h-4 text-[color:var(--color-primary)] flex-shrink-0" />
      <div className="flex-1">
        <strong className="text-[color:var(--color-fg)] font-bold block">KYC Verification Required</strong>
        <p className="text-[color:var(--color-muted)]">Upload your national ID to unlock full withdrawal privileges.</p>
      </div>
      <Button variant="primary" size="sm" onClick={onGoToKyc}>Verify Now</Button>
    </div>
  );
}

// ── Binary tree helpers ────────────────────────────────────────────────────

function EmptyTreeSlot() {
  return (
    <div className="border border-dashed border-[color:var(--color-border)] rounded-xl p-2.5 text-center min-w-[120px] max-w-[140px] opacity-40 select-none">
      <p className="text-[10px] text-[color:var(--color-muted)]">Empty slot</p>
    </div>
  );
}

const RANK_COLORS: Record<string, string> = {
  bronze:   "text-amber-600 border-amber-600/30 bg-amber-600/10",
  silver:   "text-slate-400 border-slate-400/30 bg-slate-400/10",
  gold:     "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
  platinum: "text-cyan-400  border-cyan-400/30  bg-cyan-400/10",
  diamond:  "text-purple-400 border-purple-400/30 bg-purple-400/10",
};

function BinaryTreeNode({
  node,
  generation,
  maxAutoExpand = 2,
}: {
  node: any;
  generation: number;
  maxAutoExpand?: number;
}) {
  const [expanded, setExpanded] = useState(generation < maxAutoExpand);
  const leftChild  = node.children?.find((c: any) => c.placement_leg === "left"  || (node.children.indexOf(c) === 0 && !node.children[1]));
  const rightChild = node.children?.find((c: any) => c.placement_leg === "right" || (node.children.indexOf(c) === 1));

  // Fallback: first child left, second child right
  const left  = leftChild  ?? (node.children?.[0] && !rightChild ? null : node.children?.[0]) ?? null;
  const right = rightChild ?? node.children?.[1] ?? null;
  const hasChildren = node.children?.length > 0;
  const rc = RANK_COLORS[node.rank ?? "bronze"] ?? RANK_COLORS.bronze;
  const isRoot = generation === 0;

  return (
    <div className="flex flex-col items-center">
      {/* Node card */}
      <div className={`relative border rounded-xl p-2.5 text-center min-w-[120px] max-w-[140px] transition-shadow hover:shadow-lg
        ${isRoot ? "border-[color:var(--color-primary)] bg-[color:var(--color-primary)]/5 shadow-[color:var(--color-primary)]/20 shadow-md" : "border-[color:var(--color-border)] bg-[color:var(--color-surface)]"}`}>
        <p className="text-[9px] text-[color:var(--color-muted)] font-mono truncate">{node.distributor_code}</p>
        <p className="text-[10px] font-black text-[color:var(--color-fg)] truncate mt-0.5">{node.displayName}</p>
        <div className="flex items-center justify-center mt-1">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border capitalize ${rc}`}>{node.rank ?? "bronze"}</span>
        </div>
        <p className="text-[9px] text-[color:var(--color-gold)] font-bold mt-0.5">{(node.pv ?? 0).toLocaleString()} PV</p>
        {isRoot && <p className="text-[8px] text-[color:var(--color-primary)] font-bold mt-0.5">YOU</p>}

        {hasChildren && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-[color:var(--color-surface)] border border-[color:var(--color-border)] flex items-center justify-center text-[color:var(--color-muted)] hover:text-[color:var(--color-primary)] hover:border-[color:var(--color-primary)] transition-colors cursor-pointer z-10 shadow-sm text-xs font-black"
          >
            {expanded ? "−" : "+"}
          </button>
        )}
      </div>

      {/* Connector line + children */}
      {expanded && hasChildren && (
        <div className="flex flex-col items-center mt-8">
          {/* Vertical line from parent */}
          <div className="w-px h-5 bg-[color:var(--color-border)]" />
          <div className="flex gap-8 relative">
            {/* Horizontal bridge */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-[calc(100%-80px)] bg-[color:var(--color-border)]" />
            {/* Left branch */}
            <div className="flex flex-col items-center gap-0">
              <div className="w-px h-5 bg-[color:var(--color-border)]" />
              <span className="text-[8px] font-bold uppercase text-blue-400 mb-1.5">L</span>
              {left ? <BinaryTreeNode node={left} generation={generation + 1} maxAutoExpand={maxAutoExpand} /> : <EmptyTreeSlot />}
            </div>
            {/* Right branch */}
            <div className="flex flex-col items-center gap-0">
              <div className="w-px h-5 bg-[color:var(--color-border)]" />
              <span className="text-[8px] font-bold uppercase text-emerald-400 mb-1.5">R</span>
              {right ? <BinaryTreeNode node={right} generation={generation + 1} maxAutoExpand={maxAutoExpand} /> : <EmptyTreeSlot />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[color:var(--color-surface)] border border-[color:var(--color-border)] rounded-xl p-3 text-xs shadow-xl">
      <p className="text-[color:var(--color-muted)] mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-bold" style={{ color: p.color }}>
          {p.name}: {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
          {p.name === "Commission" ? " XAF" : ""}
        </p>
      ))}
    </div>
  );
};

export default function DistributorPortal({ addNotification }: { addNotification: any }) {
  const { user, userProfile, distributorProfile, wallet, logout } = useAuth();

  const [activePanel, setActivePanel] = useState<"dashboard" | "genealogy" | "earnings" | "wallet" | "orders" | "referral" | "kyc">("dashboard");
  const [payoutProvider, setPayoutProvider] = useState<"mtn_momo" | "orange_money">("mtn_momo");
  const [payoutPhone, setPayoutPhone] = useState("");
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [kycFile, setKycFile] = useState<File | null>(null);
  const [kycLoading, setKycLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [downlineList, setDownlineList] = useState<any[]>([]);

  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [treeViewMode, setTreeViewMode] = useState(true);
  const dragStart = useRef({ x: 0, y: 0 });

  // Binary tree state
  const [treeData, setTreeData]   = useState<any>(null);
  const [treeStats, setTreeStats] = useState<any>(null);
  const [treeLoading, setTreeLoading] = useState(false);

  // Earnings state
  const [earningsData, setEarningsData]     = useState<any>(null);
  const [earningsLoading, setEarningsLoading] = useState(false);

  useEffect(() => {
    if (!user || !distributorProfile) return;
    const sponsorCode = distributorProfile.distributorCode;
    const userId = user.id;

    const mapDownline = (rows: any[]) => rows.map((d) => ({
      uid: d.id, distributorCode: d.distributor_code,
      rank: d.rank, sponsorId: d.sponsor_id, joinedAt: d.joined_at,
    }));
    const mapTx = (rows: any[]) => rows.map((t) => ({
      id: t.id, type: t.type, amountXaf: t.amount_xaf,
      description: t.description, createdAt: t.created_at,
    }));
    const mapOrders = (rows: any[]) => rows.map((o) => ({
      id: o.order_id ?? o.id, amountXaf: o.amount_xaf,
      pvPoints: o.pv_points ?? 0, status: o.status, createdAt: o.created_at,
    }));

    const loadData = async () => {
      const [downlineRes, txRes, ordersRes] = await Promise.all([
        supabase.from("distributors").select("*").eq("sponsor_id", sponsorCode),
        supabase.from("wallet_transactions").select("*").eq("wallet_id", userId).order("created_at", { ascending: false }),
        supabase.from("orders").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      ]);

      if (downlineRes.data) setDownlineList(mapDownline(downlineRes.data));
      if (txRes.data) setTransactions(mapTx(txRes.data));
      if (ordersRes.data) setOrders(mapOrders(ordersRes.data));
    };

    loadData();

    const channel = supabase
      .channel(`portal-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "distributors", filter: `sponsor_id=eq.${sponsorCode}` },
        async () => {
          const { data } = await supabase.from("distributors").select("*").eq("sponsor_id", sponsorCode);
          if (data) setDownlineList(mapDownline(data));
        })
      .on("postgres_changes", { event: "*", schema: "public", table: "wallet_transactions", filter: `wallet_id=eq.${userId}` },
        async () => {
          const { data } = await supabase.from("wallet_transactions").select("*").eq("wallet_id", userId).order("created_at", { ascending: false });
          if (data) setTransactions(mapTx(data));
        })
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `user_id=eq.${userId}` },
        async () => {
          const { data } = await supabase.from("orders").select("*").eq("user_id", userId).order("created_at", { ascending: false });
          if (data) setOrders(mapOrders(data));
        })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, distributorProfile?.distributorCode]);

  // Fetch binary tree when genealogy panel opens
  useEffect(() => {
    if (activePanel !== "genealogy" || !user) return;
    if (treeData) return; // already loaded
    const load = async () => {
      setTreeLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const res = await fetch("/api/distributor/tree", { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        const json = await res.json();
        if (res.ok) { setTreeData(json.tree); setTreeStats(json.stats); }
      } catch { /* silently ignore */ }
      finally { setTreeLoading(false); }
    };
    load();
  }, [activePanel, user?.id]);

  // Fetch earnings when earnings panel opens
  useEffect(() => {
    if (activePanel !== "earnings" || !user) return;
    if (earningsData) return; // already loaded
    const load = async () => {
      setEarningsLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const res = await fetch("/api/distributor/earnings", { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        const json = await res.json();
        if (res.ok) setEarningsData(json);
      } catch { /* silently ignore */ }
      finally { setEarningsLoading(false); }
    };
    load();
  }, [activePanel, user?.id]);

  const handlePayoutSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !wallet) return;
    const amountNum = parseInt(payoutAmount);
    if (isNaN(amountNum) || amountNum <= 0) return;
    if (amountNum > wallet.balanceXaf) { addNotification("Insufficient wallet balance.", "info"); return; }
    if (amountNum < 2000) { addNotification("Minimum withdrawal is 2,000 XAF.", "info"); return; }
    setPayoutLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("No active session.");
      const res = await fetch("/api/payment/payout", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ amountXaf: amountNum, phone: payoutPhone, provider: payoutProvider }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Payout failed.");
      addNotification(`Cashout of ${amountNum.toLocaleString()} XAF submitted!`, "success");
      setPayoutAmount(""); setPayoutPhone("");
    } catch (err: any) {
      addNotification("Error submitting withdrawal.", "info");
    } finally { setPayoutLoading(false); }
  };

  const handleAddMember = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !distributorProfile || !newMemberName.trim()) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("No session.");
      const res = await fetch("/api/distributor/add-downline", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ memberName: newMemberName, sponsorCode: distributorProfile.distributorCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed.");
      addNotification(`${newMemberName} added to your network! Code: ${data.distributorCode}`, "success");
      setNewMemberName("");
    } catch (err: any) { addNotification("Error adding member.", "info"); }
  };

  const handleKycUploadChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setKycFile(file); setKycLoading(true);
      try {
        const docId = `kyc-${user?.id}`;
        const { error } = await supabase.from("kyc_documents").upsert({
          id: docId, distributor_id: user?.id,
          document_type: "National ID Card / Passport",
          file_url: `https://auyjxchghtetxpiyecds.supabase.co/storage/v1/object/public/kyc/${user?.id}/${file.name}`,
          status: "pending",
        });
        if (error) throw error;
        await supabase.from("distributors").update({ kyc_status: "pending" }).eq("id", user?.id);
        addNotification("Document uploaded. Pending admin review.", "success");
      } catch { addNotification("Upload failed.", "info"); }
      finally { setKycLoading(false); }
    }
  };

  const copyReferralLink = () => {
    if (!distributorProfile) return;
    const link = `https://songtailife.cm/join?ref=${distributorProfile.distributorCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    addNotification("Referral link copied!", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMouseDown = (e: MouseEvent) => { setIsDragging(true); dragStart.current = { x: e.clientX - panX, y: e.clientY - panY }; };
  const handleMouseMove = (e: MouseEvent) => { if (!isDragging) return; setPanX(e.clientX - dragStart.current.x); setPanY(e.clientY - dragStart.current.y); };
  const handleMouseUp = () => setIsDragging(false);

  const commissions = transactions.filter(t => t.type === "commission");
  const totalEarned = commissions.reduce((s, t) => s + t.amountXaf, 0);

  const chartData = (() => {
    const months: Record<string, { name: string; Commission: number; Members: number }> = {};
    commissions.forEach(t => {
      const d = new Date(t.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const name = d.toLocaleString("default", { month: "short" });
      if (!months[key]) months[key] = { name, Commission: 0, Members: 0 };
      months[key].Commission += t.amountXaf;
    });
    downlineList.forEach(m => {
      if (!m.joinedAt) return;
      const d = new Date(m.joinedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const name = d.toLocaleString("default", { month: "short" });
      if (!months[key]) months[key] = { name, Commission: 0, Members: 0 };
      months[key].Members += 1;
    });
    return Object.values(months).slice(-6);
  })();

  // Real PV comes straight from the distributors table (kept in sync by the
  // server-side unilevel commission engine) rather than re-derived client-side.
  const currentPv = distributorProfile?.pv ?? 0;

  const TABS = [
    { id: "dashboard", label: "Dashboard", icon: <TrendingUp className="w-4 h-4" /> },
    { id: "genealogy", label: "My Team",   icon: <Users className="w-4 h-4" /> },
    { id: "earnings",  label: "Earnings",  icon: <BarChart3 className="w-4 h-4" /> },
    { id: "wallet",    label: "Wallet",    icon: <Wallet className="w-4 h-4" /> },
    { id: "orders",    label: "Purchases", icon: <ShoppingBag className="w-4 h-4" /> },
    { id: "referral",  label: "Referral",  icon: <Sparkles className="w-4 h-4" /> },
    { id: "kyc",       label: "KYC",       icon: <FileCheck2 className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-fg)] font-sans select-none antialiased">

      {/* ── Top header bar ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-[color:var(--color-bg)]/95 backdrop-blur-md border-b border-[color:var(--color-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[color:var(--color-primary)]/10 border border-[color:var(--color-primary)]/20 flex items-center justify-center flex-shrink-0">
              <Star className="w-4 h-4 text-[color:var(--color-primary)]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-[color:var(--color-fg)] truncate leading-none">
                {userProfile?.email.split("@")[0] ?? "Distributor"}
              </p>
              <p className="text-[10px] text-[color:var(--color-muted)] mt-0.5 leading-none">
                {distributorProfile?.distributorCode ?? "—"} · <span className="capitalize">{distributorProfile?.rank ?? "Bronze"}</span>
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" icon={<LogOut className="w-3.5 h-3.5" />} onClick={logout}>
            Sign out
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── Navigation tabs ────────────────────────────────────────────── */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActivePanel(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex-shrink-0
                ${activePanel === tab.id
                  ? "bg-[color:var(--color-primary)]/10 border border-[color:var(--color-primary)]/40 text-[color:var(--color-primary)]"
                  : "bg-[color:var(--color-surface)] border border-[color:var(--color-border)] text-[color:var(--color-muted)] hover:text-[color:var(--color-fg)]"
                }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            PANEL 1 — DASHBOARD
        ══════════════════════════════════════════════════════════════════ */}
        {activePanel === "dashboard" && (
          <div className="space-y-6">

            {/* KYC Banner */}
            <KycBanner kycStatus={distributorProfile?.kycStatus ?? "none"} onGoToKyc={() => setActivePanel("kyc")} />

            {/* KPI Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Wallet Balance"
                value={(wallet?.balanceXaf || 0).toLocaleString()}
                unit="XAF"
                icon={<Wallet className="w-4 h-4" />}
                iconColor="text-[color:var(--color-gold)]"
                sub="Available for withdrawal"
              />
              <StatCard
                label="Total Earned"
                value={totalEarned.toLocaleString()}
                unit="XAF"
                icon={<TrendingUp className="w-4 h-4" />}
                iconColor="text-[color:var(--color-primary)]"
                sub="Lifetime commissions"
              />
              <StatCard
                label="Direct Downlines"
                value={downlineList.length}
                unit="Members"
                icon={<Users className="w-4 h-4" />}
                iconColor="text-emerald-400"
                sub="Level 1 network"
              />
              <StatCard
                label="KYC Status"
                value={distributorProfile?.kycStatus === "verified" ? "✓ Verified" : distributorProfile?.kycStatus ?? "None"}
                icon={<Shield className="w-4 h-4" />}
                iconColor={distributorProfile?.kycStatus === "verified" ? "text-emerald-400" : "text-amber-400"}
                onClick={() => setActivePanel("kyc")}
                sub="Click to manage"
              />
            </div>

            {/* Rank progress */}
            <RankProgressBar currentRank={distributorProfile?.rank ?? "bronze"} currentPv={currentPv} />

            {/* Charts row */}
            {chartData.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card padding="lg">
                  <h4 className="font-bold text-sm text-[color:var(--color-fg)] mb-4">Commission Earnings</h4>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="commGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: "var(--color-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "var(--color-muted)", fontSize: 10 }} axisLine={false} tickLine={false} width={50} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="Commission" stroke="var(--color-primary)" strokeWidth={2} fill="url(#commGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>

                <Card padding="lg">
                  <h4 className="font-bold text-sm text-[color:var(--color-fg)] mb-4">Team Growth</h4>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: "var(--color-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "var(--color-muted)", fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="Members" fill="var(--color-gold)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </div>
            )}

            {/* Bottom row: commissions list + add member */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card padding="none" className="lg:col-span-2">
                <div className="p-5 border-b border-[color:var(--color-border)] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[color:var(--color-primary)]" />
                  <h4 className="font-bold text-sm text-[color:var(--color-fg)]">Recent Commissions</h4>
                </div>
                <div className="divide-y divide-[color:var(--color-border)]">
                  {commissions.length === 0 ? (
                    <div className="py-10 text-center text-[color:var(--color-muted)] text-xs">
                      No commissions yet. Commissions accrue as your team purchases products.
                    </div>
                  ) : commissions.slice(0, 6).map(tx => (
                    <div key={tx.id} className="px-5 py-4 flex justify-between items-center gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[color:var(--color-fg)] truncate">{tx.description}</p>
                        <p className="text-[10px] text-[color:var(--color-muted)] font-mono mt-0.5 truncate">{tx.id}</p>
                      </div>
                      <span className="font-black text-emerald-400 text-sm whitespace-nowrap flex items-center gap-0.5">
                        <ArrowUpRight className="w-3.5 h-3.5" />{tx.amountXaf.toLocaleString()} XAF
                      </span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card padding="lg" className="space-y-4">
                <div>
                  <h4 className="font-bold text-sm text-[color:var(--color-fg)]">Sponsor a Member</h4>
                  <p className="text-xs text-[color:var(--color-muted)] mt-1">Add a recruit directly to your downline. They immediately start generating commission overrides.</p>
                </div>
                <form onSubmit={handleAddMember} className="space-y-3">
                  <Input
                    label="Recruit's Full Name"
                    placeholder="e.g. Samuel Eto'o"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    required
                  />
                  <Button type="submit" variant="primary" fullWidth icon={<UserPlus className="w-4 h-4" />}>
                    Add to My Network
                  </Button>
                </form>
              </Card>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            PANEL 2 — TEAM / GENEALOGY
        ══════════════════════════════════════════════════════════════════ */}
        {activePanel === "genealogy" && (
          <div className="space-y-4">
            {/* Header + view toggle */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h3 className="font-bold text-lg text-[color:var(--color-fg)]">My Network</h3>
                <p className="text-[color:var(--color-muted)] text-xs mt-0.5">
                  {treeStats ? `${treeStats.total_downline} total in your downline` : `${downlineList.length} direct downline${downlineList.length !== 1 ? "s" : ""}`}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant={!treeViewMode ? "primary" : "secondary"} size="sm" onClick={() => setTreeViewMode(false)}>
                  List view
                </Button>
                <Button variant={treeViewMode ? "primary" : "secondary"} size="sm" onClick={() => setTreeViewMode(true)} className="hidden sm:flex">
                  Tree view
                </Button>
              </div>
            </div>

            {/* Leg PV summary — shown in tree view when stats are available */}
            {treeViewMode && treeStats && (
              <div className="grid grid-cols-3 gap-3">
                <Card padding="sm" className="text-center space-y-1">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-blue-400">Left Leg PV</p>
                  <p className="text-lg font-black text-[color:var(--color-fg)]">{treeStats.left_leg_pv.toLocaleString()}</p>
                </Card>
                <Card padding="sm" className="text-center space-y-1 border-[color:var(--color-gold)]/40">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-[color:var(--color-gold)]">Weaker Leg PV</p>
                  <p className="text-lg font-black text-[color:var(--color-gold)]">{treeStats.weaker_leg_pv.toLocaleString()}</p>
                  <p className="text-[8px] text-[color:var(--color-muted)] capitalize">{treeStats.weaker_leg} leg · weekly bonus base</p>
                </Card>
                <Card padding="sm" className="text-center space-y-1">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-400">Right Leg PV</p>
                  <p className="text-lg font-black text-[color:var(--color-fg)]">{treeStats.right_leg_pv.toLocaleString()}</p>
                </Card>
              </div>
            )}

            {!treeViewMode ? (
              /* List view — default on mobile */
              <Card padding="none">
                {downlineList.length === 0 ? (
                  <div className="py-16 flex flex-col items-center gap-3 text-center px-6">
                    <div className="w-12 h-12 rounded-2xl bg-[color:var(--color-border)]/50 flex items-center justify-center">
                      <Users className="w-6 h-6 text-[color:var(--color-muted)]" />
                    </div>
                    <div>
                      <p className="font-bold text-[color:var(--color-fg)] text-sm">No downlines yet</p>
                      <p className="text-[color:var(--color-muted)] text-xs mt-1">Copy your referral link to start growing your team.</p>
                    </div>
                    <Button variant="primary" size="sm" onClick={() => setActivePanel("referral")}>Get Referral Link</Button>
                  </div>
                ) : (
                  <div className="divide-y divide-[color:var(--color-border)]">
                    {downlineList.map((member, i) => (
                      <div key={member.uid} className="px-5 py-4 flex items-center gap-4">
                        <div className="w-9 h-9 rounded-xl bg-[color:var(--color-border)]/50 flex items-center justify-center flex-shrink-0 text-xs font-black text-[color:var(--color-muted)]">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-mono font-bold text-sm text-[color:var(--color-fg)]">{member.distributorCode}</p>
                          <p className="text-[10px] text-[color:var(--color-muted)] mt-0.5">Level 1 — Direct</p>
                        </div>
                        <Badge variant="rank" rank={member.rank ?? "bronze"}>{member.rank ?? "bronze"}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ) : (
              /* Tree view — BinaryTreeNode, panned/zoomed, up to 12 generations */
              <Card padding="none" className="overflow-hidden">
                <div className="flex gap-2 p-3 border-b border-[color:var(--color-border)] items-center">
                  <Button variant="secondary" size="sm" icon={<ZoomIn className="w-3.5 h-3.5" />} onClick={() => setZoom(p => Math.min(p + 0.15, 2))}>+</Button>
                  <Button variant="secondary" size="sm" icon={<ZoomOut className="w-3.5 h-3.5" />} onClick={() => setZoom(p => Math.max(p - 0.15, 0.4))}>−</Button>
                  <Button variant="ghost" size="sm" onClick={() => { setPanX(0); setPanY(0); setZoom(1); }}>Reset</Button>
                  <span className="text-[10px] text-[color:var(--color-muted)] ml-auto hidden sm:block">Drag to pan · +/− to zoom · click + to expand generations</span>
                </div>
                {treeLoading ? (
                  <div className="flex items-center justify-center min-h-[420px]">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-6 h-6 border-2 border-[color:var(--color-primary)] border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs text-[color:var(--color-muted)]">Loading your network…</p>
                    </div>
                  </div>
                ) : !treeData ? (
                  <div className="flex items-center justify-center min-h-[420px]">
                    <p className="text-[color:var(--color-muted)] text-sm">No network data found.</p>
                  </div>
                ) : (
                  <div
                    onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
                    className="relative w-full min-h-[480px] bg-[color:var(--color-bg)] overflow-hidden cursor-grab active:cursor-grabbing"
                  >
                    <div
                      style={{ transform: `translate(${panX}px, ${panY}px) scale(${zoom})`, transformOrigin: "center 80px", transition: isDragging ? "none" : "transform 0.15s ease" }}
                      className="absolute inset-0 flex items-start justify-center pt-8"
                    >
                      <BinaryTreeNode node={treeData} generation={0} maxAutoExpand={2} />
                    </div>
                  </div>
                )}
              </Card>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            PANEL 2b — EARNINGS (Performance + Leadership Bonus)
        ══════════════════════════════════════════════════════════════════ */}
        {activePanel === "earnings" && (
          <div className="space-y-5">
            {earningsLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-6 h-6 border-2 border-[color:var(--color-primary)] border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-[color:var(--color-muted)]">Loading earnings data…</p>
                </div>
              </div>
            ) : !earningsData ? (
              <div className="text-center py-20 text-[color:var(--color-muted)] text-sm">
                Earnings data unavailable. Ensure your distributor profile is active.
              </div>
            ) : (
              <>
                {/* Weekly Performance Bonus */}
                <Card padding="lg" className="space-y-4">
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-[color:var(--color-gold)] font-bold">Weekly Performance Bonus</span>
                    <h3 className="font-bold text-base text-[color:var(--color-fg)] mt-1">Binary PV Bonus</h3>
                    <p className="text-xs text-[color:var(--color-muted)] mt-1">Calculated on your weaker leg PV × your rank bonus %. Paid weekly, capped per rank.</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-[color:var(--color-bg)] border border-blue-500/20 text-center">
                      <p className="text-[9px] uppercase tracking-widest text-blue-400 font-bold">Left Leg PV</p>
                      <p className="text-xl font-black text-[color:var(--color-fg)] mt-1">{earningsData.performance_bonus.left_leg_pv.toLocaleString()}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-[color:var(--color-bg)] border border-emerald-500/20 text-center">
                      <p className="text-[9px] uppercase tracking-widest text-emerald-400 font-bold">Right Leg PV</p>
                      <p className="text-xl font-black text-[color:var(--color-fg)] mt-1">{earningsData.performance_bonus.right_leg_pv.toLocaleString()}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-[color:var(--color-gold)]/5 border border-[color:var(--color-gold)]/30 text-center">
                      <p className="text-[9px] uppercase tracking-widest text-[color:var(--color-gold)] font-bold">Weaker Leg PV</p>
                      <p className="text-xl font-black text-[color:var(--color-gold)] mt-1">{earningsData.performance_bonus.weaker_leg_pv.toLocaleString()}</p>
                      <p className="text-[8px] text-[color:var(--color-muted)] capitalize mt-0.5">{earningsData.performance_bonus.weaker_leg} leg</p>
                    </div>
                    <div className={`p-3 rounded-xl text-center border ${earningsData.performance_bonus.is_capped ? "bg-amber-500/5 border-amber-500/30" : "bg-[color:var(--color-primary)]/5 border-[color:var(--color-primary)]/20"}`}>
                      <p className="text-[9px] uppercase tracking-widest text-[color:var(--color-primary)] font-bold">Est. Bonus</p>
                      <p className="text-xl font-black text-[color:var(--color-primary)] mt-1">{earningsData.performance_bonus.bonus_xaf.toLocaleString()}</p>
                      <p className="text-[8px] text-[color:var(--color-muted)] mt-0.5">XAF/week</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[color:var(--color-bg)] border border-[color:var(--color-border)]">
                      <span className="text-[color:var(--color-muted)]">Bonus rate:</span>
                      <span className="font-bold text-[color:var(--color-fg)]">{earningsData.performance_bonus.weekly_bonus_pct}%</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[color:var(--color-bg)] border border-[color:var(--color-border)]">
                      <span className="text-[color:var(--color-muted)]">Weekly ceiling:</span>
                      <span className="font-bold text-[color:var(--color-fg)]">{earningsData.performance_bonus.weekly_ceiling_xaf > 0 ? `${earningsData.performance_bonus.weekly_ceiling_xaf.toLocaleString()} XAF` : "Uncapped"}</span>
                    </div>
                    {earningsData.performance_bonus.is_capped && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
                        <Award className="w-3.5 h-3.5" />
                        <span className="font-bold">Bonus is capped at your rank ceiling (raw: {earningsData.performance_bonus.raw_bonus_xaf.toLocaleString()} XAF)</span>
                      </div>
                    )}
                  </div>
                </Card>

                {/* 12-Generation Leadership Bonus */}
                <Card padding="none">
                  <div className="p-5 border-b border-[color:var(--color-border)]">
                    <span className="text-[10px] uppercase tracking-widest text-[color:var(--color-gold)] font-bold">Leadership Bonus</span>
                    <h3 className="font-bold text-base text-[color:var(--color-fg)] mt-1">12-Generation Override</h3>
                    <p className="text-xs text-[color:var(--color-muted)] mt-1">Earned on your downline's purchases, generation by generation. Unlock deeper generations by advancing your rank.</p>
                  </div>
                  <div className="divide-y divide-[color:var(--color-border)]">
                    {(earningsData.leadership_bonus as any[]).map((gen: any) => (
                      <div key={gen.generation} className={`px-5 py-3.5 flex items-center gap-4 ${!gen.unlocked ? "opacity-50" : ""}`}>
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-black
                          ${gen.unlocked ? "bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)]" : "bg-[color:var(--color-border)]/50 text-[color:var(--color-muted)]"}`}>
                          {gen.generation}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-[color:var(--color-fg)]">Generation {gen.generation}</p>
                            {!gen.unlocked && gen.unlock_rank && (
                              <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-[color:var(--color-muted)] bg-[color:var(--color-border)]/50 px-2 py-0.5 rounded-full">
                                <Lock className="w-2.5 h-2.5" />Reach {gen.unlock_rank}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-[color:var(--color-muted)] mt-0.5">
                            {gen.unlocked ? `${gen.pct}% on gen ${gen.generation} purchases` : "Locked at your current rank"}
                          </p>
                        </div>
                        <div className="text-right">
                          {gen.unlocked ? (
                            <>
                              <p className="font-black text-sm text-emerald-400">{gen.earned_xaf.toLocaleString()}</p>
                              <p className="text-[9px] text-[color:var(--color-muted)]">XAF earned</p>
                            </>
                          ) : (
                            <Lock className="w-4 h-4 text-[color:var(--color-border)]" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Commission history summary */}
                <Card padding="none">
                  <div className="p-5 border-b border-[color:var(--color-border)] flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[color:var(--color-primary)]" />
                    <h4 className="font-bold text-sm text-[color:var(--color-fg)]">Commission History</h4>
                    <Badge variant="default" className="ml-auto">{commissions.length} records</Badge>
                  </div>
                  {commissions.length === 0 ? (
                    <div className="py-12 text-center text-[color:var(--color-muted)] text-xs">
                      No commissions yet. Commissions accrue as your team purchases products.
                    </div>
                  ) : (
                    <div className="divide-y divide-[color:var(--color-border)]">
                      {commissions.map(tx => (
                        <div key={tx.id} className="px-5 py-4 flex items-center gap-4">
                          <div className="w-8 h-8 rounded-xl bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                            <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[color:var(--color-fg)] truncate">{tx.description}</p>
                            <p className="text-[10px] text-[color:var(--color-muted)] font-mono mt-0.5">{new Date(tx.createdAt).toLocaleDateString()}</p>
                          </div>
                          <p className="font-black text-sm text-emerald-400 whitespace-nowrap">+{tx.amountXaf.toLocaleString()} XAF</p>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            PANEL 3 — WALLET
        ══════════════════════════════════════════════════════════════════ */}
        {activePanel === "wallet" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              {/* Balance card with trust signals */}
              <Card variant="highlight" padding="lg" className="flex flex-col sm:flex-row sm:items-center gap-6">
                <div className="flex-1">
                  <p className="text-[color:var(--color-muted)] text-xs font-semibold uppercase">Available Balance</p>
                  <p className="text-4xl font-black text-[color:var(--color-fg)] mt-1">{(wallet?.balanceXaf || 0).toLocaleString()}</p>
                  <p className="text-[color:var(--color-gold)] text-xs font-bold mt-0.5">XAF · CFA Franc</p>
                </div>
                <div className="flex flex-col gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>MeSomb verified gateway</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[color:var(--color-muted)]">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Payouts process in 1–3 hours</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[color:var(--color-muted)]">
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>MTN MoMo · Orange Money</span>
                  </div>
                </div>
              </Card>

              {/* Transaction history */}
              <Card padding="none">
                <div className="p-5 border-b border-[color:var(--color-border)] flex items-center justify-between">
                  <h4 className="font-bold text-sm text-[color:var(--color-fg)]">Transaction History</h4>
                  <Badge variant="default">{transactions.length} records</Badge>
                </div>
                {transactions.length === 0 ? (
                  <div className="py-12 text-center text-[color:var(--color-muted)] text-xs">No transactions yet.</div>
                ) : (
                  <div className="divide-y divide-[color:var(--color-border)]">
                    {transactions.map(tx => (
                      <div key={tx.id} className="px-5 py-4 flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${tx.type === "commission" ? "bg-emerald-900/30" : "bg-red-900/20"}`}>
                          {tx.type === "commission"
                            ? <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                            : <ArrowDownLeft className="w-4 h-4 text-red-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[color:var(--color-fg)] truncate">{tx.description}</p>
                          <p className="text-[10px] text-[color:var(--color-muted)] font-mono mt-0.5 truncate">{tx.id}</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-black text-sm ${tx.type === "commission" ? "text-emerald-400" : "text-red-400"}`}>
                            {tx.type === "commission" ? "+" : "−"}{tx.amountXaf.toLocaleString()}
                          </p>
                          <p className="text-[10px] text-[color:var(--color-muted)]">XAF</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* Withdrawal form */}
            <Card padding="lg" className="space-y-5 h-fit">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-[color:var(--color-gold)] font-bold">MeSomb Gateway</span>
                <h3 className="font-bold text-base text-[color:var(--color-fg)] mt-1">Request Cashout</h3>
                <p className="text-xs text-[color:var(--color-muted)] mt-1">Minimum 2,000 XAF. Payouts sent within 1–3 hours.</p>
              </div>
              <form onSubmit={handlePayoutSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {(["mtn_momo", "orange_money"] as const).map(prov => (
                    <button
                      key={prov} type="button"
                      onClick={() => setPayoutProvider(prov)}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${payoutProvider === prov
                        ? prov === "mtn_momo" ? "bg-yellow-500/10 border-yellow-500 text-yellow-400" : "bg-orange-500/10 border-orange-500 text-orange-400"
                        : "bg-[color:var(--color-bg)] border-[color:var(--color-border)] text-[color:var(--color-muted)]"
                      }`}
                    >{prov === "mtn_momo" ? "MTN MoMo" : "Orange Money"}</button>
                  ))}
                </div>
                <Input
                  label="Phone Number"
                  type="tel"
                  placeholder="+237 6xx xxx xxx"
                  value={payoutPhone}
                  onChange={e => setPayoutPhone(e.target.value)}
                  icon={<Smartphone className="w-4 h-4" />}
                  required
                />
                <Input
                  label="Amount (XAF)"
                  type="number"
                  placeholder="e.g. 5000"
                  value={payoutAmount}
                  onChange={e => setPayoutAmount(e.target.value)}
                  icon={<CreditCard className="w-4 h-4" />}
                  hint={`Max: ${(wallet?.balanceXaf ?? 0).toLocaleString()} XAF`}
                  required
                />
                <Button type="submit" variant="primary" fullWidth loading={payoutLoading} icon={<Send className="w-4 h-4" />}>
                  Request Withdrawal
                </Button>
              </form>
            </Card>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            PANEL 4 — ORDERS
        ══════════════════════════════════════════════════════════════════ */}
        {activePanel === "orders" && (
          <Card padding="none">
            <div className="p-5 border-b border-[color:var(--color-border)] flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-[color:var(--color-primary)]" />
              <h4 className="font-bold text-sm text-[color:var(--color-fg)]">Purchase History</h4>
            </div>
            {orders.length === 0 ? (
              <div className="py-16 text-center text-[color:var(--color-muted)] text-xs">
                No purchases yet. Browse the store to place your first order.
              </div>
            ) : (
              <div className="divide-y divide-[color:var(--color-border)]">
                {orders.map(ord => (
                  <div key={ord.id} className="px-5 py-4 flex items-center gap-4 flex-wrap">
                    <p className="font-mono text-[11px] text-[color:var(--color-muted)] flex-1 truncate">{ord.id}</p>
                    <p className="font-bold text-sm text-[color:var(--color-fg)]">{ord.amountXaf.toLocaleString()} <span className="text-[10px] font-normal text-[color:var(--color-muted)]">XAF</span></p>
                    <Badge variant="gold">+{ord.pvPoints} PV</Badge>
                    <Badge variant={ord.status === "paid" ? "success" : ord.status === "failed" || ord.status === "refunded" ? "danger" : "warning"}>
                      {ord.status === "paid" ? "Paid" : ord.status === "failed" ? "Failed" : ord.status === "refunded" ? "Refunded" : "Pending"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            PANEL 5 — REFERRAL TOOLS
        ══════════════════════════════════════════════════════════════════ */}
        {activePanel === "referral" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card padding="lg" className="space-y-5">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-[color:var(--color-gold)] font-bold">Recruitment Link</span>
                <h3 className="font-bold text-base text-[color:var(--color-fg)] mt-1">Share Your Referral ID</h3>
                <p className="text-xs text-[color:var(--color-muted)] mt-1.5 leading-relaxed">
                  Earn 10% on every direct sale your recruits make. Overrides continue up 5 levels.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-[10px] font-bold uppercase text-[color:var(--color-muted)] mb-1.5">Your Distributor Code</p>
                  <div className="p-3.5 bg-[color:var(--color-bg)] rounded-xl border border-[color:var(--color-border)] flex items-center justify-between gap-3">
                    <span className="font-mono font-bold text-[color:var(--color-fg)]">{distributorProfile?.distributorCode ?? "—"}</span>
                    <Button variant="ghost" size="sm" icon={copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />} onClick={copyReferralLink}>
                      {copied ? "Copied!" : "Copy link"}
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase text-[color:var(--color-muted)] mb-1.5">Referral URL</p>
                  <div className="p-3.5 bg-[color:var(--color-bg)] rounded-xl border border-[color:var(--color-border)] flex items-center gap-2">
                    <ExternalLink className="w-3.5 h-3.5 text-[color:var(--color-muted)] flex-shrink-0" />
                    <span className="text-[11px] text-[color:var(--color-muted)] truncate">
                      songtailife.cm/join?ref={distributorProfile?.distributorCode ?? "…"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Commission rate table */}
              <div>
                <p className="text-[10px] font-bold uppercase text-[color:var(--color-muted)] mb-2">Your Override Rates</p>
                <div className="space-y-1.5">
                  {[["Level 1 (direct)", "10%"], ["Level 2", "5%"], ["Level 3", "3%"], ["Level 4", "2%"], ["Level 5", "1%"]].map(([lvl, rate]) => (
                    <div key={lvl} className="flex justify-between items-center text-xs">
                      <span className="text-[color:var(--color-muted)]">{lvl}</span>
                      <Badge variant="gold">{rate}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Card padding="lg" className="flex flex-col items-center gap-5">
              <div className="text-center">
                <h3 className="font-bold text-base text-[color:var(--color-fg)]">QR Code</h3>
                <p className="text-xs text-[color:var(--color-muted)] mt-1">Let recruits scan this at events</p>
              </div>
              {distributorProfile?.distributorCode && (
                <div className="p-4 bg-white rounded-2xl shadow-lg">
                  <QRCodeSVG
                    value={`https://songtailife.cm/join?ref=${distributorProfile.distributorCode}`}
                    size={160}
                    bgColor="#FFFFFF"
                    fgColor="#016934"
                  />
                </div>
              )}
              <p className="text-[10px] text-[color:var(--color-muted)] text-center">
                Scans link to: songtailife.cm/join?ref={distributorProfile?.distributorCode}
              </p>
            </Card>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            PANEL 6 — KYC / COMPLIANCE
        ══════════════════════════════════════════════════════════════════ */}
        {activePanel === "kyc" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card padding="lg" className="space-y-5">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-[color:var(--color-gold)] font-bold">Identity Verification</span>
                <h3 className="font-bold text-base text-[color:var(--color-fg)] mt-1">KYC Compliance</h3>
                <p className="text-xs text-[color:var(--color-muted)] mt-1.5 leading-relaxed">
                  Upload a clear scan of your national ID card or international passport to unlock full withdrawal privileges.
                </p>
              </div>

              <div className="p-4 bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-xl space-y-2 text-xs">
                <p className="font-bold text-[color:var(--color-fg)]">Current Status</p>
                <div className="flex items-center gap-2">
                  {distributorProfile?.kycStatus === "verified" && <Badge variant="success" dot>Verified</Badge>}
                  {distributorProfile?.kycStatus === "pending" && <Badge variant="warning" dot>Under Review</Badge>}
                  {distributorProfile?.kycStatus === "rejected" && <Badge variant="danger" dot>Rejected</Badge>}
                  {(!distributorProfile?.kycStatus || distributorProfile.kycStatus === "none") && <Badge variant="default" dot>Not submitted</Badge>}
                </div>
              </div>

              {distributorProfile?.kycStatus !== "verified" && (
                <div>
                  <p className="text-xs font-bold text-[color:var(--color-muted)] mb-2">Upload Document</p>
                  <label className={`flex flex-col items-center gap-3 p-6 border-2 border-dashed rounded-2xl cursor-pointer transition-all
                    ${kycLoading ? "opacity-50 pointer-events-none" : "border-[color:var(--color-border)] hover:border-[color:var(--color-primary)]/60 hover:bg-[color:var(--color-primary)]/5"}`}>
                    <UploadCloud className="w-8 h-8 text-[color:var(--color-muted)]" />
                    <div className="text-center">
                      <p className="text-sm font-bold text-[color:var(--color-fg)]">
                        {kycLoading ? "Uploading…" : kycFile ? kycFile.name : "Click to upload"}
                      </p>
                      <p className="text-xs text-[color:var(--color-muted)] mt-0.5">National ID, Passport — JPG/PNG/PDF max 5MB</p>
                    </div>
                    <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.pdf" onChange={handleKycUploadChange} disabled={kycLoading} />
                  </label>
                </div>
              )}
            </Card>

            <Card padding="lg" className="space-y-4">
              <h4 className="font-bold text-sm text-[color:var(--color-fg)]">Why KYC?</h4>
              {[
                ["CEMAC Compliance", "Required by the Central African Economic and Monetary Community for financial operations."],
                ["Cameroon Law 2010/012", "Cybersecurity and data protection compliance mandated by national law."],
                ["Wallet Withdrawals", "Verified profiles unlock full cashout privileges via MTN MoMo & Orange Money."],
                ["Network Trust", "Your downline sees your verified status — it builds trust in your leadership."],
              ].map(([title, desc]) => (
                <div key={title} className="flex gap-3 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-[color:var(--color-primary)] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-[color:var(--color-fg)]">{title}</p>
                    <p className="text-[color:var(--color-muted)] mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </Card>
          </div>
        )}

      </div>
    </div>
  );
}
