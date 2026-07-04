import React, { useState, useEffect } from "react";
import { Star, Plus, Edit, Trash2, ToggleLeft, ToggleRight, AlertCircle } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import PageShell, { Card, TableWrapper, Th, Td, Btn, SearchInput } from "../shared/PageShell";
import SlideOver from "../shared/SlideOver";
import { SkeletonTable } from "../shared/Skeleton";
import EmptyState from "../shared/EmptyState";
import MediaUploader from "../../MediaUploader";

interface Testimonial {
  id: string; name: string; rank: string; region: string;
  quoteEn: string; quoteFr: string; videoUrl: string;
  isFeatured: boolean; displayOrder: number; imageUrl: string;
}

const BLANK: Partial<Testimonial> = { name: "", rank: "bronze", region: "", quoteEn: "", quoteFr: "", videoUrl: "", isFeatured: false, displayOrder: 0, imageUrl: "" };

// ── YouTube / Vimeo URL input with embed preview ──────────────────────────
const YOUTUBE_RE = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/;
const VIMEO_RE   = /vimeo\.com\/(\d+)/;

const ALLOWED_VIDEO_HOSTS = new Set(["youtube.com","www.youtube.com","youtu.be","vimeo.com","www.vimeo.com"]);

function getEmbedUrl(url: string): string | null {
  const yt = url.match(YOUTUBE_RE);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  const vi = url.match(VIMEO_RE);
  if (vi) return `https://player.vimeo.com/video/${vi[1]}`;
  return null;
}

function isValidVideoUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return ALLOWED_VIDEO_HOSTS.has(hostname.toLowerCase());
  } catch { return false; }
}

function VideoUrlInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [dirty, setDirty] = useState(false);
  const invalid = dirty && value !== "" && !isValidVideoUrl(value);
  const embedUrl = value && isValidVideoUrl(value) ? getEmbedUrl(value) : null;

  return (
    <div className="space-y-2">
      <input
        value={value}
        onChange={e => { onChange(e.target.value); setDirty(true); }}
        onBlur={() => setDirty(true)}
        placeholder="https://youtube.com/watch?v=… or https://vimeo.com/…"
        className={`w-full px-3 py-2 bg-stone-800 border rounded-xl text-white text-xs focus:outline-none transition-colors ${
          invalid ? "border-red-500 focus:border-red-400" : "border-stone-700 focus:border-[#0A7D32]"
        }`}
      />
      {invalid && (
        <p className="flex items-center gap-1 text-[10px] text-red-400">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          Must be a YouTube or Vimeo URL (or leave blank)
        </p>
      )}
      {embedUrl && (
        <div className="aspect-video w-full rounded-xl overflow-hidden border border-stone-700 bg-stone-950">
          <iframe
            src={embedUrl}
            className="w-full h-full"
            allow="autoplay; encrypted-media"
            allowFullScreen
            title="Video preview"
          />
        </div>
      )}
      {value && isValidVideoUrl(value) && !embedUrl && (
        <p className="text-[10px] text-stone-500">Could not generate embed preview for this URL.</p>
      )}
    </div>
  );
}

export default function TestimonialsPage() {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [slideOpen, setSlideOpen] = useState(false);
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [form, setForm] = useState<Partial<Testimonial>>(BLANK);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("testimonials").select("*").order("display_order", { ascending: true });
    setItems((data ?? []).map(t => ({
      id: t.id, name: t.name ?? "", rank: t.rank ?? "bronze", region: t.region ?? "",
      quoteEn: t.quote_en ?? t.quote ?? "", quoteFr: t.quote_fr ?? "",
      videoUrl: t.video_url ?? "", isFeatured: t.is_featured ?? false,
      displayOrder: t.display_order ?? 0, imageUrl: t.image_url ?? "",
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = items.filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()));

  const openAdd = () => { setEditing(null); setForm(BLANK); setSlideOpen(true); };
  const openEdit = (t: Testimonial) => { setEditing(t); setForm(t); setSlideOpen(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    // Enforce video URL: must be blank or a trusted YouTube/Vimeo URL
    if (form.videoUrl && !isValidVideoUrl(form.videoUrl)) {
      alert("Video URL must be a valid YouTube or Vimeo URL, or leave it blank.");
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name, rank: form.rank, region: form.region,
      quote_en: form.quoteEn, quote_fr: form.quoteFr || null,
      video_url: form.videoUrl || null, is_featured: form.isFeatured,
      display_order: Number(form.displayOrder ?? 0), image_url: form.imageUrl || null,
    };
    const { error } = editing
      ? await supabase.from("testimonials").update(payload).eq("id", editing.id)
      : await supabase.from("testimonials").insert(payload);
    if (error) { alert(`Error saving testimonial: ${error.message}`); setSaving(false); return; }
    setSaving(false); setSlideOpen(false); load();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete testimonial from ${name}?`)) return;
    await supabase.from("testimonials").delete().eq("id", id);
    load();
  };

  const toggleFeatured = async (t: Testimonial) => {
    await supabase.from("testimonials").update({ is_featured: !t.isFeatured }).eq("id", t.id);
    setItems(prev => prev.map(x => x.id === t.id ? { ...x, isFeatured: !x.isFeatured } : x));
  };

  const f = (k: keyof Testimonial, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <PageShell title="Testimonials" subtitle={`${items.length} testimonials`} actions={<Btn variant="primary" onClick={openAdd}><Plus className="w-3.5 h-3.5" /> Add Testimonial</Btn>}>
      <Card>
        <div className="flex gap-3 p-4 border-b border-stone-800">
          <SearchInput value={search} onChange={setSearch} placeholder="Search by name…" />
        </div>
        <TableWrapper>
          <thead><tr><Th>Person</Th><Th>Rank</Th><Th>Region</Th><Th>Quote Preview</Th><Th>Featured</Th><Th>Order</Th><Th>Actions</Th></tr></thead>
          {loading ? <SkeletonTable cols={7} /> : (
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7}><EmptyState icon={Star} title="No testimonials yet" action={{ label: "Add first testimonial", onClick: openAdd }} /></td></tr>
              ) : filtered.map(t => (
                <tr key={t.id} className="border-b border-stone-800/50 hover:bg-stone-800/20">
                  <Td>
                    <div className="flex items-center gap-2">
                      {t.imageUrl && <img src={t.imageUrl} className="w-7 h-7 rounded-full object-cover bg-stone-800 flex-shrink-0" />}
                      <span className="text-white text-xs font-medium">{t.name}</span>
                    </div>
                  </Td>
                  <Td><span className="text-[#C9A227] text-[11px] capitalize">{t.rank}</span></Td>
                  <Td><span className="text-stone-400 text-[11px]">{t.region || "—"}</span></Td>
                  <Td><span className="text-stone-500 text-[11px] truncate block max-w-48">{t.quoteEn.slice(0, 60)}…</span></Td>
                  <Td>
                    <button onClick={() => toggleFeatured(t)} className="cursor-pointer">
                      {t.isFeatured ? <ToggleRight className="w-5 h-5 text-[#0A7D32]" /> : <ToggleLeft className="w-5 h-5 text-stone-500" />}
                    </button>
                  </Td>
                  <Td><span className="text-stone-500 font-mono text-[11px]">{t.displayOrder}</span></Td>
                  <Td>
                    <div className="flex gap-1.5">
                      <Btn variant="ghost" size="xs" onClick={() => openEdit(t)}><Edit className="w-3 h-3" /></Btn>
                      <Btn variant="danger" size="xs" onClick={() => handleDelete(t.id, t.name)}><Trash2 className="w-3 h-3" /></Btn>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          )}
        </TableWrapper>
      </Card>

      <SlideOver open={slideOpen} onClose={() => setSlideOpen(false)} title={editing ? "Edit Testimonial" : "New Testimonial"}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-stone-400 text-xs block mb-1.5">Name *</label>
              <input value={form.name ?? ""} onChange={e => f("name", e.target.value)} required
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32]" />
            </div>
            <div>
              <label className="text-stone-400 text-xs block mb-1.5">Rank</label>
              <select value={form.rank ?? "bronze"} onChange={e => f("rank", e.target.value)}
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32] cursor-pointer">
                {["bronze","silver","gold","platinum","diamond"].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-stone-400 text-xs block mb-1.5">Region</label>
              <input value={form.region ?? ""} onChange={e => f("region", e.target.value)}
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32]" />
            </div>
            <div>
              <label className="text-stone-400 text-xs block mb-1.5">Display Order</label>
              <input type="number" value={form.displayOrder ?? 0} onChange={e => f("displayOrder", Number(e.target.value))}
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32]" />
            </div>
          </div>
          <div>
            <label className="text-stone-400 text-xs block mb-1.5">Quote (EN) *</label>
            <textarea value={form.quoteEn ?? ""} onChange={e => f("quoteEn", e.target.value)} required rows={3}
              className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32] resize-none" />
          </div>
          <div>
            <label className="text-stone-400 text-xs block mb-1.5">Quote (FR)</label>
            <textarea value={form.quoteFr ?? ""} onChange={e => f("quoteFr", e.target.value)} rows={3}
              className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32] resize-none" />
          </div>
          <div>
            <label className="text-stone-400 text-xs block mb-1.5">Video URL <span className="text-stone-600">(YouTube or Vimeo)</span></label>
            <VideoUrlInput value={form.videoUrl ?? ""} onChange={v => f("videoUrl", v)} />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-stone-400 text-xs">Featured</label>
            <button type="button" onClick={() => f("isFeatured", !form.isFeatured)} className="cursor-pointer">
              {form.isFeatured ? <ToggleRight className="w-6 h-6 text-[#0A7D32]" /> : <ToggleLeft className="w-6 h-6 text-stone-500" />}
            </button>
          </div>
          <div>
            <label className="text-stone-400 text-xs block mb-2">Photo</label>
            <MediaUploader bucket="testimonials" folder="testimonials" onUploaded={url => f("imageUrl", url)} currentUrl={form.imageUrl || undefined} onRemoved={() => f("imageUrl", "")} />
          </div>
          <div className="flex gap-3 pt-2">
            <Btn variant="secondary" onClick={() => setSlideOpen(false)} className="flex-1">Cancel</Btn>
            <Btn variant="primary" loading={saving} className="flex-1">{editing ? "Save" : "Add"}</Btn>
          </div>
        </form>
      </SlideOver>
    </PageShell>
  );
}
