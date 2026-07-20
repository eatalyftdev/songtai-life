import { useState, useEffect, FormEvent, ReactNode } from "react";
import {
  Zap, AlertTriangle, User, Phone, Mail, Package, GitBranch,
  Copy, Check, Eye, EyeOff, Shield, Info, Search
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import PageShell, { Card, Btn } from "../shared/PageShell";

// ── Pack tiers (mirrors BecomeDistributor.tsx) ────────────────────────────────
const PACK_TIERS = [
  { key: "bronze",   label: "Bronze Pack",   price_xaf: 25_000,  pv: 50   },
  { key: "silver",   label: "Silver Pack",   price_xaf: 75_000,  pv: 150  },
  { key: "gold",     label: "Gold Pack",     price_xaf: 180_000, pv: 350  },
  { key: "platinum", label: "Platinum Pack", price_xaf: 350_000, pv: 700  },
  { key: "vip",      label: "VIP Pack",      price_xaf: 600_000, pv: 1200 },
];

interface DistResult {
  success: boolean;
  userId: string;
  distributorCode: string;
  tempPassword: string;
  email: string;
  placementId: string | null;
  placementLeg: "left" | "right";
  sponsorCode: string | null;
  note: string;
}

interface SponsorSuggestion {
  id: string;
  code: string;
  name: string;
  rank: string;
  status: string;
}

function Label({ children }: { children: ReactNode }) {
  return <label className="block text-xs font-semibold text-stone-400 mb-1">{children}</label>;
}

function Input({
  value, onChange, placeholder = "", type = "text", disabled = false, mono = false
}: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  type?: string; disabled?: boolean; mono?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={`w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-stone-600 focus:outline-none focus:border-emerald-600 transition-colors disabled:opacity-50 ${mono ? "font-mono text-[13px]" : ""}`}
    />
  );
}

function FormSection({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 pb-1 border-b border-stone-800">
        <span className="text-stone-500">{icon}</span>
        <span className="text-[11px] font-bold uppercase tracking-widest text-stone-500">{title}</span>
      </div>
      {children}
    </div>
  );
}

export default function GodModeDistributorPage() {
  const { session } = useAuth();

  // ── Form state ─────────────────────────────────────────────────────────────
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [packTier, setPackTier] = useState("bronze");
  const [sponsorSearch, setSponsorSearch] = useState("");
  const [sponsorCode, setSponsorCode] = useState("");
  const [placementLeg, setPlacementLeg] = useState<"auto" | "left" | "right">("auto");
  const [commissionAck, setCommissionAck] = useState(false);

  // ── Sponsor search state ───────────────────────────────────────────────────
  const [sponsorSuggestions, setSponsorSuggestions] = useState<SponsorSuggestion[]>([]);
  const [sponsorSearching, setSponsorSearching] = useState(false);
  const [sponsorDropdownOpen, setSponsorDropdownOpen] = useState(false);
  const [selectedSponsor, setSelectedSponsor] = useState<SponsorSuggestion | null>(null);

  // ── Submission state ───────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<DistResult | null>(null);
  const [pwVisible, setPwVisible] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // ── Sponsor search ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (sponsorSearch.length < 2) { setSponsorSuggestions([]); setSponsorDropdownOpen(false); return; }
    const t = setTimeout(async () => {
      setSponsorSearching(true);
      try {
        const res = await fetch(`/api/admin/distributors/search?q=${encodeURIComponent(sponsorSearch)}`, {
          headers: { Authorization: `Bearer ${session?.access_token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setSponsorSuggestions(data);
          setSponsorDropdownOpen(true);
        }
      } finally {
        setSponsorSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [sponsorSearch, session?.access_token]);

  const selectSponsor = (s: SponsorSuggestion) => {
    setSelectedSponsor(s);
    setSponsorCode(s.code);
    setSponsorSearch(`${s.name} (${s.code})`);
    setSponsorDropdownOpen(false);
  };

  const clearSponsor = () => {
    setSelectedSponsor(null);
    setSponsorCode("");
    setSponsorSearch("");
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!commissionAck) {
      setError("You must acknowledge the commission business-rule question before proceeding.");
      return;
    }
    if (!displayName.trim() || !phone.trim()) {
      setError("Full name and phone are required.");
      return;
    }

    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/distributor/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          displayName: displayName.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          packTier,
          sponsorCode: sponsorCode || undefined,
          placementLeg,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to create distributor.");
        return;
      }
      setResult(json);
    } catch (err: any) {
      setError(err.message ?? "Unexpected error.");
    } finally {
      setSaving(false);
    }
  };

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const reset = () => {
    setResult(null);
    setDisplayName(""); setPhone(""); setEmail(""); setPackTier("bronze");
    setSponsorSearch(""); setSponsorCode(""); setSelectedSponsor(null);
    setPlacementLeg("auto"); setCommissionAck(false); setError("");
  };

  const selectedPack = PACK_TIERS.find(p => p.key === packTier)!;

  // ── Success screen ─────────────────────────────────────────────────────────
  if (result) {
    return (
      <PageShell title="Distributor Created" subtitle="Account is live immediately — credentials below.">
        <Card className="max-w-2xl mx-auto">
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-3 p-4 bg-emerald-950/40 border border-emerald-800/40 rounded-2xl">
              <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
                <Check className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">Distributor account created</p>
                <p className="text-emerald-400 text-xs font-mono">{result.distributorCode}</p>
              </div>
            </div>

            {/* Credentials panel */}
            <div className="space-y-3">
              <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Login Credentials</p>

              <div className="space-y-2">
                {[
                  { label: "Email", value: result.email, key: "email" },
                  { label: "Distributor Code", value: result.distributorCode, key: "code" },
                  { label: "Placement", value: `Under ${result.placementId ?? "root"} — ${result.placementLeg} leg`, key: "placement" },
                ].map(row => (
                  <div key={row.key} className="flex items-center justify-between p-3 bg-stone-900 border border-stone-800 rounded-xl">
                    <div>
                      <p className="text-[10px] text-stone-500 font-semibold uppercase">{row.label}</p>
                      <p className="text-sm text-white font-mono">{row.value}</p>
                    </div>
                    <button
                      onClick={() => copy(row.value, row.key)}
                      className="p-2 hover:bg-stone-800 rounded-lg text-stone-500 hover:text-stone-300 transition-colors cursor-pointer"
                    >
                      {copied === row.key ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                ))}

                {/* Password field with visibility toggle */}
                <div className="flex items-center justify-between p-3 bg-stone-900 border border-amber-800/40 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-amber-500 font-semibold uppercase">Temporary Password</p>
                    <p className="text-sm text-white font-mono truncate">
                      {pwVisible ? result.tempPassword : "•".repeat(result.tempPassword.length)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => setPwVisible(v => !v)}
                      className="p-2 hover:bg-stone-800 rounded-lg text-stone-500 hover:text-stone-300 transition-colors cursor-pointer"
                    >
                      {pwVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => copy(result.tempPassword, "pw")}
                      className="p-2 hover:bg-stone-800 rounded-lg text-stone-500 hover:text-stone-300 transition-colors cursor-pointer"
                    >
                      {copied === "pw" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-xs text-amber-400 flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                This is the only time this temporary password is shown. Credentials were sent via WhatsApp if Twilio is configured.
              </p>
            </div>

            {/* Commission note */}
            <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-xl">
              <p className="text-xs text-amber-300 font-semibold mb-1 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Commission Implications — Confirm with Zayne
              </p>
              <p className="text-xs text-stone-400 leading-relaxed">
                This account was activated without a payment. Whether commissions should be triggered for
                the upline sponsor ({result.sponsorCode ?? "none"}) is a business decision that has not
                been confirmed. Do NOT assume commissions are or aren't applied — resolve with Zayne
                before this account's sponsor expects a payout.
              </p>
            </div>

            {/* Audit note */}
            <div className="p-3 bg-stone-900/60 border border-stone-800 rounded-xl">
              <p className="text-xs text-stone-400 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-stone-500" />
                Full audit log entry written. This creation is recorded as <code className="font-mono bg-stone-800 px-1 rounded text-stone-300">account_source = 'admin_created'</code> and is visible in the Audit Log and in financial reports.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Btn variant="secondary" onClick={reset} className="flex-1">Create Another</Btn>
              <a href="/admin/distributors">
                <Btn variant="primary" onClick={() => {}}>View in Distributors</Btn>
              </a>
            </div>
          </div>
        </Card>
      </PageShell>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  return (
    <PageShell
      title="God Mode — Create Distributor"
      subtitle="Instantly activate a distributor account without going through payment."
    >
      <div className="max-w-2xl mx-auto space-y-6">

        {/* ── CRITICAL WARNING BANNER ── */}
        <div className="flex items-start gap-4 p-5 bg-red-950/40 border-2 border-red-700/50 rounded-2xl">
          <div className="w-10 h-10 rounded-full bg-red-900/60 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div className="space-y-2">
            <p className="text-red-300 font-bold text-sm">High-Privilege Action — Read Before Proceeding</p>
            <ul className="text-xs text-red-300/80 space-y-1 list-disc list-outside ml-3">
              <li>This creates a real, <strong>immediately active</strong> distributor account with no payment collected.</li>
              <li>The account is flagged as <code className="font-mono bg-red-950/60 px-1 rounded">account_source = 'admin_created'</code> in every financial and audit report.</li>
              <li><strong>No payment or order record is created</strong> — this is an explicit admin override, not a disguised sale.</li>
              <li>Every submission is written to the audit log with your admin identity and the full payload.</li>
            </ul>
          </div>
        </div>

        {/* ── COMMISSION QUESTION ── */}
        <div className="flex items-start gap-4 p-5 bg-amber-950/30 border border-amber-700/40 rounded-2xl">
          <Info className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-3">
            <div>
              <p className="text-amber-300 font-bold text-sm">Commission Business Rule — Requires Confirmation from Zayne</p>
              <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                This spec explicitly states: <em>"confirm with Zayne before assuming either way"</em> whether
                admin-created distributors trigger Sponsoring Bonuses for their upline sponsor. This is a
                real-money question that affects other people's payouts. The system currently does{" "}
                <strong className="text-white">NOT</strong> trigger any commission calculation for admin-created
                accounts. If that should change, a developer must implement and enable it explicitly.
              </p>
            </div>
            <label className="flex items-start gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={commissionAck}
                onChange={e => setCommissionAck(e.target.checked)}
                className="mt-0.5 accent-amber-500 cursor-pointer"
              />
              <span className="text-xs text-stone-300 leading-relaxed group-hover:text-white transition-colors">
                I acknowledge that commission implications for this admin-created account have not been confirmed,
                and I will not treat this action as having resolved that question.
              </span>
            </label>
          </div>
        </div>

        {/* ── FORM ── */}
        <form onSubmit={handleSubmit}>
          <Card>
            <div className="p-6 space-y-6">

              <FormSection title="Distributor Details" icon={<User className="w-3.5 h-3.5" />}>
                <div>
                  <Label>Full name *</Label>
                  <Input value={displayName} onChange={setDisplayName} placeholder="Jane Doe" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Phone number *</Label>
                    <Input value={phone} onChange={setPhone} placeholder="+237 6XXXXXXXX" />
                    <p className="text-[10px] text-stone-600 mt-1">Used to send WhatsApp credentials.</p>
                  </div>
                  <div>
                    <Label>Email (optional)</Label>
                    <Input value={email} onChange={setEmail} placeholder="jane@example.com" type="email" />
                    <p className="text-[10px] text-stone-600 mt-1">Auto-generated if left blank.</p>
                  </div>
                </div>
              </FormSection>

              <FormSection title="Pack Tier" icon={<Package className="w-3.5 h-3.5" />}>
                <div className="grid grid-cols-1 gap-2">
                  {PACK_TIERS.map(pack => (
                    <label
                      key={pack.key}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                        packTier === pack.key
                          ? "border-emerald-600 bg-emerald-950/30"
                          : "border-stone-800 bg-stone-900/40 hover:border-stone-700"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="packTier"
                          value={pack.key}
                          checked={packTier === pack.key}
                          onChange={() => setPackTier(pack.key)}
                          className="accent-emerald-600"
                        />
                        <div>
                          <p className="text-sm text-white font-semibold">{pack.label}</p>
                          <p className="text-[10px] text-stone-500">{pack.pv} PV</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-stone-300">
                        {pack.price_xaf.toLocaleString()} XAF
                      </span>
                    </label>
                  ))}
                </div>
                <p className="text-[10px] text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  No payment is collected — this price is for record-keeping only (distinguishable from paid signups).
                </p>
              </FormSection>

              <FormSection title="Placement in Binary Tree" icon={<GitBranch className="w-3.5 h-3.5" />}>
                {/* Sponsor search */}
                <div>
                  <Label>Sponsor (search by name or code)</Label>
                  <div className="relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-500 pointer-events-none" />
                      <input
                        type="text"
                        value={sponsorSearch}
                        onChange={e => { setSponsorSearch(e.target.value); if (selectedSponsor) clearSponsor(); }}
                        placeholder="Search distributor name or code…"
                        className="w-full bg-stone-900 border border-stone-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-stone-600 focus:outline-none focus:border-emerald-600 transition-colors"
                      />
                      {sponsorSearching && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                      )}
                    </div>

                    {sponsorDropdownOpen && sponsorSuggestions.length > 0 && (
                      <div className="absolute z-20 w-full mt-1 bg-stone-900 border border-stone-700 rounded-xl shadow-xl overflow-hidden">
                        {sponsorSuggestions.map(s => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => selectSponsor(s)}
                            className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-stone-800 transition-colors text-left"
                          >
                            <div>
                              <p className="text-sm text-white font-medium">{s.name}</p>
                              <p className="text-[10px] text-stone-500 font-mono">{s.code}</p>
                            </div>
                            <span className="text-[10px] text-stone-500 capitalize">{s.rank}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedSponsor && (
                    <p className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Sponsor: {selectedSponsor.name} ({selectedSponsor.code})
                      <button type="button" onClick={clearSponsor} className="text-stone-500 hover:text-stone-300 ml-1 cursor-pointer">
                        [clear]
                      </button>
                    </p>
                  )}
                  {!selectedSponsor && (
                    <p className="text-[10px] text-stone-600 mt-1">Leave blank to place at root with no sponsor.</p>
                  )}
                </div>

                {/* Placement leg */}
                <div>
                  <Label>Placement leg</Label>
                  <div className="flex gap-3">
                    {(["auto", "left", "right"] as const).map(leg => (
                      <label key={leg} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="placementLeg"
                          value={leg}
                          checked={placementLeg === leg}
                          onChange={() => setPlacementLeg(leg)}
                          className="accent-emerald-600"
                        />
                        <span className="text-xs text-stone-300 capitalize">{leg === "auto" ? "Auto (next available)" : `Force ${leg}`}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-[10px] text-stone-600 mt-1">
                    "Auto" uses BFS to find the first open slot under the sponsor. Force left/right places directly under the sponsor on the specified side (will overwrite if occupied).
                  </p>
                </div>
              </FormSection>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-950/30 border border-red-800/40 rounded-xl text-xs text-red-300">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              {/* Summary before submit */}
              {displayName && phone && (
                <div className="p-3 bg-stone-900/60 border border-stone-800 rounded-xl text-xs space-y-1 text-stone-400">
                  <p className="text-stone-300 font-semibold mb-1">Summary</p>
                  <p>• Name: <span className="text-white">{displayName}</span></p>
                  <p>• Phone: <span className="text-white">{phone}</span></p>
                  <p>• Pack: <span className="text-white">{selectedPack.label}</span> ({selectedPack.pv} PV)</p>
                  <p>• Sponsor: <span className="text-white">{sponsorCode || "None (root)"}</span></p>
                  <p>• Placement: <span className="text-white capitalize">{placementLeg === "auto" ? "Auto (BFS)" : `Force ${placementLeg}`}</span></p>
                  <p className="text-amber-400 font-semibold mt-1">No payment collected — admin activation.</p>
                </div>
              )}

              <Btn
                variant="primary"
                loading={saving}
                disabled={!commissionAck}
                className="w-full"
                onClick={() => {}}
              >
                <Zap className="w-4 h-4" />
                {commissionAck ? "Create Distributor Account" : "Acknowledge commission question above first"}
              </Btn>

              {!commissionAck && (
                <p className="text-center text-[10px] text-stone-600">
                  You must check the commission acknowledgment box before submitting.
                </p>
              )}
            </div>
          </Card>
        </form>
      </div>
    </PageShell>
  );
}
