import { useState, useEffect, FormEvent, ChangeEvent, useRef, MouseEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import {
  Users, Wallet, Award, ArrowUpRight, ArrowDownLeft, Send, Sparkles, Plus,
  Trash2, FileCheck2, UserPlus, UploadCloud, Smartphone, CreditCard,
  CheckCircle2, ShieldAlert, BadgeInfo, Copy, Check, ZoomIn, ZoomOut, Move, ShoppingBag
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

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

export default function DistributorPortal({ addNotification }: { addNotification: any }) {
  const { user, userProfile, distributorProfile, wallet, logout } = useAuth();

  const [activePanel, setActivePanel] = useState<"dashboard" | "genealogy" | "wallet" | "orders" | "referral" | "kyc">("dashboard");
  const [payoutProvider, setPayoutProvider] = useState<"mtn_momo" | "orange_money">("mtn_momo");
  const [payoutPhone, setPayoutPhone] = useState("");
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [sponsorReferralCode, setSponsorReferralCode] = useState("");
  const [newMemberName, setNewMemberName] = useState("");
  const [kycFile, setKycFile] = useState<File | null>(null);
  const [kycLoading, setKycLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [downlineList, setDownlineList] = useState<any[]>([]);

  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Initial data fetch + realtime subscriptions
  useEffect(() => {
    if (!user || !distributorProfile) return;

    const sponsorCode = distributorProfile.distributorCode;
    const userId = user.id;

    // --- Initial Fetches ---
    const loadData = async () => {
      const [downlineRes, txRes, commissionsRes] = await Promise.all([
        supabase.from("distributors").select("*").eq("sponsor_id", sponsorCode),
        supabase.from("wallet_transactions").select("*").eq("wallet_id", userId).order("created_at", { ascending: false }),
        supabase.from("commissions").select("*").eq("distributor_id", userId).order("created_at", { ascending: false }),
      ]);

      if (downlineRes.data) {
        setDownlineList(downlineRes.data.map((d) => ({
          uid: d.id,
          distributorCode: d.distributor_code,
          rank: d.rank,
          sponsorId: d.sponsor_id,
        })));
      }

      if (txRes.data) {
        setTransactions(txRes.data.map((t) => ({
          id: t.id,
          type: t.type,
          amountXaf: t.amount_xaf,
          description: t.description,
          createdAt: t.created_at,
        })));
      }

      if (commissionsRes.data) {
        setOrders(commissionsRes.data.map((c) => ({
          id: c.id,
          amountXaf: c.amount_xaf ?? 55000,
          pvPoints: c.level === 0 ? 100 : 50,
          status: "processed",
          createdAt: c.created_at,
        })));
      }
    };

    loadData();

    // --- Realtime Channels ---
    const channel = supabase
      .channel(`portal-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "distributors", filter: `sponsor_id=eq.${sponsorCode}` },
        async () => {
          const { data } = await supabase.from("distributors").select("*").eq("sponsor_id", sponsorCode);
          if (data) {
            setDownlineList(data.map((d) => ({
              uid: d.id,
              distributorCode: d.distributor_code,
              rank: d.rank,
              sponsorId: d.sponsor_id,
            })));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wallet_transactions", filter: `wallet_id=eq.${userId}` },
        async () => {
          const { data } = await supabase.from("wallet_transactions").select("*").eq("wallet_id", userId).order("created_at", { ascending: false });
          if (data) {
            setTransactions(data.map((t) => ({
              id: t.id,
              type: t.type,
              amountXaf: t.amount_xaf,
              description: t.description,
              createdAt: t.created_at,
            })));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "commissions", filter: `distributor_id=eq.${userId}` },
        async () => {
          const { data } = await supabase.from("commissions").select("*").eq("distributor_id", userId).order("created_at", { ascending: false });
          if (data) {
            setOrders(data.map((c) => ({
              id: c.id,
              amountXaf: c.amount_xaf ?? 55000,
              pvPoints: c.level === 0 ? 100 : 50,
              status: "processed",
              createdAt: c.created_at,
            })));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, distributorProfile?.distributorCode]);

  // Handle mobile money withdrawal cashouts
  const handlePayoutSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !wallet) return;

    const amountNum = parseInt(payoutAmount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    if (amountNum > wallet.balanceXaf) {
      addNotification("Insufficient wallet balance for this withdrawal request.", "info");
      return;
    }

    if (amountNum < 2000) {
      addNotification("Minimum withdrawal limit is 2,000 XAF.", "info");
      return;
    }

    setPayoutLoading(true);

    try {
      // Route through authenticated server endpoint — prevents IDOR and wallet tampering
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("No active session token.");

      const res = await fetch("/api/payment/payout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          amountXaf: amountNum,
          phone: payoutPhone,
          provider: payoutProvider,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Payout request failed.");

      addNotification(`Cashout Request logged! ${amountNum.toLocaleString()} XAF pending MeSomb handshake.`, "success");
      setPayoutAmount("");
      setPayoutPhone("");
    } catch (err: any) {
      console.error(err);
      addNotification("Error logging withdrawal request.", "info");
    } finally {
      setPayoutLoading(false);
    }
  };

  // Sponsoring a new downline member
  const handleAddMember = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !distributorProfile || !newMemberName.trim()) return;

    try {
      // Route through server endpoint — uses admin SDK to create a valid auth user
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("No active session token.");

      const res = await fetch("/api/distributor/add-downline", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          memberName: newMemberName,
          sponsorCode: distributorProfile.distributorCode,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add downline member.");

      addNotification(`New member ${newMemberName} added directly to your matrix tree! Code: ${data.distributorCode}`, "success");
      setNewMemberName("");
    } catch (err: any) {
      console.error(err);
      addNotification("Error creating downline member.", "info");
    }
  };

  // KYC Identity upload
  const handleKycUploadChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setKycFile(file);
      setKycLoading(true);

      try {
        const docId = `kyc-${user?.id}`;
        const { error: kycError } = await supabase.from("kyc_documents").upsert({
          id: docId,
          distributor_id: user?.id,
          document_type: "National ID Card / Passport",
          file_url: `https://auyjxchghtetxpiyecds.supabase.co/storage/v1/object/public/kyc/${user?.id}/${file.name}`,
          status: "pending",
        });

        if (kycError) throw kycError;

        // Update KYC status on distributor record
        await supabase
          .from("distributors")
          .update({ kyc_status: "pending" })
          .eq("id", user?.id);

        addNotification("Identity document uploaded. Pending Admin Audit review.", "success");
      } catch (err: any) {
        console.error(err);
        addNotification("Verification upload failed.", "info");
      } finally {
        setKycLoading(false);
      }
    }
  };

  const copyReferralLink = () => {
    if (!distributorProfile) return;
    const link = `https://songtailife.cm/join?ref=${distributorProfile.distributorCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    addNotification("Referral Link copied to clipboard!", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMouseDown = (e: MouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX - panX, y: e.clientY - panY };
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    setPanX(e.clientX - dragStart.current.x);
    setPanY(e.clientY - dragStart.current.y);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 py-12 font-sans relative select-none text-left">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">

        {/* Portal Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pb-6 border-b border-stone-850">
          <div>
            <span className="text-xs uppercase tracking-widest text-[#ecc246] font-bold">Luminous Network Management</span>
            <h1 className="font-sans font-extrabold text-3xl text-white mt-1">Distributor Operations</h1>
            <p className="text-stone-400 text-sm mt-1">Configure compliance settings, monitor commission balances, and track matrix downline structures.</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={logout}
              className="px-4 py-2 border border-stone-800 hover:border-red-900/40 text-stone-400 hover:text-red-400 text-xs font-semibold rounded-xl transition-all cursor-pointer bg-stone-900/35"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Floating KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Wallet Balance Card */}
          <div className="bg-gradient-to-b from-stone-900 to-stone-950 border border-stone-850 rounded-[24px] p-6 relative overflow-hidden text-left">
            <div className="absolute top-4 right-4 p-2 bg-[#0A7D32]/10 rounded-xl text-[#ecc246]">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-stone-400 text-xs font-semibold uppercase">Wallet Balance</span>
            <span className="block text-3xl font-black text-white mt-2">
              {(wallet?.balanceXaf || 0).toLocaleString()} <span className="text-xs text-[#ecc246] font-normal">XAF</span>
            </span>
            <div className="flex items-center gap-1.5 mt-4 text-[11px] text-[#ecc246] font-bold">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              Sovereign Balance Ready
            </div>
          </div>

          {/* Direct Downlines Card */}
          <div className="bg-gradient-to-b from-stone-900 to-stone-950 border border-stone-850 rounded-[24px] p-6 relative overflow-hidden text-left">
            <div className="absolute top-4 right-4 p-2 bg-[#0A7D32]/10 rounded-xl text-emerald-400">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-stone-400 text-xs font-semibold uppercase">Direct Downlines</span>
            <span className="block text-3xl font-black text-white mt-2">
              {downlineList.length} <span className="text-xs text-stone-400 font-normal">Members</span>
            </span>
            <div className="flex items-center gap-1 mt-4 text-[11px] text-stone-400">
              <Plus className="w-3.5 h-3.5" />
              Real-time unilevel placement
            </div>
          </div>

          {/* Code Card */}
          <div className="bg-gradient-to-b from-stone-900 to-stone-950 border border-stone-850 rounded-[24px] p-6 relative overflow-hidden text-left">
            <div className="absolute top-4 right-4 p-2 bg-[#0A7D32]/10 rounded-xl text-[#ecc246]">
              <Award className="w-5 h-5" />
            </div>
            <span className="text-stone-400 text-xs font-semibold uppercase">Sponsor ID</span>
            <span className="block text-2xl font-black text-white mt-2 font-mono">
              {distributorProfile?.distributorCode || "PENDING"}
            </span>
            <div className="flex items-center gap-1 mt-4 text-[11px] text-emerald-400 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#ecc246]" />
              Sovereign Rank: {distributorProfile?.rank || "Bronze"}
            </div>
          </div>

          {/* Compliance Status Card */}
          <div
            onClick={() => setActivePanel("kyc")}
            className="bg-gradient-to-b from-stone-900 to-stone-950 border border-stone-850 rounded-[24px] p-6 relative overflow-hidden text-left cursor-pointer hover:border-[#0A7D32]/40 transition-all group"
          >
            <div className="absolute top-4 right-4 p-2 bg-[#0A7D32]/10 rounded-xl text-[#ecc246] group-hover:scale-110 transition-transform">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <span className="text-stone-400 text-xs font-semibold uppercase">KYC Status</span>
            <span className="block text-xl font-extrabold mt-2 capitalize text-white">
              {distributorProfile?.kycStatus === "verified" ? (
                <span className="text-emerald-400 font-black flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-400 stroke-[3]" /> Verified
                </span>
              ) : distributorProfile?.kycStatus === "pending" ? (
                <span className="text-amber-400 font-black flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" /> Pending
                </span>
              ) : distributorProfile?.kycStatus === "rejected" ? (
                <span className="text-red-400 font-black flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-red-400" /> Rejected
                </span>
              ) : (
                <span className="text-stone-500 font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-stone-500" /> Unverified
                </span>
              )}
            </span>
            <div className="flex items-center gap-1 mt-4 text-[11px] text-stone-500 group-hover:text-stone-300 transition-colors">
              {distributorProfile?.kycStatus === "rejected"
                ? "Click to re-upload document"
                : "Click to view compliance tab"}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2.5 overflow-x-auto border-b border-stone-850/60 pb-3">
          {[
            { id: "dashboard", label: "Dashboard", icon: <Award className="w-4 h-4" /> },
            { id: "genealogy", label: "Genealogy Matrix", icon: <Users className="w-4 h-4" /> },
            { id: "wallet", label: "Wallet Ledger", icon: <Wallet className="w-4 h-4" /> },
            { id: "orders", label: "Own purchases", icon: <ShoppingBag className="w-4 h-4" /> },
            { id: "referral", label: "Referral Tools", icon: <Sparkles className="w-4 h-4" /> },
            { id: "kyc", label: "Compliance (KYC)", icon: <FileCheck2 className="w-4 h-4" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActivePanel(tab.id as any)}
              className={`flex items-center gap-2 px-4.5 py-3.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activePanel === tab.id
                  ? "bg-[#0A7D32]/15 border border-[#0A7D32]/50 text-emerald-400 font-extrabold shadow-lg"
                  : "bg-stone-900 border border-stone-850/60 text-stone-400 hover:text-white"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* 1. DASHBOARD VIEW */}
        {activePanel === "dashboard" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-8">
              <div className="p-8 bg-gradient-to-r from-stone-900 to-stone-950 border border-stone-850 rounded-[32px] relative overflow-hidden">
                <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-emerald-900/10 rounded-full blur-3xl pointer-events-none" />
                <h3 className="font-sans font-black text-2xl text-white">Sovereign Growth, {userProfile?.email.split("@")[0]}</h3>
                <p className="text-stone-400 text-sm mt-2 max-w-lg leading-relaxed">
                  Your team volume overrides and commissions are calculating live using the unilevel integration logic.
                </p>

                {distributorProfile?.kycStatus === "verified" ? (
                  <div className="mt-6 p-4 bg-emerald-950/30 border border-emerald-900/40 rounded-2xl flex items-center justify-between gap-3 text-xs text-emerald-400">
                    <div className="flex gap-3">
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
                      <div>
                        <strong className="block text-white font-bold mb-0.5">Sovereign Profile Fully Verified</strong>
                        <p className="text-stone-400">Your profile is compliant with CEMAC and Cameroon cybersecurity mandates (Law No. 2010/012).</p>
                      </div>
                    </div>
                    <span className="hidden sm:inline-block px-2.5 py-1 bg-emerald-950/60 border border-emerald-800 text-emerald-400 text-[10px] font-black uppercase rounded-lg">Compliant</span>
                  </div>
                ) : distributorProfile?.kycStatus === "pending" ? (
                  <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-300">
                    <div className="flex gap-3">
                      <ShieldAlert className="w-5 h-5 flex-shrink-0 text-amber-400 animate-pulse" />
                      <div>
                        <strong className="block text-white font-bold mb-0.5">Verification In Progress</strong>
                        <p className="text-stone-400">Our administrative compliance team is currently auditing your submitted document files.</p>
                      </div>
                    </div>
                    <span className="hidden sm:inline-block px-2.5 py-1 bg-amber-950/60 border border-amber-800 text-amber-400 text-[10px] font-black uppercase rounded-lg">Under Review</span>
                  </div>
                ) : distributorProfile?.kycStatus === "rejected" ? (
                  <div className="mt-6 p-4 bg-red-950/40 border border-red-900/50 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-red-400">
                    <div className="flex gap-3">
                      <ShieldAlert className="w-5 h-5 flex-shrink-0 text-red-500" />
                      <div>
                        <strong className="block text-white font-bold mb-0.5">KYC Document Rejected</strong>
                        <p className="text-stone-400">Your submission was disapproved. Please upload a high-resolution identity document.</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActivePanel("kyc")}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-colors flex-shrink-0 text-center"
                    >
                      Re-upload Document
                    </button>
                  </div>
                ) : (
                  <div className="mt-6 p-4 bg-stone-900/80 border border-stone-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-stone-300">
                    <div className="flex gap-3">
                      <BadgeInfo className="w-5 h-5 flex-shrink-0 text-emerald-500" />
                      <div>
                        <strong className="block text-white font-bold mb-0.5">KYC Verification Required</strong>
                        <p className="text-stone-400">Upload your national CNI card or Passport to unlock full unilevel withdrawal privileges.</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActivePanel("kyc")}
                      className="px-4 py-2 bg-[#0A7D32] hover:bg-[#086327] text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-colors flex-shrink-0 text-center"
                    >
                      Verify Now
                    </button>
                  </div>
                )}
              </div>

              {/* Recent Commissions */}
              <div className="bg-stone-900/40 border border-stone-850 rounded-[32px] p-6">
                <h4 className="font-sans font-bold text-lg text-white mb-6 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-400" /> Recent Volume Commission Overrides
                </h4>
                <div className="divide-y divide-stone-850/60">
                  {transactions.filter(t => t.type === "commission").length === 0 ? (
                    <div className="py-12 text-center text-stone-500 text-xs">
                      No volume overrides processed yet. Commissions accumulate as your team buys products!
                    </div>
                  ) : (
                    transactions.filter(t => t.type === "commission").map(tx => (
                      <div key={tx.id} className="py-4 flex justify-between items-center text-xs">
                        <div>
                          <span className="font-bold text-white block">{tx.description}</span>
                          <span className="text-stone-500 font-mono block mt-0.5">Reference ID: {tx.id}</span>
                        </div>
                        <span className="font-extrabold text-emerald-400 text-sm">
                          + {tx.amountXaf.toLocaleString()} XAF
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Sponsor Member Form */}
            <div className="lg:col-span-4">
              <div className="bg-gradient-to-b from-stone-900 to-stone-950 border border-stone-850 rounded-[32px] p-6 space-y-6">
                <h4 className="font-sans font-bold text-lg text-white">Sponsor Downline Member</h4>
                <p className="text-stone-400 text-xs leading-relaxed">
                  Register a recruit directly to your team matrix structure. They will generate commissions into your active ledger instantly.
                </p>
                <form onSubmit={handleAddMember} className="space-y-4">
                  <div>
                    <label className="text-stone-400 text-xs block mb-1.5 font-bold">Recruit's Full Name</label>
                    <input
                      type="text"
                      required
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      placeholder="e.g. Samuel Eto'o"
                      className="w-full px-4 py-3 bg-stone-950 border border-stone-850 focus:border-[#0A7D32] focus:ring-1 focus:ring-[#0A7D32] rounded-xl text-stone-200 placeholder-stone-700 text-xs outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 bg-[#0A7D32] hover:bg-[#086327] text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4 text-[#ecc246]" />
                    Register Directly Under Me
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* 2. GENEALOGY MATRIX TREE VIEW */}
        {activePanel === "genealogy" && (
          <div className="bg-stone-900/40 border border-stone-850 rounded-[32px] p-6 flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 border-b border-stone-850/60 pb-4">
              <div>
                <h3 className="font-sans font-bold text-lg text-white">Unilevel Genealogy Map</h3>
                <p className="text-stone-500 text-xs mt-0.5">Zoom (+ / -) and drag to pan across your network structure.</p>
              </div>
              <div className="flex gap-2.5">
                <button onClick={() => { setZoom(prev => Math.min(prev + 0.1, 1.5)) }} className="p-2.5 bg-stone-950 border border-stone-850 rounded-lg hover:border-emerald-500 text-stone-400 hover:text-white cursor-pointer"><ZoomIn className="w-4 h-4" /></button>
                <button onClick={() => { setZoom(prev => Math.max(prev - 0.1, 0.5)) }} className="p-2.5 bg-stone-950 border border-stone-850 rounded-lg hover:border-emerald-500 text-stone-400 hover:text-white cursor-pointer"><ZoomOut className="w-4 h-4" /></button>
                <button onClick={() => { setPanX(0); setPanY(0); setZoom(1); }} className="px-3.5 py-2.5 bg-stone-950 border border-stone-850 rounded-lg text-xs font-bold text-stone-400 hover:text-white cursor-pointer">Reset View</button>
              </div>
            </div>

            <div
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="relative w-full min-h-[460px] bg-stone-950 rounded-2xl border border-stone-850/60 overflow-hidden cursor-grab active:cursor-grabbing flex items-center justify-center"
            >
              <div
                style={{
                  transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
                  transformOrigin: "center center",
                  transition: isDragging ? "none" : "transform 0.1s ease-out"
                }}
                className="absolute"
              >
                <svg width="600" height="400" className="overflow-visible">
                  {downlineList.map((node, index) => {
                    const startX = 300;
                    const startY = 80;
                    const total = downlineList.length;
                    const spacing = 150;
                    const endX = 300 + (index - (total - 1) / 2) * spacing;
                    const endY = 250;
                    return (
                      <path
                        key={node.uid}
                        d={`M ${startX} ${startY} C ${startX} ${(startY + endY) / 2}, ${endX} ${(startY + endY) / 2}, ${endX} ${endY}`}
                        stroke="#0A7D32"
                        strokeWidth="2.5"
                        fill="none"
                        opacity="0.6"
                      />
                    );
                  })}

                  <g transform="translate(300, 80)">
                    <rect x="-90" y="-30" width="180" height="60" rx="14" fill="#0A7D32" fillOpacity="0.1" stroke="#0A7D32" strokeWidth="2" />
                    <text x="0" y="-8" textAnchor="middle" fill="#white" fontSize="11" fontWeight="bold">You (Sovereign Root)</text>
                    <text x="0" y="8" textAnchor="middle" fill="#ecc246" fontSize="9" fontWeight="bold">{distributorProfile?.distributorCode}</text>
                    <text x="0" y="20" textAnchor="middle" fill="#888" fontSize="8" fontWeight="bold">Rank: {distributorProfile?.rank}</text>
                  </g>

                  {downlineList.map((node, index) => {
                    const total = downlineList.length;
                    const spacing = 150;
                    const endX = 300 + (index - (total - 1) / 2) * spacing;
                    const endY = 250;
                    return (
                      <g key={node.uid} transform={`translate(${endX}, ${endY})`}>
                        <rect x="-80" y="-30" width="160" height="60" rx="12" fill="#1c1917" stroke="#ecc246" strokeWidth="1.5" strokeOpacity="0.7" />
                        <text x="0" y="-8" textAnchor="middle" fill="#white" fontSize="10" fontWeight="bold">Downline Recruit</text>
                        <text x="0" y="8" textAnchor="middle" fill="#ecc246" fontSize="9" fontWeight="bold" fontFamily="monospace">{node.distributorCode}</text>
                        <text x="0" y="20" textAnchor="middle" fill="#777" fontSize="8" fontWeight="bold">Rank: Bronze</text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {downlineList.length === 0 && (
                <div className="absolute inset-0 bg-stone-950/85 flex flex-col items-center justify-center p-6 text-center space-y-3">
                  <Users className="w-10 h-10 text-stone-700" />
                  <div>
                    <h5 className="font-bold text-white text-sm">No downlines registered yet</h5>
                    <p className="text-stone-500 text-xs mt-1">Copy your referral credentials to initiate your unilevel network matrix!</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. WALLET LEDGER VIEW */}
        {activePanel === "wallet" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 bg-stone-900/40 border border-stone-850 rounded-[32px] p-6">
              <h3 className="font-sans font-bold text-lg text-white mb-6 flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-400" /> MeSomb Transaction Ledger
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-stone-400">
                  <thead className="text-[10px] uppercase bg-stone-950 border-b border-stone-850/80 text-stone-500 font-bold">
                    <tr>
                      <th className="px-6 py-4">Transaction ID</th>
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4">Description</th>
                      <th className="px-6 py-4">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-850/60">
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-stone-500 text-xs">
                          No transactions completed on this unilevel profile.
                        </td>
                      </tr>
                    ) : (
                      transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-stone-900/20 transition-all">
                          <td className="px-6 py-4 font-mono text-[10px] font-semibold text-stone-500">{tx.id}</td>
                          <td className="px-6 py-4 uppercase font-bold">
                            {tx.type === "commission" ? (
                              <span className="text-[#ecc246] flex items-center gap-1">
                                <ArrowUpRight className="w-3.5 h-3.5" /> Earned
                              </span>
                            ) : (
                              <span className="text-red-400 flex items-center gap-1">
                                <ArrowDownLeft className="w-3.5 h-3.5" /> Payout
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-white text-xs font-medium">{tx.description}</td>
                          <td className={`px-6 py-4 font-extrabold text-xs ${tx.type === "commission" ? "text-emerald-400" : "text-stone-300"}`}>
                            {tx.type === "commission" ? "+" : "-"} {tx.amountXaf.toLocaleString()} XAF
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Withdrawal Form */}
            <div className="lg:col-span-4 bg-gradient-to-b from-stone-900 to-stone-950 border border-stone-850 rounded-[32px] p-6">
              <span className="text-xs uppercase tracking-widest text-[#ecc246] font-bold">MeSomb Gateway</span>
              <h3 className="font-sans font-bold text-lg text-white mt-1">Request Mobile Money Cashout</h3>
              <form onSubmit={handlePayoutSubmit} className="mt-6 space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setPayoutProvider("mtn_momo")} className={`p-3.5 rounded-xl border text-xs font-bold transition-all ${payoutProvider === "mtn_momo" ? "bg-yellow-500/10 border-yellow-500 text-yellow-500" : "bg-stone-950 border-stone-850 text-stone-400"}`}>MTN MoMo</button>
                  <button type="button" onClick={() => setPayoutProvider("orange_money")} className={`p-3.5 rounded-xl border text-xs font-bold transition-all ${payoutProvider === "orange_money" ? "bg-orange-500/10 border-orange-500 text-orange-500" : "bg-stone-950 border-stone-850 text-stone-400"}`}>Orange Money</button>
                </div>
                <div>
                  <label className="text-stone-400 text-xs block mb-1.5 font-bold">Cameroon Phone Number</label>
                  <div className="relative">
                    <Smartphone className="absolute left-3.5 top-3.5 w-4 h-4 text-stone-600" />
                    <input type="tel" required value={payoutPhone} onChange={(e) => setPayoutPhone(e.target.value)} placeholder="+237 6xx xxx xxx" className="w-full pl-10 pr-4 py-3 bg-stone-950 border border-stone-850 focus:border-[#0A7D32] focus:ring-1 focus:ring-[#0A7D32] rounded-xl text-stone-200 placeholder-stone-700 text-xs outline-none" />
                  </div>
                </div>
                <div>
                  <label className="text-stone-400 text-xs block mb-1.5 font-bold">Cashout Amount (XAF)</label>
                  <div className="relative">
                    <CreditCard className="absolute left-3.5 top-3.5 w-4 h-4 text-stone-600" />
                    <input type="number" required value={payoutAmount} onChange={(e) => setPayoutAmount(e.target.value)} placeholder="e.g. 5000" className="w-full pl-10 pr-4 py-3 bg-stone-950 border border-stone-850 focus:border-[#0A7D32] focus:ring-1 focus:ring-[#0A7D32] rounded-xl text-stone-200 placeholder-stone-700 text-xs outline-none" />
                  </div>
                </div>
                <button type="submit" disabled={payoutLoading} className="w-full py-3 bg-[#0A7D32] hover:bg-[#086327] text-white font-bold text-xs rounded-xl shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                  {payoutLoading ? (
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <><Send className="w-4 h-4 text-[#ecc246]" /><span>Initiate MeSomb Cashout</span></>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* 4. ORDERS HISTORY VIEW */}
        {activePanel === "orders" && (
          <div className="bg-stone-900/40 border border-stone-850 rounded-[32px] p-6">
            <h3 className="font-sans font-bold text-lg text-white mb-6 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-emerald-400" /> My Purchases History
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-400">
                <thead className="text-[10px] uppercase bg-stone-950 border-b border-stone-850/80 text-stone-500 font-bold">
                  <tr>
                    <th className="px-6 py-4">Order Reference</th>
                    <th className="px-6 py-4">Total Amount (XAF)</th>
                    <th className="px-6 py-4">PV Points Awarded</th>
                    <th className="px-6 py-4">Compliance Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-850/60">
                  {orders.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-12 text-center text-stone-500 text-xs">No purchases registered yet. Shop products on the store!</td></tr>
                  ) : (
                    orders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-stone-900/20 transition-all">
                        <td className="px-6 py-4 font-mono text-[10px] text-white">{ord.id}</td>
                        <td className="px-6 py-4 font-bold text-white">{ord.amountXaf.toLocaleString()} XAF</td>
                        <td className="px-6 py-4 text-[#ecc246] font-bold">+{ord.pvPoints} PV</td>
                        <td className="px-6 py-4"><span className="px-2 py-0.5 bg-emerald-950/40 border border-emerald-900/30 text-emerald-400 rounded-full text-[9px] uppercase font-bold">Processed</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 5. REFERRAL TOOLS VIEW */}
        {activePanel === "referral" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-stone-900/40 border border-stone-850 rounded-[32px] p-8 flex flex-col justify-between space-y-6 text-left">
              <div>
                <span className="text-xs uppercase tracking-widest text-[#ecc246] font-bold">Unilevel Recruitment Link</span>
                <h3 className="font-sans font-bold text-xl text-white mt-1">Share Your Referral ID</h3>
                <p className="text-stone-400 text-xs leading-relaxed mt-2">
                  Recruiters gain 10% on direct sales volume plus team matrix overriding overrides.
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-stone-500 text-[10px] font-bold uppercase block mb-1">My Distributor Code</label>
                  <div className="p-4 bg-stone-950 rounded-xl border border-stone-850 flex justify-between items-center font-mono text-sm font-bold text-white">
                    <span>{distributorProfile?.distributorCode}</span>
                    <button onClick={copyReferralLink} className="p-1.5 hover:bg-stone-900 rounded-lg text-[#ecc246] cursor-pointer">
                      {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-stone-500 text-[10px] font-bold uppercase block mb-1">Referral Registration URL</label>
                  <div className="p-4 bg-stone-950 rounded-xl border border-stone-850 flex justify-between items-center text-xs text-stone-300">
                    <span className="truncate mr-3">songtailife.cm/join?ref={distributorProfile?.distributorCode}</span>
                    <button onClick={copyReferralLink} className="p-1.5 hover:bg-stone-900 rounded-lg text-[#ecc246] cursor-pointer">
                      {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-stone-900 border border-stone-850 rounded-[32px] p-8 flex flex-col items-center justify-center text-center space-y-4">
              <span className="text-xs uppercase tracking-widest text-[#ecc246] font-bold">Luminous QR Code</span>
              <div className="p-4 bg-white/5 rounded-3xl border border-stone-800">
                <QRCodeSVG
                  value={`https://songtailife.cm/join?ref=${distributorProfile?.distributorCode}`}
                  size={160}
                  fgColor="#ecc246"
                  bgColor="transparent"
                />
              </div>
              <div>
                <h5 className="font-bold text-white text-xs mt-2">Instant Scan Recruitment</h5>
                <p className="text-stone-500 text-[10px] mt-1">Let recruits scan this vector asset to initiate placement directly under your tree.</p>
              </div>
            </div>
          </div>
        )}

        {/* 6. KYC COMPLIANCE VIEW */}
        {activePanel === "kyc" && (
          <div className="bg-stone-900/40 border border-stone-850 rounded-[32px] p-8 max-w-2xl mx-auto text-left space-y-6">
            <div>
              <span className="text-xs uppercase tracking-widest text-[#ecc246] font-bold">CEMAC Health & Network Compliance</span>
              <h3 className="font-sans font-bold text-xl text-white mt-1">Verify Identity Document</h3>
              <p className="text-stone-400 text-xs leading-relaxed mt-1.5">
                Upload your Cameroon CNI card or National Passport. Verified users unlock maximum MeSomb unilevel payout privileges.
              </p>
            </div>

            <div className="border border-stone-850 bg-stone-950 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-4 relative">
              {distributorProfile?.kycStatus === "verified" ? (
                <div className="space-y-2">
                  <Check className="w-12 h-12 text-[#ecc246] mx-auto p-2 bg-[#0A7D32]/10 rounded-full" />
                  <h4 className="font-bold text-white text-sm">Compliance Completed Successfully</h4>
                  <p className="text-stone-500 text-xs">Your passport has been validated by corporate operations.</p>
                </div>
              ) : distributorProfile?.kycStatus === "pending" ? (
                <div className="space-y-2">
                  <span className="w-10 h-10 border-4 border-[#ecc246] border-t-transparent rounded-full animate-spin inline-block mx-auto" />
                  <h4 className="font-bold text-white text-sm">Identity Auditing In Progress</h4>
                  <p className="text-stone-500 text-xs">Operations team is verifying document parameters. Expect 24 hour SLA.</p>
                </div>
              ) : (
                <div className="w-full space-y-4">
                  {distributorProfile?.kycStatus === "rejected" && (
                    <div className="p-4 bg-red-950/25 border border-red-900/50 rounded-xl text-xs text-red-400 text-left flex gap-3">
                      <ShieldAlert className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" />
                      <div>
                        <strong className="block text-white font-bold mb-0.5">Verification Disapproved</strong>
                        Your previously uploaded document was rejected. Please upload a high-resolution, clear copy.
                      </div>
                    </div>
                  )}
                  <label className="w-full flex flex-col items-center justify-center p-8 border-2 border-dashed border-stone-800 hover:border-[#0A7D32]/40 rounded-2xl cursor-pointer transition-all">
                    <UploadCloud className="w-10 h-10 text-stone-500 mb-2" />
                    <span className="text-xs font-bold text-white block">Upload identity card / passport document</span>
                    <span className="text-[10px] text-stone-600 block mt-1">Accepts PNG, JPG or PDF up to 10MB</span>
                    <input type="file" onChange={handleKycUploadChange} className="hidden" />
                  </label>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
