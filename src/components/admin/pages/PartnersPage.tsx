import { useState, useEffect, FormEvent, ReactNode } from "react";
import {
  Globe, Plus, Edit2, CheckCircle, PauseCircle, PlayCircle,
  Link2, Copy, Check, ExternalLink, AlertTriangle, User,
  RefreshCw, Shield, XCircle
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import PageShell, { Card, TableWrapper, Th, Td, Btn, SearchInput, Select } from "../shared/PageShell";
import SlideOver from "../shared/SlideOver";
import { SkeletonTable } from "../shared/Skeleton";
import EmptyState from "../shared/EmptyState";

// ── Types ────────────────────────────────────────────────────────────────────
interface Partner {
  id: string;
  slug: string;
  status: "pending" | "active" | "suspended";
  whatsapp_number: string | null;
  contact_email: string | null;
  hero_title_en: string | null;
  hero_title_fr: string | null;
  hero_subtitle_en: string | null;
  hero_subtitle_fr: string | null;
  hero_image_url: string | null;
  distributor_id: string | null;
  pending_contact_name: string | null;
  pending_contact_phone: string | null;
  custom_domain: string | null;
  domain_status: "none" | "pending_verification" | "verified" | "failed" | null;
  domain_verification_token: string | null;
  created_at: string;
  approved_at: string | null;
  distributorEmail?: string;
  distributorCode?: string;
}

interface FormState {
  slug: string;
  pendingContactName: string;
  pendingContactPhone: string;
  whatsappNumber: string;
  contactEmail: string;
  heroTitleEn: string;
  heroTitleFr: string;
  heroSubtitleEn: string;
  heroSubtitleFr: string;
  heroImageUrl: string;
  distributorId: string;
  status: "pending" | "active";
  customDomain: string;
}

const BLANK: FormState = {
  slug: "", pendingContactName: "", pendingContactPhone: "",
  whatsappNumber: "", contactEmail: "",
  heroTitleEn: "", heroTitleFr: "", heroSubtitleEn: "", heroSubtitleFr: "",
  heroImageUrl: "", distributorId: "", status: "active", customDomain: "",
};

// ── Status chip ──────────────────────────────────────────────────────────────
function StatusChip({ status }: { status: Partner["status"] }) {
  const map: Record<Partner["status"], { label: string; cls: string; icon: ReactNode }> = {
    active:    { label: "Active",    cls: "bg-emerald-900/40 text-emerald-400 border-emerald-800/40", icon: <CheckCircle className="w-3 h-3" /> },
    pending:   { label: "Pending",   cls: "bg-amber-900/40 text-amber-400 border-amber-800/40",      icon: <PauseCircle className="w-3 h-3" /> },
    suspended: { label: "Suspended", cls: "bg-red-900/30 text-red-400 border-red-800/30",            icon: <PauseCircle className="w-3 h-3" /> },
  };
  const { label, cls, icon } = map[status] ?? map.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cls}`}>
      {icon}{label}
    </span>
  );
}

// ── Form field helpers ───────────────────────────────────────────────────────
function Label({ children }: { children: ReactNode }) {
  return <label className="block text-xs font-semibold text-stone-400 mb-1">{children}</label>;
}
function Input({ value, onChange, placeholder = "", disabled = false, mono = false }: {
  value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean; mono?: boolean;
}) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={`w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-stone-600 focus:outline-none focus:border-emerald-600 transition-colors disabled:opacity-50 ${mono ? "font-mono" : ""}`}
    />
  );
}
function FormRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
function SectionHeader({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 pt-2 pb-1 border-b border-stone-800">
      <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500">{children}</span>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function PartnersPage() {
  const { session } = useAuth();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [slideOpen, setSlideOpen] = useState(false);
  const [editing, setEditing] = useState<Partner | null>(null);
  const [form, setForm] = useState<FormState>(BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [createdPartner, setCreatedPartner] = useState<Partner | null>(null);
  const [copiedSlug, setCopiedSlug] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [domainOp, setDomainOp] = useState<"attaching" | "checking" | null>(null);
  const [dnsRecords, setDnsRecords] = useState<{ type: string; domain: string; value: string }[]>([]);
  const [domainOpMsg, setDomainOpMsg] = useState("");

  // ── Load partners ──────────────────────────────────────────────────────────
  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/partners", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.ok) setPartners(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filtered = partners.filter(p => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    const q = search.toLowerCase();
    return !q
      || p.slug.includes(q)
      || (p.pending_contact_name ?? "").toLowerCase().includes(q)
      || (p.pending_contact_phone ?? "").includes(q)
      || (p.whatsapp_number ?? "").includes(q);
  });

  // ── Open create / edit slide-over ──────────────────────────────────────────
  const openCreate = () => {
    setEditing(null);
    setCreatedPartner(null);
    setForm(BLANK);
    setError("");
    setSlideOpen(true);
  };

  const openEdit = (p: Partner) => {
    setCreatedPartner(null);
    setDnsRecords([]);
    setDomainOpMsg("");
    setEditing(p);
    setForm({
      slug: p.slug,
      pendingContactName: p.pending_contact_name ?? "",
      pendingContactPhone: p.pending_contact_phone ?? "",
      whatsappNumber: p.whatsapp_number ?? "",
      contactEmail: p.contact_email ?? "",
      heroTitleEn: p.hero_title_en ?? "",
      heroTitleFr: p.hero_title_fr ?? "",
      heroSubtitleEn: p.hero_subtitle_en ?? "",
      heroSubtitleFr: p.hero_subtitle_fr ?? "",
      heroImageUrl: p.hero_image_url ?? "",
      distributorId: p.distributor_id ?? "",
      status: p.status === "suspended" ? "pending" : p.status,
      customDomain: p.custom_domain ?? "",
    });
    setError("");
    setSlideOpen(true);
  };

  // ── Save (create or update) ────────────────────────────────────────────────
  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!editing && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug)) {
      setError("Slug must be lowercase letters, numbers, and hyphens only (e.g. jane-doe).");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        slug: form.slug,
        pendingContactName: form.pendingContactName || null,
        pendingContactPhone: form.pendingContactPhone || null,
        whatsappNumber: form.whatsappNumber || null,
        contactEmail: form.contactEmail || null,
        heroTitleEn: form.heroTitleEn || null,
        heroTitleFr: form.heroTitleFr || null,
        heroSubtitleEn: form.heroSubtitleEn || null,
        heroSubtitleFr: form.heroSubtitleFr || null,
        heroImageUrl: form.heroImageUrl || null,
        distributorId: form.distributorId || null,
        status: form.status,
        customDomain: form.customDomain || null,
      };

      const url = editing
        ? `/api/admin/partner/${editing.id}`
        : "/api/admin/partner/create";
      const method = editing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      // Safe JSON parse — the server might return HTML on unhandled errors
      const contentType = res.headers.get("content-type") ?? "";
      let json: any = {};
      if (contentType.includes("application/json")) {
        json = await res.json();
      } else {
        const raw = await res.text();
        console.error("[PartnersPage] Non-JSON response:", res.status, raw.slice(0, 300));
        setError(`Server error (${res.status}). Check console for details.`);
        return;
      }

      if (!res.ok) {
        setError(json.error ?? "Failed to save partner.");
        return;
      }

      load();
      if (!editing && json.partner) {
        // Show success panel with the live URL instead of just closing
        setCreatedPartner(json.partner as Partner);
      } else {
        setSlideOpen(false);
      }
    } catch (err: any) {
      setError(err.message ?? "Unexpected error.");
    } finally {
      setSaving(false);
    }
  };

  // ── Status actions ─────────────────────────────────────────────────────────
  const setStatus = async (id: string, newStatus: "active" | "suspended" | "pending") => {
    setActionLoading(id);
    try {
      await fetch(`/api/admin/partner/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      setPartners(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
    } finally {
      setActionLoading(null);
    }
  };

  // ── Copy slug URL ──────────────────────────────────────────────────────────
  const copyUrl = (slug: string) => {
    const url = `${window.location.origin}/p/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(""), 2000);
  };

  const relTime = (iso: string) => {
    const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    return d === 0 ? "Today" : `${d}d ago`;
  };

  // ── Domain management ──────────────────────────────────────────────────────
  const attachDomain = async (id: string, domain: string) => {
    setDomainOp("attaching");
    setDnsRecords([]);
    setDomainOpMsg("");
    try {
      const res = await fetch(`/api/admin/partner/${id}/domain/attach`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ domain }),
      });
      const json = await res.json();
      if (!res.ok) { setDomainOpMsg(json.error ?? "Failed to attach domain."); return; }
      setDnsRecords(json.verification ?? []);
      setDomainOpMsg(json.message ?? "Domain attached.");
      setPartners(prev => prev.map(p => p.id === id ? { ...p, custom_domain: domain, domain_status: "pending_verification" } : p));
      if (editing?.id === id) setEditing(e => e ? { ...e, custom_domain: domain, domain_status: "pending_verification" } : e);
    } catch (err: any) {
      setDomainOpMsg(err.message ?? "Unexpected error.");
    } finally {
      setDomainOp(null);
    }
  };

  const checkDomainStatus = async (id: string) => {
    setDomainOp("checking");
    setDomainOpMsg("");
    try {
      const res = await fetch(`/api/admin/partner/${id}/domain/check`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const json = await res.json();
      if (!res.ok) { setDomainOpMsg(json.error ?? "Failed to check domain."); return; }
      setDnsRecords(json.verification ?? []);
      setDomainOpMsg(json.message ?? "");
      const newStatus = json.domain_status as Partner["domain_status"];
      setPartners(prev => prev.map(p => p.id === id ? { ...p, domain_status: newStatus } : p));
      if (editing?.id === id) setEditing(e => e ? { ...e, domain_status: newStatus } : e);
    } catch (err: any) {
      setDomainOpMsg(err.message ?? "Unexpected error.");
    } finally {
      setDomainOp(null);
    }
  };

  return (
    <PageShell
      title="Partner Sites"
      subtitle={`${partners.length} total · ${partners.filter(p => p.status === "active").length} active`}
      actions={
        <Btn variant="primary" onClick={openCreate}>
          <Plus className="w-3.5 h-3.5" /> New Partner Site
        </Btn>
      }
    >
      {/* ── RLS reminder banner ── */}
      <div className="flex items-start gap-3 px-4 py-3 bg-amber-950/30 border border-amber-800/40 rounded-2xl text-xs text-amber-300">
        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>
          <strong>RLS required:</strong> The <code className="font-mono bg-stone-900 px-1 rounded">partners</code> table must have a Supabase Row Level Security policy allowing anon reads of <code className="font-mono bg-stone-900 px-1 rounded">status = 'active'</code> rows. Without it, partner sites will show "not available" for all visitors.
        </span>
      </div>

      <Card>
        <div className="flex flex-wrap gap-3 p-4 border-b border-stone-800">
          <SearchInput value={search} onChange={setSearch} placeholder="Slug, contact name, phone…" />
          <Select value={statusFilter} onChange={setStatusFilter}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
          </Select>
        </div>

        <TableWrapper>
          <thead>
            <tr>
              <Th>Partner / Contact</Th>
              <Th>Slug / URL</Th>
              <Th>WhatsApp</Th>
              <Th>Status</Th>
              <Th>Created</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTable cols={6} />
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <EmptyState icon={Globe} title="No partner sites yet" description="Create the first partner site using the button above." />
                </td>
              </tr>
            ) : filtered.map(p => (
              <tr key={p.id} className="hover:bg-stone-800/30 transition-colors">
                <Td>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-emerald-900/40 border border-emerald-800/40 flex items-center justify-center flex-shrink-0">
                      <User className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-white text-xs">
                        {p.pending_contact_name ?? p.slug}
                      </p>
                      {p.pending_contact_phone && (
                        <p className="text-stone-500 text-[10px]">{p.pending_contact_phone}</p>
                      )}
                      {!p.distributor_id && (
                        <span className="text-[10px] text-amber-500 font-medium">No distributor linked</span>
                      )}
                    </div>
                  </div>
                </Td>
                <Td>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-stone-400 text-[11px]">/p/{p.slug}</span>
                    <button
                      onClick={() => copyUrl(p.slug)}
                      className="p-1 rounded hover:bg-stone-800 text-stone-500 hover:text-stone-300 transition-colors cursor-pointer"
                      title="Copy partner URL"
                    >
                      {copiedSlug === p.slug ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                    <a
                      href={`/p/${p.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded hover:bg-stone-800 text-stone-500 hover:text-stone-300 transition-colors"
                      title="Open partner site"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  {p.custom_domain && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Link2 className="w-2.5 h-2.5 text-stone-600" />
                      <span className="text-[10px] text-stone-500 font-mono">{p.custom_domain}</span>
                      <span className={`text-[9px] font-bold uppercase px-1 rounded ${
                        p.domain_status === "verified" ? "bg-emerald-900/40 text-emerald-400" :
                        p.domain_status === "failed"   ? "bg-red-900/30 text-red-400" :
                        "bg-amber-900/30 text-amber-400"
                      }`}>
                        {p.domain_status ?? "none"}
                      </span>
                    </div>
                  )}
                </Td>
                <Td>{p.whatsapp_number ?? <span className="text-stone-600">—</span>}</Td>
                <Td><StatusChip status={p.status} /></Td>
                <Td>{relTime(p.created_at)}</Td>
                <Td className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Btn variant="secondary" size="xs" onClick={() => openEdit(p)}>
                      <Edit2 className="w-3 h-3" /> Edit
                    </Btn>
                    {p.status === "pending" && (
                      <Btn
                        variant="primary" size="xs"
                        loading={actionLoading === p.id}
                        onClick={() => setStatus(p.id, "active")}
                      >
                        <CheckCircle className="w-3 h-3" /> Approve
                      </Btn>
                    )}
                    {p.status === "active" && (
                      <Btn
                        variant="danger" size="xs"
                        loading={actionLoading === p.id}
                        onClick={() => setStatus(p.id, "suspended")}
                      >
                        <PauseCircle className="w-3 h-3" /> Suspend
                      </Btn>
                    )}
                    {p.status === "suspended" && (
                      <Btn
                        variant="secondary" size="xs"
                        loading={actionLoading === p.id}
                        onClick={() => setStatus(p.id, "active")}
                      >
                        <PlayCircle className="w-3 h-3" /> Reactivate
                      </Btn>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrapper>
      </Card>

      {/* ── Create / Edit Slide-Over ── */}
      <SlideOver
        open={slideOpen}
        onClose={() => { setSlideOpen(false); setCreatedPartner(null); }}
        title={createdPartner ? "Partner Site Created!" : editing ? `Edit: /p/${editing.slug}` : "New Partner Site"}
        subtitle={createdPartner ? "The site is live. Share the URL with the partner." : editing ? "Changes take effect immediately." : "Partner sites go live at /p/[slug] with no redeploy needed."}
        width="w-full max-w-2xl"
      >
        {/* ── Post-creation success panel ── */}
        {createdPartner && (
          <div className="space-y-5 pb-6">
            <div className="flex items-center gap-3 p-4 bg-emerald-950/40 border border-emerald-800/40 rounded-2xl">
              <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-emerald-300">Partner site is live</p>
                <p className="text-[11px] text-emerald-500 mt-0.5">Slug: <span className="font-mono">{createdPartner.slug}</span> · Status: {createdPartner.status}</p>
              </div>
            </div>

            <SectionHeader>Live URL (default)</SectionHeader>
            <div className="flex items-center gap-2 bg-stone-900 border border-stone-800 rounded-xl px-3 py-2.5">
              <code className="flex-1 text-[11px] text-stone-300 font-mono break-all">
                {window.location.origin}/p/{createdPartner.slug}
              </code>
              <button
                type="button"
                onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/p/${createdPartner.slug}`); setCopiedSlug(createdPartner.slug); setTimeout(() => setCopiedSlug(""), 2000); }}
                className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 text-[10px] font-semibold rounded-lg transition-colors"
              >
                {copiedSlug === createdPartner.slug ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copiedSlug === createdPartner.slug ? "Copied!" : "Copy"}
              </button>
              <a href={`/p/${createdPartner.slug}`} target="_blank" rel="noreferrer" className="flex-shrink-0 p-1.5 rounded-lg hover:bg-stone-800 text-stone-500 hover:text-stone-300 transition-colors">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {createdPartner.custom_domain && (
              <>
                <SectionHeader>Custom Domain</SectionHeader>
                <div className="flex items-center gap-2 p-3 bg-amber-950/20 border border-amber-800/30 rounded-xl text-[11px] text-amber-300">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span><span className="font-mono font-bold">{createdPartner.custom_domain}</span> — not yet attached to Vercel. Open the partner's Edit panel to configure DNS.</span>
                </div>
              </>
            )}

            <div className="flex gap-3 pt-2">
              <Btn variant="primary" onClick={() => { openEdit(createdPartner); }} className="flex-1">Edit This Partner</Btn>
              <Btn variant="secondary" onClick={() => { setSlideOpen(false); setCreatedPartner(null); }}>Done</Btn>
            </div>
          </div>
        )}

        {/* ── Create / Edit form (hidden after creation success) ── */}
        {!createdPartner && <form onSubmit={handleSave} className="space-y-5 pb-6">

          {/* Contact info */}
          <SectionHeader>Contact Information</SectionHeader>
          <div className="grid grid-cols-2 gap-3">
            <FormRow label="Contact name">
              <Input value={form.pendingContactName} onChange={v => setForm(f => ({ ...f, pendingContactName: v }))} placeholder="Jane Doe" />
            </FormRow>
            <FormRow label="Contact phone">
              <Input value={form.pendingContactPhone} onChange={v => setForm(f => ({ ...f, pendingContactPhone: v }))} placeholder="+237 6XXXXXXXX" />
            </FormRow>
          </div>

          {/* Slug (immutable after creation) */}
          <SectionHeader>Site Identity</SectionHeader>
          <FormRow label={editing ? "Slug (immutable after creation)" : "Slug *"}>
            <div className="flex items-center gap-2">
              <span className="text-stone-500 text-xs flex-shrink-0">/p/</span>
              <Input
                value={form.slug}
                onChange={v => setForm(f => ({ ...f, slug: v.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
                placeholder="jane-doe"
                disabled={!!editing}
                mono
              />
            </div>
            {!editing && (
              <p className="text-[10px] text-stone-600 mt-1">Lowercase, letters/numbers/hyphens only. Cannot be changed later.</p>
            )}
          </FormRow>

          <div className="grid grid-cols-2 gap-3">
            <FormRow label="WhatsApp number">
              <Input value={form.whatsappNumber} onChange={v => setForm(f => ({ ...f, whatsappNumber: v }))} placeholder="+237 6XXXXXXXX" />
            </FormRow>
            <FormRow label="Contact email">
              <Input value={form.contactEmail} onChange={v => setForm(f => ({ ...f, contactEmail: v }))} placeholder="jane@example.com" />
            </FormRow>
          </div>

          <FormRow label="Distributor ID (optional — link to a real distributor account)">
            <Input value={form.distributorId} onChange={v => setForm(f => ({ ...f, distributorId: v }))} placeholder="UUID or leave blank" mono />
            <p className="text-[10px] text-stone-600 mt-1">Leave blank to create a partner site before a distributor account exists. You can link later.</p>
          </FormRow>

          {/* Hero overrides */}
          <SectionHeader>Hero Overrides (optional)</SectionHeader>
          <p className="text-[11px] text-stone-500">Both EN and FR must be set for a hero override to activate. Leave both blank to show the default hero.</p>

          <div className="grid grid-cols-2 gap-3">
            <FormRow label="Hero title (EN)">
              <Input value={form.heroTitleEn} onChange={v => setForm(f => ({ ...f, heroTitleEn: v }))} placeholder="Jane Doe's Store" />
            </FormRow>
            <FormRow label="Hero title (FR)">
              <Input value={form.heroTitleFr} onChange={v => setForm(f => ({ ...f, heroTitleFr: v }))} placeholder="Boutique de Jane Doe" />
            </FormRow>
            <FormRow label="Hero subtitle (EN)">
              <Input value={form.heroSubtitleEn} onChange={v => setForm(f => ({ ...f, heroSubtitleEn: v }))} placeholder="Premium health products" />
            </FormRow>
            <FormRow label="Hero subtitle (FR)">
              <Input value={form.heroSubtitleFr} onChange={v => setForm(f => ({ ...f, heroSubtitleFr: v }))} placeholder="Produits de santé premium" />
            </FormRow>
          </div>
          <FormRow label="Hero image URL (upload to Media Library first)">
            <Input value={form.heroImageUrl} onChange={v => setForm(f => ({ ...f, heroImageUrl: v }))} placeholder="https://..." />
          </FormRow>

          {/* Custom domain */}
          <SectionHeader>Custom Domain (optional)</SectionHeader>
          <FormRow label="Custom domain">
            <Input value={form.customDomain} onChange={v => setForm(f => ({ ...f, customDomain: v }))} placeholder="janedoe-wellness.com" />
            <p className="text-[10px] text-stone-500 mt-1">
              After saving, configure a CNAME at your registrar pointing to this server's domain.
              The partner site will remain accessible at its default <code className="font-mono bg-stone-900 px-0.5 rounded">/p/{form.slug || "slug"}</code> URL regardless of custom domain status.
            </p>
          </FormRow>

          {/* Domain verification — only shown when editing an existing partner with a custom domain */}
          {editing && editing.custom_domain && (
            <div className="space-y-3">
              <SectionHeader>Domain Verification</SectionHeader>

              {/* Status badge */}
              <div className="flex items-center gap-2">
                {editing.domain_status === "verified" && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-900/40 text-emerald-400 border border-emerald-800/40">
                    <Shield className="w-3 h-3" /> Verified — SSL active
                  </span>
                )}
                {(editing.domain_status === "pending_verification" || editing.domain_status === "none" || !editing.domain_status) && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-900/40 text-amber-400 border border-amber-800/40">
                    <AlertTriangle className="w-3 h-3" /> {editing.domain_status === "pending_verification" ? "Pending verification" : "Not attached to Vercel"}
                  </span>
                )}
                {editing.domain_status === "failed" && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-900/30 text-red-400 border border-red-800/30">
                    <XCircle className="w-3 h-3" /> Verification failed
                  </span>
                )}
              </div>

              {/* Attach button — only if not yet added to Vercel */}
              {(editing.domain_status === "none" || !editing.domain_status) && (
                <div className="flex items-center gap-2">
                  <Btn
                    variant="secondary" size="xs"
                    loading={domainOp === "attaching"}
                    onClick={() => attachDomain(editing.id, editing.custom_domain!)}
                  >
                    <Globe className="w-3 h-3" />
                    Attach to Vercel
                  </Btn>
                  <p className="text-[10px] text-stone-500">Registers this domain with the partner platform — you'll get the DNS records to add at your registrar.</p>
                </div>
              )}

              {/* Check status button — if pending or failed */}
              {(editing.domain_status === "pending_verification" || editing.domain_status === "failed") && (
                <Btn
                  variant="secondary" size="xs"
                  loading={domainOp === "checking"}
                  onClick={() => checkDomainStatus(editing.id)}
                >
                  <RefreshCw className="w-3 h-3" />
                  Check verification status
                </Btn>
              )}

              {/* Operation message */}
              {domainOpMsg && (
                <p className={`text-[11px] leading-relaxed ${editing.domain_status === "verified" ? "text-emerald-400" : "text-stone-400"}`}>
                  {domainOpMsg}
                </p>
              )}

              {/* DNS records table */}
              {dnsRecords.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wide">DNS Records to add at your registrar</p>
                  <div className="rounded-xl border border-stone-800 overflow-hidden">
                    <table className="w-full text-[10px]">
                      <thead className="bg-stone-800/60">
                        <tr>
                          <th className="text-left px-3 py-1.5 text-stone-400 font-semibold">Type</th>
                          <th className="text-left px-3 py-1.5 text-stone-400 font-semibold">Name / Host</th>
                          <th className="text-left px-3 py-1.5 text-stone-400 font-semibold">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dnsRecords.map((r, i) => (
                          <tr key={i} className="border-t border-stone-800">
                            <td className="px-3 py-1.5 font-mono text-amber-400 font-bold">{r.type}</td>
                            <td className="px-3 py-1.5 font-mono text-stone-300">{r.domain}</td>
                            <td className="px-3 py-1.5 font-mono text-stone-400 break-all">{r.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[10px] text-stone-500">
                    Add these records at your DNS provider, then click "Check verification status". Vercel provisions SSL automatically once verified.
                  </p>
                </div>
              )}

              {/* Verified state — no action needed */}
              {editing.domain_status === "verified" && dnsRecords.length === 0 && (
                <p className="text-[11px] text-stone-500">
                  Domain is verified and serving traffic. SSL is active. The site also remains accessible at its default <code className="font-mono bg-stone-900 px-0.5 rounded">/p/{editing.slug}</code> URL.
                </p>
              )}
            </div>
          )}

          {/* Status */}
          <SectionHeader>Visibility</SectionHeader>
          <FormRow label="Initial status">
            <div className="flex gap-3">
              {(["active", "pending"] as const).map(s => (
                <label key={s} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value={s}
                    checked={form.status === s}
                    onChange={() => setForm(f => ({ ...f, status: s }))}
                    className="accent-emerald-600"
                  />
                  <span className="text-xs text-stone-300 capitalize">{s}</span>
                </label>
              ))}
            </div>
            <p className="text-[10px] text-stone-600 mt-1">Admin-created sites can go live immediately ("active") — you are the approver.</p>
          </FormRow>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-950/30 border border-red-800/40 rounded-xl text-xs text-red-300">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Btn variant="primary" loading={saving} className="flex-1" onClick={() => {}}>
              {editing ? "Save Changes" : "Create Partner Site"}
            </Btn>
            <Btn variant="secondary" onClick={() => setSlideOpen(false)}>Cancel</Btn>
          </div>
        </form>}
      </SlideOver>
    </PageShell>
  );
}
