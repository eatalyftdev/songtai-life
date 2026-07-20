import { useState, useEffect, FormEvent, ReactNode } from "react";
import { Globe, CheckCircle, PauseCircle, Clock, Plus, Edit3, ExternalLink } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../context/AuthContext";
import PageShell, { Card, TableWrapper, Th, Td, Btn, SearchInput } from "../shared/PageShell";
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
          </div>
        </form>
      </SlideOver>
    </PageShell>
  );
}
