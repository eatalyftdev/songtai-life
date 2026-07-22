import React, { useState, useEffect, useCallback } from "react";
import {
  Sliders, Plus, Edit, Trash2, ToggleLeft, ToggleRight,
  GripVertical, Eye, Leaf, Sparkles, Star, Shield, Heart,
  Zap, Check, Wind, Sun, Droplets, Award, X,
} from "lucide-react";
import { supabase } from "../../../lib/supabase";
import PageShell, { Card, TableWrapper, Th, Td, Btn, SearchInput } from "../shared/PageShell";
import SlideOver from "../shared/SlideOver";
import { SkeletonTable } from "../shared/Skeleton";
import EmptyState from "../shared/EmptyState";
import MediaUploader from "../../MediaUploader";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Benefit {
  icon: string;
  label_en: string;
  label_fr: string;
}

interface Slide {
  id: string;
  imageUrl: string;
  titleEn: string;
  titleFr: string;
  subtitleEn: string;
  subtitleFr: string;
  badgeLabelEn: string;
  badgeLabelFr: string;
  benefits: Benefit[];
  ctaLink: string;
  linkedProductId: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

interface Product {
  id: string;
  name: string;
}

// ── Icon options for benefit chips ────────────────────────────────────────────

const ICON_OPTIONS = [
  { value: "Leaf",       label: "Leaf",       Icon: Leaf },
  { value: "Sparkles",   label: "Sparkles",   Icon: Sparkles },
  { value: "Star",       label: "Star",       Icon: Star },
  { value: "Shield",     label: "Shield",     Icon: Shield },
  { value: "Heart",      label: "Heart",      Icon: Heart },
  { value: "Zap",        label: "Zap",        Icon: Zap },
  { value: "Check",      label: "Check",      Icon: Check },
  { value: "Wind",       label: "Wind",       Icon: Wind },
  { value: "Sun",        label: "Sun",        Icon: Sun },
  { value: "Droplets",   label: "Droplets",   Icon: Droplets },
  { value: "Award",      label: "Award",      Icon: Award },
];

const BLANK: Partial<Slide> = {
  imageUrl: "", titleEn: "", titleFr: "", subtitleEn: "", subtitleFr: "",
  badgeLabelEn: "", badgeLabelFr: "", benefits: [], ctaLink: "",
  linkedProductId: "", sortOrder: 0, isActive: true,
};

async function log(action: string, details: string) {
  await supabase.from("audit_logs").insert({ action, details });
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function HeroCarouselPage() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [slideOpen, setSlideOpen] = useState(false);
  const [editing, setEditing] = useState<Slide | null>(null);
  const [form, setForm] = useState<Partial<Slide>>(BLANK);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("hero_carousel")
      .select("*")
      .order("sort_order", { ascending: true });
    setSlides((data ?? []).map((r: any) => ({
      id: r.id,
      imageUrl: r.image_url ?? "",
      titleEn: r.title_en ?? "",
      titleFr: r.title_fr ?? "",
      subtitleEn: r.subtitle_en ?? "",
      subtitleFr: r.subtitle_fr ?? "",
      badgeLabelEn: r.badge_label_en ?? "",
      badgeLabelFr: r.badge_label_fr ?? "",
      benefits: Array.isArray(r.benefits) ? r.benefits : [],
      ctaLink: r.cta_link ?? "",
      linkedProductId: r.linked_product_id ?? "",
      sortOrder: r.sort_order ?? 0,
      isActive: r.is_active ?? true,
      createdAt: r.created_at ?? "",
    })));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    // Load products for linked_product_id selector
    supabase.from("products").select("id, name").eq("status", "active").order("name")
      .then(({ data }) => setProducts((data ?? []) as Product[]));

    const ch = supabase.channel("admin_hero_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "hero_carousel" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...BLANK, sortOrder: slides.length + 1 });
    setSlideOpen(true);
  };
  const openEdit = (s: Slide) => { setEditing(s); setForm(s); setSlideOpen(true); };

  const f = (k: keyof Slide, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  // Benefits helpers
  const addBenefit = () =>
    f("benefits", [...(form.benefits ?? []), { icon: "Leaf", label_en: "", label_fr: "" }]);

  const updateBenefit = (idx: number, field: keyof Benefit, val: string) =>
    f("benefits", (form.benefits ?? []).map((b, i) => i === idx ? { ...b, [field]: val } : b));

  const removeBenefit = (idx: number) =>
    f("benefits", (form.benefits ?? []).filter((_, i) => i !== idx));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.imageUrl) { alert("Please upload a carousel image before saving."); return; }
    setSaving(true);
    const payload = {
      image_url:          form.imageUrl,
      title_en:           form.titleEn         || null,
      title_fr:           form.titleFr         || null,
      subtitle_en:        form.subtitleEn      || null,
      subtitle_fr:        form.subtitleFr      || null,
      badge_label_en:     form.badgeLabelEn    || null,
      badge_label_fr:     form.badgeLabelFr    || null,
      benefits:           form.benefits        ?? [],
      cta_link:           form.ctaLink         || null,
      linked_product_id:  form.linkedProductId || null,
      sort_order:         Number(form.sortOrder ?? 0),
      is_active:          form.isActive        ?? true,
    };
    const { error } = editing
      ? await supabase.from("hero_carousel").update(payload).eq("id", editing.id)
      : await supabase.from("hero_carousel").insert(payload);
    if (error) { alert(`Error saving slide: ${error.message}`); setSaving(false); return; }
    await log(
      editing ? "Hero Carousel Slide Updated" : "Hero Carousel Slide Created",
      form.titleEn ?? "(untitled)",
    );
    setSaving(false); setSlideOpen(false); load();
  };

  const handleDelete = async (s: Slide) => {
    if (!confirm(`Delete slide "${s.titleEn || "(untitled)"}"? This cannot be undone.`)) return;
    await supabase.from("hero_carousel").delete().eq("id", s.id);
    await log("Hero Carousel Slide Deleted", s.titleEn ?? s.id);
    load();
  };

  const handleToggleActive = async (s: Slide) => {
    await supabase.from("hero_carousel").update({ is_active: !s.isActive }).eq("id", s.id);
    setSlides(prev => prev.map(x => x.id === s.id ? { ...x, isActive: !x.isActive } : x));
  };

  const handleMoveOrder = async (s: Slide, direction: "up" | "down") => {
    const idx = slides.findIndex(x => x.id === s.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= slides.length) return;
    const swap = slides[swapIdx];
    await Promise.all([
      supabase.from("hero_carousel").update({ sort_order: swap.sortOrder }).eq("id", s.id),
      supabase.from("hero_carousel").update({ sort_order: s.sortOrder }).eq("id", swap.id),
    ]);
    load();
  };

  const filtered = slides.filter(s => {
    const q = search.toLowerCase();
    return !q || s.titleEn.toLowerCase().includes(q) || s.titleFr.toLowerCase().includes(q);
  });
  const activeCount = slides.filter(s => s.isActive).length;

  // Shared input class
  const inputCls = "w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32]";
  const labelCls = "text-stone-400 text-xs block mb-1.5";

  return (
    <PageShell
      title="Hero Carousel"
      subtitle={`${slides.length} slides · ${activeCount} active`}
      actions={<Btn variant="primary" onClick={openAdd}><Plus className="w-3.5 h-3.5" /> Add Slide</Btn>}
    >
      {/* Info banner */}
      <div className="flex items-start gap-2 p-3 bg-stone-900/60 border border-stone-800 rounded-xl text-xs text-stone-400 mb-1">
        <Eye className="w-4 h-4 text-stone-500 flex-shrink-0 mt-0.5" />
        <span>
          Active slides auto-advance every <strong className="text-white">2 seconds</strong> on the homepage.
          Images upload to Supabase Storage — no external links.
        </span>
      </div>

      <Card>
        <div className="flex gap-3 p-4 border-b border-stone-800">
          <SearchInput value={search} onChange={setSearch} placeholder="Search slides…" />
        </div>

        <TableWrapper>
          <thead>
            <tr>
              <Th>Order</Th>
              <Th>Preview</Th>
              <Th>Title / Badge</Th>
              <Th>Title (FR)</Th>
              <Th>Active</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          {loading ? <SkeletonTable cols={6} /> : (
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6}>
                  <EmptyState
                    icon={Sliders}
                    title="No carousel slides yet"
                    description="Add your first hero slide to get started."
                    action={{ label: "Add Slide", onClick: openAdd }}
                  />
                </td></tr>
              ) : filtered.map((s, idx) => (
                <tr key={s.id} className="border-b border-stone-800/50 hover:bg-stone-800/20 transition-colors">
                  <Td>
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-stone-400 text-xs w-5 text-right">{s.sortOrder}</span>
                      <div className="flex flex-col gap-0.5 ml-1">
                        <button onClick={() => handleMoveOrder(s, "up")} disabled={idx === 0}
                          className="text-stone-600 hover:text-stone-300 disabled:opacity-20 cursor-pointer transition-colors">
                          <GripVertical className="w-3 h-3 rotate-90" />
                        </button>
                        <button onClick={() => handleMoveOrder(s, "down")} disabled={idx === filtered.length - 1}
                          className="text-stone-600 hover:text-stone-300 disabled:opacity-20 cursor-pointer transition-colors">
                          <GripVertical className="w-3 h-3 -rotate-90" />
                        </button>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    {s.imageUrl ? (
                      <img src={s.imageUrl} alt="" className="w-24 h-14 rounded-lg object-cover border border-stone-700 bg-stone-900" />
                    ) : (
                      <div className="w-24 h-14 rounded-lg bg-stone-800 border border-stone-700 flex items-center justify-center">
                        <Sliders className="w-4 h-4 text-stone-600" />
                      </div>
                    )}
                  </Td>
                  <Td>
                    <p className="text-white font-medium text-sm">{s.titleEn || <span className="text-stone-600 italic">—</span>}</p>
                    {s.badgeLabelEn && (
                      <span className="inline-block mt-0.5 text-[9px] uppercase tracking-widest font-black text-[color:var(--color-gold)] bg-stone-900 border border-[color:var(--color-gold)]/30 px-1.5 py-0.5 rounded-full">
                        {s.badgeLabelEn}
                      </span>
                    )}
                    {s.benefits.length > 0 && (
                      <p className="text-stone-600 text-[10px] mt-0.5">{s.benefits.length} benefit{s.benefits.length !== 1 ? "s" : ""}</p>
                    )}
                  </Td>
                  <Td>
                    <p className="text-stone-300 text-sm">{s.titleFr || <span className="text-stone-600 italic">—</span>}</p>
                    {s.subtitleFr && <p className="text-stone-500 text-[11px] mt-0.5 truncate max-w-[180px]">{s.subtitleFr}</p>}
                  </Td>
                  <Td>
                    <button onClick={() => handleToggleActive(s)} className="cursor-pointer text-stone-400 hover:text-white transition-colors">
                      {s.isActive
                        ? <ToggleRight className="w-5 h-5 text-[#0A7D32]" />
                        : <ToggleLeft className="w-5 h-5 text-stone-600" />
                      }
                    </button>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1.5">
                      <Btn variant="ghost" size="xs" onClick={() => openEdit(s)}><Edit className="w-3 h-3" /></Btn>
                      <Btn variant="danger" size="xs" onClick={() => handleDelete(s)}><Trash2 className="w-3 h-3" /></Btn>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          )}
        </TableWrapper>

        <div className="px-4 py-3 border-t border-stone-800 text-stone-500 text-xs">
          Showing {filtered.length} of {slides.length} slides
        </div>
      </Card>

      {/* ── Edit / Add Slide Panel ────────────────────────────────────────── */}
      <SlideOver open={slideOpen} onClose={() => setSlideOpen(false)} title={editing ? "Edit Slide" : "New Carousel Slide"}>
        <form onSubmit={handleSave} className="space-y-5">

          {/* Image upload */}
          <div>
            <label className={labelCls}>
              Slide Image <span className="text-red-400">*</span>
              <span className="text-stone-600 font-normal ml-1">(recommended: 1600 × 900 px, max 10 MB)</span>
            </label>
            <MediaUploader
              bucket="media"
              folder="hero-carousel"
              maxSizeMb={10}
              onUploaded={url => f("imageUrl", url)}
              currentUrl={form.imageUrl || undefined}
              onRemoved={() => f("imageUrl", "")}
              label="Drop hero image here or click to browse"
            />
          </div>

          {/* Thumbnail preview of entered text + badge */}
          {(form.imageUrl || form.badgeLabelEn || form.titleEn) && (
            <div className="relative rounded-xl overflow-hidden h-24 bg-stone-900 border border-stone-800">
              {form.imageUrl && (
                <img src={form.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 to-transparent" />
              {form.badgeLabelEn && (
                <div className="absolute top-2 left-2">
                  <span className="text-[8px] uppercase tracking-widest font-black text-[color:var(--color-gold)] bg-stone-950/75 px-2 py-0.5 rounded-full border border-[color:var(--color-gold)]/30">
                    {form.badgeLabelEn}
                  </span>
                </div>
              )}
              {form.titleEn && (
                <div className="absolute bottom-2 left-2 right-2">
                  <p className="text-white font-bold text-xs truncate">{form.titleEn}</p>
                </div>
              )}
            </div>
          )}

          {/* Badge labels */}
          <div>
            <label className="text-stone-400 text-xs block mb-1.5 font-semibold">
              Badge Label <span className="text-stone-600 font-normal">(pill shown top-left of slide)</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>English</label>
                <input value={form.badgeLabelEn ?? ""} onChange={e => f("badgeLabelEn", e.target.value)}
                  placeholder="e.g. Featured Solution" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Français</label>
                <input value={form.badgeLabelFr ?? ""} onChange={e => f("badgeLabelFr", e.target.value)}
                  placeholder="ex. Solution Vedette" className={inputCls} />
              </div>
            </div>
          </div>

          {/* Titles */}
          <div>
            <label className="text-stone-400 text-xs block mb-1.5 font-semibold">Title</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>English</label>
                <input value={form.titleEn ?? ""} onChange={e => f("titleEn", e.target.value)}
                  placeholder="e.g. Cellular Vitality Pro" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Français</label>
                <input value={form.titleFr ?? ""} onChange={e => f("titleFr", e.target.value)}
                  placeholder="ex. Vitalité Cellulaire Pro" className={inputCls} />
              </div>
            </div>
          </div>

          {/* Subtitles */}
          <div>
            <label className="text-stone-400 text-xs block mb-1.5 font-semibold">Subtitle</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>English</label>
                <input value={form.subtitleEn ?? ""} onChange={e => f("subtitleEn", e.target.value)}
                  placeholder="Short tagline…" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Français</label>
                <input value={form.subtitleFr ?? ""} onChange={e => f("subtitleFr", e.target.value)}
                  placeholder="Accroche courte…" className={inputCls} />
              </div>
            </div>
          </div>

          {/* Benefits editor */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-stone-400 text-xs font-semibold">
                Benefit Chips <span className="text-stone-600 font-normal">(icon + label shown on slide)</span>
              </label>
              <button type="button" onClick={addBenefit}
                className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer">
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
            <div className="space-y-2">
              {(form.benefits ?? []).map((b, bi) => (
                <div key={bi} className="flex items-center gap-2 bg-stone-900 border border-stone-800 rounded-xl p-2">
                  {/* Icon picker */}
                  <select
                    value={b.icon}
                    onChange={e => updateBenefit(bi, "icon", e.target.value)}
                    className="bg-stone-800 border border-stone-700 rounded-lg text-white text-[11px] px-2 py-1.5 focus:outline-none focus:border-[#0A7D32] cursor-pointer flex-shrink-0"
                  >
                    {ICON_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <input
                    value={b.label_en}
                    onChange={e => updateBenefit(bi, "label_en", e.target.value)}
                    placeholder="Label EN"
                    className="flex-1 px-2 py-1.5 bg-stone-800 border border-stone-700 rounded-lg text-white text-[11px] focus:outline-none focus:border-[#0A7D32]"
                  />
                  <input
                    value={b.label_fr}
                    onChange={e => updateBenefit(bi, "label_fr", e.target.value)}
                    placeholder="Label FR"
                    className="flex-1 px-2 py-1.5 bg-stone-800 border border-stone-700 rounded-lg text-white text-[11px] focus:outline-none focus:border-[#0A7D32]"
                  />
                  <button type="button" onClick={() => removeBenefit(bi)}
                    className="text-stone-600 hover:text-red-400 transition-colors cursor-pointer flex-shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {(form.benefits ?? []).length === 0 && (
                <p className="text-stone-600 text-[11px] italic">No benefits yet — click Add to create one.</p>
              )}
            </div>
          </div>

          {/* CTA link */}
          <div>
            <label className={labelCls}>CTA Link <span className="text-stone-600 font-normal">(optional — where the slide links)</span></label>
            <input value={form.ctaLink ?? ""} onChange={e => f("ctaLink", e.target.value)}
              placeholder="https://…" type="url" className={inputCls} />
          </div>

          {/* Linked product */}
          <div>
            <label className={labelCls}>Linked Product <span className="text-stone-600 font-normal">(optional — overrides CTA link)</span></label>
            <select value={form.linkedProductId ?? ""} onChange={e => f("linkedProductId", e.target.value)}
              className={`${inputCls} cursor-pointer`}>
              <option value="">— None —</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {/* Sort order + Active */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Sort Order</label>
              <input type="number" min={0} value={form.sortOrder ?? 0}
                onChange={e => f("sortOrder", Number(e.target.value))} className={inputCls} />
            </div>
            <div className="flex flex-col justify-end pb-1">
              <label className={labelCls}>Active</label>
              <button type="button" onClick={() => f("isActive", !form.isActive)} className="cursor-pointer self-start">
                {form.isActive
                  ? <ToggleRight className="w-6 h-6 text-[#0A7D32]" />
                  : <ToggleLeft className="w-6 h-6 text-stone-500" />
                }
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Btn variant="secondary" onClick={() => setSlideOpen(false)} className="flex-1">Cancel</Btn>
            <Btn variant="primary" loading={saving} className="flex-1">
              {editing ? "Save Changes" : "Add Slide"}
            </Btn>
          </div>
        </form>
      </SlideOver>
    </PageShell>
  );
}
