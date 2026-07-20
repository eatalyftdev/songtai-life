import { useState, useEffect, FormEvent, ReactNode } from "react";
import { Globe, CheckCircle, PauseCircle, Clock, Plus, Edit3, ExternalLink } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../context/AuthContext";
import PageShell, { Card, TableWrapper, Th, Td, Btn, SearchInput } from "../shared/PageShell";
import {
  Globe, Plus, Edit2, CheckCircle, PauseCircle, PlayCircle,
  Link2, Copy, Check, ExternalLink, AlertTriangle, User
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
  distributor_id: string | null;
  distributorCode: string;
  distributorEmail: string;
  whatsapp_number: string;
  contact_email: string;
  hero_title_en: string;
  hero_title_fr: string;
  hero_subtitle_en: string;
  hero_subtitle_fr: string;
  hero_image_url: string;
  status: "pending" | "active" | "suspended";
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

interface DistributorOption {
  id: string;
  distributor_code: string;
  email: string;
}

// ── Status badge ─────────────────────────────────────────────────────────────
function StatusChip({ status }: { status: Partner["status"] }) {
  const styles: Record<Partner["status"], string> = {
    active:    "bg-emerald-950/60 text-emerald-400 border-emerald-900/50",
    pending:   "bg-amber-950/60 text-amber-400 border-amber-900/50",
    suspended: "bg-red-950/60 text-red-400 border-red-900/50",
  };
  const icons: Record<Partner["status"], ReactNode> = {
    active:    <CheckCircle className="w-3 h-3" />,
    pending:   <Clock className="w-3 h-3" />,
    suspended: <PauseCircle className="w-3 h-3" />,
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${styles[status]}`}>
      {icons[status]}
      {status.charAt(0).toUpperCase() + status.slice(1)}
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
  created_at: string;
  approved_at: string | null;
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

// ── Empty form shape ──────────────────────────────────────────────────────────
const EMPTY_FORM = {
  distributor_id: "",
  slug: "",
  whatsapp_number: "",
  contact_email: "",
  hero_title_en: "",
  hero_title_fr: "",
  hero_subtitle_en: "",
  hero_subtitle_fr: "",
  hero_image_url: "",
};

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export default function PartnersPage() {
  const { userProfile } = useAuth();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [distributors, setDistributors] = useState<DistributorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Slide-over state
  const [slideOpen, setSlideOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Partner | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // ── Data loading ──────────────────────────────────────────────────────────
  const load = async () => {
    setLoading(true);
    const [partnerRes, distRes, profRes] = await Promise.all([
      supabase.from("partners")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.from("distributors")
        .select("id, distributor_code")
        .order("joined_at", { ascending: false }),
      supabase.from("profiles").select("id, email"),
    ]);

    const profMap: Record<string, string> = {};
    (profRes.data ?? []).forEach((p: any) => { profMap[p.id] = p.email ?? "—"; });

    setDistributors(
      (distRes.data ?? []).map((d: any) => ({
        id: d.id,
        distributor_code: d.distributor_code ?? d.id.slice(0, 8),
        email: profMap[d.id] ?? "—",
      }))
    );

    setPartners(
      (partnerRes.data ?? []).map((p: any) => {
        const distCode = (distRes.data ?? []).find((d: any) => d.id === p.distributor_id)?.distributor_code ?? "—";
        const distEmail = profMap[p.distributor_id ?? ""] ?? "—";
        return {
          id: p.id,
          slug: p.slug ?? "",
          distributor_id: p.distributor_id ?? null,
          distributorCode: distCode,
          distributorEmail: distEmail,
          whatsapp_number: p.whatsapp_number ?? "",
          contact_email: p.contact_email ?? "",
          hero_title_en: p.hero_title_en ?? "",
          hero_title_fr: p.hero_title_fr ?? "",
          hero_subtitle_en: p.hero_subtitle_en ?? "",
          hero_subtitle_fr: p.hero_subtitle_fr ?? "",
          hero_image_url: p.hero_image_url ?? "",
          status: p.status ?? "pending",
          approved_by: p.approved_by ?? null,
          approved_at: p.approved_at ?? null,
          created_at: p.created_at,
          updated_at: p.updated_at,
        };
      })
    );
    setLoading(false);
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
  const [copiedSlug, setCopiedSlug] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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

  // ── Status mutations ──────────────────────────────────────────────────────
  const updateStatus = async (id: string, status: Partner["status"]) => {
    const extra = status === "active"
      ? { approved_by: userProfile?.id ?? null, approved_at: new Date().toISOString() }
      : {};
    await supabase.from("partners").update({ status, ...extra }).eq("id", id);
    await supabase.from("audit_logs").insert({
      action: "Partner Status Changed",
      details: `partner ${id} → ${status}`,
    });
    setPartners(prev =>
      prev.map(p => p.id === id ? { ...p, status, ...extra } : p)
    );
  };

  // ── Slug validation ───────────────────────────────────────────────────────
  const validateSlug = (value: string): string | null => {
    if (!value) return "Slug is required";
    if (!SLUG_RE.test(value)) return "Slug must be lowercase letters, numbers, and hyphens only (no spaces or special characters)";
    if (value.length > 60) return "Slug must be 60 characters or fewer";
    return null;
  };

  // ── Open slide-over ───────────────────────────────────────────────────────
  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormError("");
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
    setForm(BLANK);
    setError("");
    setSlideOpen(true);
  };

  const openEdit = (p: Partner) => {
    setEditTarget(p);
    setForm({
      distributor_id: p.distributor_id ?? "",
      slug: p.slug,
      whatsapp_number: p.whatsapp_number,
      contact_email: p.contact_email,
      hero_title_en: p.hero_title_en,
      hero_title_fr: p.hero_title_fr,
      hero_subtitle_en: p.hero_subtitle_en,
      hero_subtitle_fr: p.hero_subtitle_fr,
      hero_image_url: p.hero_image_url,
    });
    setFormError("");
    setSlideOpen(true);
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");

    const slugErr = validateSlug(form.slug);
    if (slugErr) { setFormError(slugErr); return; }
    if (!form.distributor_id) { setFormError("Please select a distributor"); return; }
    if (!form.whatsapp_number.trim()) { setFormError("WhatsApp number is required"); return; }

    // Check slug uniqueness (skip if editing and slug unchanged)
    const slugChanged = !editTarget || editTarget.slug !== form.slug;
    if (slugChanged) {
      const { data: existing } = await supabase
        .from("partners")
        .select("id")
        .eq("slug", form.slug)
        .single();
      if (existing) { setFormError("This slug is already taken. Please choose a different one."); return; }
    }

    setSaving(true);
    const payload = {
      distributor_id:  form.distributor_id || null,
      slug:            form.slug,
      whatsapp_number: form.whatsapp_number,
      contact_email:   form.contact_email || null,
      hero_title_en:   form.hero_title_en  || null,
      hero_title_fr:   form.hero_title_fr  || null,
      hero_subtitle_en: form.hero_subtitle_en || null,
      hero_subtitle_fr: form.hero_subtitle_fr || null,
      hero_image_url:  form.hero_image_url || null,
    };

    if (editTarget) {
      await supabase.from("partners").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", editTarget.id);
      await supabase.from("audit_logs").insert({ action: "Partner Updated", details: `partner ${editTarget.id}` });
    } else {
      await supabase.from("partners").insert({ ...payload, status: "pending" });
      await supabase.from("audit_logs").insert({ action: "Partner Created", details: `slug: ${form.slug}` });
    }
    setSaving(false);
    setSlideOpen(false);
    load();
  };

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = partners.filter(p => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    const q = search.toLowerCase();
    return (
      !q ||
      p.slug.toLowerCase().includes(q) ||
      p.distributorCode.toLowerCase().includes(q) ||
      p.distributorEmail.toLowerCase().includes(q) ||
      p.whatsapp_number.includes(q)
    );
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
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

    // Validate slug
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

      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to save partner.");
        return;
      }

      setSlideOpen(false);
      load();
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

  const labelCls = "text-stone-400 text-[11px] font-semibold uppercase tracking-wide mb-1 block";
  const inputCls = "w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-stone-100 text-xs placeholder-stone-500 focus:outline-none focus:border-[#0A7D32] transition-all";

  return (
    <PageShell
      title="Partner Sites"
      subtitle="Manage distributor partner storefronts — each partner gets their own public URL at /p/[slug]"
      actions={
        <Btn variant="primary" onClick={openCreate}>
          <Plus className="w-3.5 h-3.5" /> New Partner
        </Btn>
      }
    >
      {/* Filters */}
      <Card className="p-4 flex flex-wrap gap-3 items-center">
        <SearchInput value={search} onChange={setSearch} placeholder="Search slug, distributor…" />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-stone-200 text-xs focus:outline-none cursor-pointer"
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
        <span className="text-stone-500 text-xs ml-auto">{filtered.length} partner{filtered.length !== 1 ? "s" : ""}</span>
      </Card>

      {/* Table */}
      <Card>
        {loading ? (
          <SkeletonTable rows={5} cols={6} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Globe} title="No partner sites yet" description="Create the first partner site using the button above." />
        ) : (
          <TableWrapper>
            <thead>
              <tr>
                <Th>Slug / URL</Th>
                <Th>Distributor</Th>
                <Th>WhatsApp</Th>
                <Th>Status</Th>
                <Th>Created</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-t border-stone-800/60 hover:bg-stone-900/50 transition-colors">
                  <Td>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-[#C9A227]">/p/{p.slug}</span>
                      <a
                        href={`/p/${p.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open partner site"
                        className="text-stone-500 hover:text-stone-300 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </Td>
                  <Td>
                    <div className="text-stone-300 text-[11px]">{p.distributorEmail}</div>
                    <div className="text-stone-500 text-[10px] font-mono">{p.distributorCode}</div>
                  </Td>
                  <Td>
                    <span className="font-mono text-[11px]">{p.whatsapp_number || "—"}</span>
                  </Td>
                  <Td>
                    <StatusChip status={p.status} />
                  </Td>
                  <Td className="text-stone-500">
                    {relTime(p.created_at)}
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Btn variant="ghost" size="xs" onClick={() => openEdit(p)}>
                        <Edit3 className="w-3 h-3" /> Edit
                      </Btn>
                      {p.status === "pending" && (
                        <Btn variant="primary" size="xs" onClick={() => updateStatus(p.id, "active")}>
                          Approve
                        </Btn>
                      )}
                      {p.status === "active" && (
                        <Btn variant="danger" size="xs" onClick={() => updateStatus(p.id, "suspended")}>
                          Suspend
                        </Btn>
                      )}
                      {p.status === "suspended" && (
                        <Btn variant="secondary" size="xs" onClick={() => updateStatus(p.id, "active")}>
                          Reactivate
                        </Btn>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrapper>
        )}
      </Card>

      {/* ── Create / Edit SlideOver ─────────────────────────────────────────── */}
      <SlideOver
        open={slideOpen}
        onClose={() => setSlideOpen(false)}
        title={editTarget ? `Edit — /p/${editTarget.slug}` : "Create New Partner Site"}
        subtitle={editTarget
          ? "Changes take effect immediately — no redeploy needed."
          : "A pending partner must be approved before their site goes live."}
        width="w-full max-w-2xl"
      >
        <form onSubmit={handleSave} className="space-y-6">
          {formError && (
            <div className="p-3 bg-red-950/50 border border-red-900/50 rounded-xl text-red-300 text-xs">
              {formError}
            </div>
          )}

          {/* ── Core fields ──────────────────────────────────────────────── */}
          <div className="space-y-4">
            <h4 className="text-stone-300 font-semibold text-xs uppercase tracking-wider">Partner Details</h4>

            {/* Distributor select */}
            <div>
              <label className={labelCls}>Distributor *</label>
              <select
                value={form.distributor_id}
                onChange={e => setForm(f => ({ ...f, distributor_id: e.target.value }))}
                className={inputCls}
                required
              >
                <option value="">— Select a distributor —</option>
                {distributors.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.distributor_code} — {d.email}
                  </option>
                ))}
              </select>
              <p className="text-stone-600 text-[10px] mt-1">The distributor this partner site belongs to.</p>
            </div>

            {/* Slug */}
            <div>
              <label className={labelCls}>Slug (URL path) *</label>
              <div className="flex items-center gap-2">
                <span className="text-stone-500 text-xs font-mono shrink-0">/p/</span>
                <input
                  type="text"
                  value={form.slug}
                  onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") }))}
                  placeholder="john-doe"
                  className={inputCls}
                  required
                  disabled={!!editTarget} // slug is immutable after creation
                />
              </div>
              {editTarget && <p className="text-amber-600/80 text-[10px] mt-1">Slug cannot be changed after creation.</p>}
              {!editTarget && <p className="text-stone-600 text-[10px] mt-1">Lowercase letters, numbers, hyphens only. Cannot be changed later.</p>}
            </div>

            {/* WhatsApp number */}
            <div>
              <label className={labelCls}>Partner WhatsApp Number *</label>
              <input
                type="tel"
                value={form.whatsapp_number}
                onChange={e => setForm(f => ({ ...f, whatsapp_number: e.target.value }))}
                placeholder="+237 6xx xxx xxx"
                className={inputCls}
                required
              />
              <p className="text-stone-600 text-[10px] mt-1">Replaces the company WhatsApp everywhere on this partner's site.</p>
            </div>

            {/* Contact email */}
            <div>
              <label className={labelCls}>Contact Email (optional)</label>
              <input
                type="email"
                value={form.contact_email}
                onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))}
                placeholder="partner@example.com"
                className={inputCls}
              />
            </div>
          </div>

          {/* ── Hero overrides ────────────────────────────────────────────── */}
          <div className="space-y-4 pt-4 border-t border-stone-800">
            <div>
              <h4 className="text-stone-300 font-semibold text-xs uppercase tracking-wider">Homepage Hero Override</h4>
              <p className="text-stone-600 text-[10px] mt-1">
                If any hero fields are blank, the main site's default hero carousel is used. Both EN & FR should be filled together, or both left blank.
              </p>
            </div>

            {/* Hero image */}
            <div>
              <label className={labelCls}>Hero Image URL (optional)</label>
              <input
                type="url"
                value={form.hero_image_url}
                onChange={e => setForm(f => ({ ...f, hero_image_url: e.target.value }))}
                placeholder="https://…/hero.jpg"
                className={inputCls}
              />
              <p className="text-stone-600 text-[10px] mt-1">Paste a publicly-accessible image URL. Use the Media Library to upload assets first.</p>
              {form.hero_image_url && (
                <img src={form.hero_image_url} alt="Hero preview" className="mt-2 h-20 w-auto rounded-xl object-cover border border-stone-700" />
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Hero Title — English</label>
                <input
                  type="text"
                  value={form.hero_title_en}
                  onChange={e => setForm(f => ({ ...f, hero_title_en: e.target.value }))}
                  placeholder="Transform Your Life"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Hero Title — French</label>
                <input
                  type="text"
                  value={form.hero_title_fr}
                  onChange={e => setForm(f => ({ ...f, hero_title_fr: e.target.value }))}
                  placeholder="Transformez Votre Vie"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Hero Subtitle — English</label>
                <input
                  type="text"
                  value={form.hero_subtitle_en}
                  onChange={e => setForm(f => ({ ...f, hero_subtitle_en: e.target.value }))}
                  placeholder="Premium natural wellness products"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Hero Subtitle — French</label>
                <input
                  type="text"
                  value={form.hero_subtitle_fr}
                  onChange={e => setForm(f => ({ ...f, hero_subtitle_fr: e.target.value }))}
                  placeholder="Produits naturels haut de gamme"
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* ── Footer actions ─────────────────────────────────────────────── */}
          <div className="flex justify-end gap-3 pt-2 border-t border-stone-800">
            <Btn variant="secondary" onClick={() => setSlideOpen(false)}>Cancel</Btn>
            <Btn variant="primary" loading={saving}>
              {editTarget ? "Save Changes" : "Create Partner"}
            </Btn>
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
        onClose={() => setSlideOpen(false)}
        title={editing ? `Edit: /p/${editing.slug}` : "New Partner Site"}
        subtitle={editing ? "Changes take effect immediately." : "Partner sites go live at /p/[slug] with no redeploy needed."}
        width="w-full max-w-2xl"
      >
        <form onSubmit={handleSave} className="space-y-5 pb-6">

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
        </form>
      </SlideOver>
    </PageShell>
  );
}
