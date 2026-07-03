import React from "react";
import { useState, useEffect } from "react";
import { Image, Plus, Trash2, Copy, Check } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import PageShell, { Card, Btn, SearchInput } from "../shared/PageShell";
import SlideOver from "../shared/SlideOver";
import EmptyState from "../shared/EmptyState";
import MediaUploader from "../../MediaUploader";

interface GalleryImage {
  id: string; url: string; captionEn: string; captionFr: string;
  displayOrder: number; uploadedAt: string;
}

const BLANK: Partial<GalleryImage> = { url: "", captionEn: "", captionFr: "", displayOrder: 0 };

export default function GalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [slideOpen, setSlideOpen] = useState(false);
  const [form, setForm] = useState<Partial<GalleryImage>>(BLANK);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState("");
  const [preview, setPreview] = useState<GalleryImage | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("gallery_images").select("*").order("display_order", { ascending: true });
    setImages((data ?? []).map(g => ({
      id: g.id, url: g.url ?? g.image_url ?? "", captionEn: g.caption_en ?? g.caption ?? "",
      captionFr: g.caption_fr ?? "", displayOrder: g.display_order ?? 0, uploadedAt: g.created_at ?? "",
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = images.filter(img => !search || img.captionEn.toLowerCase().includes(search.toLowerCase()));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    await supabase.from("gallery_images").insert({
      url: form.url, caption_en: form.captionEn || null, caption_fr: form.captionFr || null,
      display_order: Number(form.displayOrder ?? 0),
    });
    setSaving(false); setSlideOpen(false); load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this image from the gallery?")) return;
    await supabase.from("gallery_images").delete().eq("id", id);
    load();
  };

  const copy = (url: string) => {
    navigator.clipboard.writeText(url); setCopied(url);
    setTimeout(() => setCopied(""), 2000);
  };

  const f = (k: keyof GalleryImage, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <PageShell title="Gallery" subtitle={`${images.length} images`} actions={<Btn variant="primary" onClick={() => { setForm(BLANK); setSlideOpen(true); }}><Plus className="w-3.5 h-3.5" /> Add Image</Btn>}>
      <Card className="p-4">
        <div className="flex gap-3 mb-4">
          <SearchInput value={search} onChange={setSearch} placeholder="Search captions…" />
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square bg-stone-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Image} title="No gallery images yet" action={{ label: "Add first image", onClick: () => { setForm(BLANK); setSlideOpen(true); } }} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filtered.map(img => (
              <div key={img.id} className="group relative aspect-square rounded-xl overflow-hidden bg-stone-800 cursor-pointer" onClick={() => setPreview(img)}>
                <img src={img.url} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                  <p className="text-white text-[10px] leading-tight line-clamp-2 flex-1">{img.captionEn || "No caption"}</p>
                </div>
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={e => { e.stopPropagation(); copy(img.url); }}
                    className="p-1 bg-stone-900/80 rounded-lg text-white cursor-pointer hover:bg-stone-900">
                    {copied === img.url ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                  <button onClick={e => { e.stopPropagation(); handleDelete(img.id); }}
                    className="p-1 bg-red-900/80 rounded-lg text-white cursor-pointer hover:bg-red-900">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Add slide-over */}
      <SlideOver open={slideOpen} onClose={() => setSlideOpen(false)} title="Add Gallery Image">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-stone-400 text-xs block mb-2">Image *</label>
            <MediaUploader bucket="media" onUploaded={url => f("url", url)} /* no currentUrl */ />
          </div>
          <div>
            <label className="text-stone-400 text-xs block mb-1.5">Caption (EN)</label>
            <input value={form.captionEn ?? ""} onChange={e => f("captionEn", e.target.value)}
              className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32]" />
          </div>
          <div>
            <label className="text-stone-400 text-xs block mb-1.5">Caption (FR)</label>
            <input value={form.captionFr ?? ""} onChange={e => f("captionFr", e.target.value)}
              className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32]" />
          </div>
          <div>
            <label className="text-stone-400 text-xs block mb-1.5">Display Order</label>
            <input type="number" value={form.displayOrder ?? 0} onChange={e => f("displayOrder", Number(e.target.value))}
              className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32]" />
          </div>
          <div className="flex gap-3 pt-2">
            <Btn variant="secondary" onClick={() => setSlideOpen(false)} className="flex-1">Cancel</Btn>
            <Btn variant="primary" loading={saving} disabled={!form.url} className="flex-1">Add to Gallery</Btn>
          </div>
        </form>
      </SlideOver>

      {/* Fullscreen preview */}
      {preview && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="relative max-w-4xl max-h-[90vh]">
            <img src={preview.url} className="max-w-full max-h-[85vh] rounded-2xl object-contain" />
            {preview.captionEn && (
              <p className="text-white text-sm text-center mt-3">{preview.captionEn}</p>
            )}
          </div>
        </div>
      )}
    </PageShell>
  );
}
