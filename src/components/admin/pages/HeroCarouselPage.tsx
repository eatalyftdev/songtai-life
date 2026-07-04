import React, { useState, useEffect, useCallback } from "react";
import { Sliders, Plus, Edit, Trash2, ToggleLeft, ToggleRight, GripVertical, Eye, EyeOff } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import PageShell, { Card, TableWrapper, Th, Td, Btn, SearchInput } from "../shared/PageShell";
import SlideOver from "../shared/SlideOver";
import { SkeletonTable } from "../shared/Skeleton";
import EmptyState from "../shared/EmptyState";
import MediaUploader from "../../MediaUploader";

interface Slide {
  id: string;
  imageUrl: string;
  titleEn: string;
  titleFr: string;
  subtitleEn: string;
  subtitleFr: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

const BLANK: Partial<Slide> = {
  imageUrl: "", titleEn: "", titleFr: "", subtitleEn: "", subtitleFr: "",
  sortOrder: 0, isActive: true,
};

async function log(action: string, details: string) {
  await supabase.from("audit_logs").insert({ action, details });
}

export default function HeroCarouselPage() {
  const [slides, setSlides] = useState<Slide[]>([]);
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
      sortOrder: r.sort_order ?? 0,
      isActive: r.is_active ?? true,
      createdAt: r.created_at ?? "",
    })));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.imageUrl) { alert("Please upload a carousel image before saving."); return; }
    setSaving(true);
    const payload = {
      image_url: form.imageUrl,
      title_en: form.titleEn || null,
      title_fr: form.titleFr || null,
      subtitle_en: form.subtitleEn || null,
      subtitle_fr: form.subtitleFr || null,
      sort_order: Number(form.sortOrder ?? 0),
      is_active: form.isActive ?? true,
    };
    const { error } = editing
      ? await supabase.from("hero_carousel").update(payload).eq("id", editing.id)
      : await supabase.from("hero_carousel").insert(payload);
    if (error) { alert(`Error saving slide: ${error.message}`); setSaving(false); return; }
    await log(editing ? "Hero Carousel Slide Updated" : "Hero Carousel Slide Created", form.titleEn ?? "(untitled)");
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

  return (
    <PageShell
      title="Hero Carousel"
      subtitle={`${slides.length} slides · ${activeCount} active`}
      actions={<Btn variant="primary" onClick={openAdd}><Plus className="w-3.5 h-3.5" /> Add Slide</Btn>}
    >
      {/* Preview note */}
      <div className="flex items-start gap-2 p-3 bg-stone-900/60 border border-stone-800 rounded-xl text-xs text-stone-400 mb-1">
        <Eye className="w-4 h-4 text-stone-500 flex-shrink-0 mt-0.5" />
        <span>
          The carousel on the homepage shows all <span className="text-white font-semibold">active</span> slides in sort-order.
          Images are uploaded directly to Supabase Storage — no external links.
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
              <Th>Title (EN)</Th>
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
                    description="Add your first hero image to get started."
                    action={{ label: "Add Slide", onClick: openAdd }}
                  />
                </td></tr>
              ) : filtered.map((s, idx) => (
                <tr key={s.id} className="border-b border-stone-800/50 hover:bg-stone-800/20 transition-colors">
                  <Td>
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-stone-400 text-xs w-5 text-right">{s.sortOrder}</span>
                      <div className="flex flex-col gap-0.5 ml-1">
                        <button
                          onClick={() => handleMoveOrder(s, "up")}
                          disabled={idx === 0}
                          className="text-stone-600 hover:text-stone-300 disabled:opacity-20 cursor-pointer transition-colors"
                        >
                          <GripVertical className="w-3 h-3 rotate-90" />
                        </button>
                        <button
                          onClick={() => handleMoveOrder(s, "down")}
                          disabled={idx === filtered.length - 1}
                          className="text-stone-600 hover:text-stone-300 disabled:opacity-20 cursor-pointer transition-colors"
                        >
                          <GripVertical className="w-3 h-3 -rotate-90" />
                        </button>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    {s.imageUrl ? (
                      <img
                        src={s.imageUrl}
                        alt=""
                        className="w-24 h-14 rounded-lg object-cover border border-stone-700 bg-stone-900"
                      />
                    ) : (
                      <div className="w-24 h-14 rounded-lg bg-stone-800 border border-stone-700 flex items-center justify-center">
                        <Sliders className="w-4 h-4 text-stone-600" />
                      </div>
                    )}
                  </Td>
                  <Td>
                    <p className="text-white font-medium text-sm">{s.titleEn || <span className="text-stone-600 italic">—</span>}</p>
                    {s.subtitleEn && <p className="text-stone-500 text-[11px] mt-0.5 truncate max-w-[180px]">{s.subtitleEn}</p>}
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

      {/* Edit / Add Slide Panel */}
      <SlideOver open={slideOpen} onClose={() => setSlideOpen(false)} title={editing ? "Edit Slide" : "New Carousel Slide"}>
        <form onSubmit={handleSave} className="space-y-5">

          {/* Image upload — required */}
          <div>
            <label className="text-stone-400 text-xs block mb-2 font-semibold">
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

          {/* Titles */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-stone-400 text-xs block mb-1.5">Title (English)</label>
              <input
                value={form.titleEn ?? ""}
                onChange={e => f("titleEn", e.target.value)}
                placeholder="e.g. Cellular Vitality Pro"
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32]"
              />
            </div>
            <div>
              <label className="text-stone-400 text-xs block mb-1.5">Titre (Français)</label>
              <input
                value={form.titleFr ?? ""}
                onChange={e => f("titleFr", e.target.value)}
                placeholder="ex. Vitalité Cellulaire Pro"
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32]"
              />
            </div>
          </div>

          {/* Subtitles */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-stone-400 text-xs block mb-1.5">Subtitle (English)</label>
              <input
                value={form.subtitleEn ?? ""}
                onChange={e => f("subtitleEn", e.target.value)}
                placeholder="Short tagline…"
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32]"
              />
            </div>
            <div>
              <label className="text-stone-400 text-xs block mb-1.5">Sous-titre (Français)</label>
              <input
                value={form.subtitleFr ?? ""}
                onChange={e => f("subtitleFr", e.target.value)}
                placeholder="Accroche courte…"
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32]"
              />
            </div>
          </div>

          {/* Sort order + Active */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-stone-400 text-xs block mb-1.5">Sort Order</label>
              <input
                type="number"
                min={0}
                value={form.sortOrder ?? 0}
                onChange={e => f("sortOrder", Number(e.target.value))}
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32]"
              />
            </div>
            <div className="flex flex-col justify-end pb-1">
              <label className="text-stone-400 text-xs mb-1.5">Active</label>
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
