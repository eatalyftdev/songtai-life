import React from "react";
import { useState, useEffect, useCallback } from "react";
import { Image, Plus, Trash2, Copy, Check, Edit, FolderOpen } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import PageShell, { Card, Btn, SearchInput, TableWrapper, Th, Td } from "../shared/PageShell";
import SlideOver from "../shared/SlideOver";
import EmptyState from "../shared/EmptyState";
import MediaUploader from "../../MediaUploader";

interface GalleryImage {
  id: string; url: string; captionEn: string; captionFr: string;
  displayOrder: number; albumId: string | null; uploadedAt: string;
}

interface GalleryAlbum {
  id: string; nameEn: string; nameFr: string; displayOrder: number;
}

const BLANK_IMG: Partial<GalleryImage> = { url: "", captionEn: "", captionFr: "", displayOrder: 0, albumId: null };
const BLANK_ALB: Partial<GalleryAlbum> = { nameEn: "", nameFr: "", displayOrder: 0 };

async function log(action: string, details: string) {
  await supabase.from("audit_logs").insert({ action, details });
}

export default function GalleryPage() {
  const [tab, setTab] = useState<"images" | "albums">("images");

  // images
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [albumFilter, setAlbumFilter] = useState("all");
  const [imgSlideOpen, setImgSlideOpen] = useState(false);
  const [editingImg, setEditingImg] = useState<GalleryImage | null>(null);
  const [imgForm, setImgForm] = useState<Partial<GalleryImage>>(BLANK_IMG);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState("");
  const [preview, setPreview] = useState<GalleryImage | null>(null);

  // albums
  const [albums, setAlbums] = useState<GalleryAlbum[]>([]);
  const [albSlideOpen, setAlbSlideOpen] = useState(false);
  const [editingAlb, setEditingAlb] = useState<GalleryAlbum | null>(null);
  const [albForm, setAlbForm] = useState<Partial<GalleryAlbum>>(BLANK_ALB);
  const [albSaving, setAlbSaving] = useState(false);

  // ── Loaders ──────────────────────────────────────────────────

  const loadAlbums = useCallback(async () => {
    const { data } = await supabase.from("gallery_albums").select("*").order("display_order");
    setAlbums((data ?? []).map((a: any) => ({
      id: a.id, nameEn: a.name_en ?? "", nameFr: a.name_fr ?? "", displayOrder: a.display_order ?? 0,
    })));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("gallery_images").select("*").order("display_order", { ascending: true });
    setImages((data ?? []).map((g: any) => ({
      id: g.id,
      url: g.url ?? g.image_url ?? "",
      captionEn: g.caption_en ?? g.caption ?? "",
      captionFr: g.caption_fr ?? "",
      displayOrder: g.display_order ?? 0,
      albumId: g.album_id ?? null,
      uploadedAt: g.created_at ?? "",
    })));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    loadAlbums();
    const ch = supabase.channel("admin_gallery_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "gallery_images" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "gallery_albums" }, loadAlbums)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load, loadAlbums]);

  // ── Image handlers ───────────────────────────────────────────

  const openAddImg = () => { setEditingImg(null); setImgForm(BLANK_IMG); setImgSlideOpen(true); };
  const openEditImg = (img: GalleryImage, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingImg(img);
    setImgForm(img);
    setImgSlideOpen(true);
  };

  const handleSaveImg = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const payload = {
      url: imgForm.url,
      caption_en: imgForm.captionEn || null,
      caption_fr: imgForm.captionFr || null,
      display_order: Number(imgForm.displayOrder ?? 0),
      album_id: imgForm.albumId || null,
    };
    const { error } = editingImg
      ? await supabase.from("gallery_images").update(payload).eq("id", editingImg.id)
      : await supabase.from("gallery_images").insert(payload);
    if (error) { alert(`Error saving image: ${error.message}`); setSaving(false); return; }
    await log(editingImg ? "Gallery Image Updated" : "Gallery Image Added", imgForm.captionEn ?? imgForm.url ?? "");
    setSaving(false); setImgSlideOpen(false); load();
  };

  const handleDeleteImg = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Remove this image from the gallery?")) return;
    await supabase.from("gallery_images").delete().eq("id", id);
    await log("Gallery Image Deleted", id);
    load();
  };

  const copy = (url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url); setCopied(url);
    setTimeout(() => setCopied(""), 2000);
  };

  const fi = (k: keyof GalleryImage, v: any) => setImgForm(prev => ({ ...prev, [k]: v }));

  // ── Album handlers ───────────────────────────────────────────

  const openAddAlb = () => { setEditingAlb(null); setAlbForm(BLANK_ALB); setAlbSlideOpen(true); };
  const openEditAlb = (a: GalleryAlbum) => { setEditingAlb(a); setAlbForm(a); setAlbSlideOpen(true); };

  const handleSaveAlb = async (e: React.FormEvent) => {
    e.preventDefault(); setAlbSaving(true);
    const payload = { name_en: albForm.nameEn!, name_fr: albForm.nameFr || null, display_order: Number(albForm.displayOrder ?? 0) };
    const { error } = editingAlb
      ? await supabase.from("gallery_albums").update(payload).eq("id", editingAlb.id)
      : await supabase.from("gallery_albums").insert(payload);
    if (error) { alert(`Error saving album: ${error.message}`); setAlbSaving(false); return; }
    await log(editingAlb ? "Gallery Album Updated" : "Gallery Album Created", albForm.nameEn ?? "");
    setAlbSaving(false); setAlbSlideOpen(false); loadAlbums();
  };

  const handleDeleteAlb = async (a: GalleryAlbum) => {
    const count = images.filter(img => img.albumId === a.id).length;
    if (count > 0) {
      alert(`"${a.nameEn}" has ${count} image${count === 1 ? "" : "s"} — reassign or remove them first.`);
      return;
    }
    if (!confirm(`Delete album "${a.nameEn}"?`)) return;
    await supabase.from("gallery_albums").delete().eq("id", a.id);
    await log("Gallery Album Deleted", a.nameEn);
    loadAlbums();
  };

  const fa = (k: keyof GalleryAlbum, v: any) => setAlbForm(prev => ({ ...prev, [k]: v }));

  // ── Filtered images ──────────────────────────────────────────

  const albumName = (id: string | null) => albums.find(a => a.id === id)?.nameEn ?? "—";

  const filtered = images.filter(img => {
    const matchesSearch = !search || img.captionEn.toLowerCase().includes(search.toLowerCase());
    const matchesAlbum = albumFilter === "all" || img.albumId === albumFilter;
    return matchesSearch && matchesAlbum;
  });

  // ── Render ───────────────────────────────────────────────────

  return (
    <PageShell
      title="Gallery"
      subtitle={`${images.length} images · ${albums.length} albums`}
      actions={
        tab === "images"
          ? <Btn variant="primary" onClick={openAddImg}><Plus className="w-3.5 h-3.5" /> Add Image</Btn>
          : <Btn variant="primary" onClick={openAddAlb}><Plus className="w-3.5 h-3.5" /> Add Album</Btn>
      }
    >
      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-stone-900 border border-stone-800 rounded-xl w-fit">
        {([["images", "Images"], ["albums", "Albums"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              tab === key ? "bg-[#0A7D32] text-white" : "text-stone-400 hover:text-white"
            }`}>{label}</button>
        ))}
      </div>

      {/* ── IMAGES TAB ── */}
      {tab === "images" && (
        <Card className="p-4">
          <div className="flex flex-wrap gap-3 mb-4">
            <SearchInput value={search} onChange={setSearch} placeholder="Search captions…" />
            <select
              value={albumFilter}
              onChange={e => setAlbumFilter(e.target.value)}
              className="px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32]"
            >
              <option value="all">All Albums</option>
              {albums.map(a => <option key={a.id} value={a.id}>{a.nameEn}</option>)}
            </select>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-square bg-stone-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={Image} title="No gallery images yet" action={{ label: "Add first image", onClick: openAddImg }} />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filtered.map(img => (
                <div
                  key={img.id}
                  className="group relative aspect-square rounded-xl overflow-hidden bg-stone-800 cursor-pointer"
                  onClick={() => setPreview(img)}
                >
                  <img src={img.url} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt="" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                    <p className="text-white text-[10px] leading-tight line-clamp-2 flex-1">{img.captionEn || albumName(img.albumId) || "No caption"}</p>
                  </div>
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={e => copy(img.url, e)}
                      className="p-1 bg-stone-900/80 rounded-lg text-white cursor-pointer hover:bg-stone-900">
                      {copied === img.url ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                    <button onClick={e => openEditImg(img, e)}
                      className="p-1 bg-stone-900/80 rounded-lg text-white cursor-pointer hover:bg-stone-900">
                      <Edit className="w-3 h-3" />
                    </button>
                    <button onClick={e => handleDeleteImg(img.id, e)}
                      className="p-1 bg-red-900/80 rounded-lg text-white cursor-pointer hover:bg-red-900">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ── ALBUMS TAB ── */}
      {tab === "albums" && (
        <Card>
          <TableWrapper>
            <thead>
              <tr>
                <Th>Album Name</Th>
                <Th>Name (FR)</Th>
                <Th>Images</Th>
                <Th>Order</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {albums.length === 0 ? (
                <tr><td colSpan={5}>
                  <EmptyState icon={FolderOpen} title="No albums yet" action={{ label: "Add Album", onClick: openAddAlb }} />
                </td></tr>
              ) : albums.map(a => (
                <tr key={a.id} className="border-b border-stone-800/50 hover:bg-stone-800/20 transition-colors">
                  <Td><span className="text-white font-medium">{a.nameEn}</span></Td>
                  <Td><span className="text-stone-400">{a.nameFr || <span className="text-stone-600 italic">—</span>}</span></Td>
                  <Td><span className="font-mono text-[#C9A227] font-semibold">{images.filter(img => img.albumId === a.id).length}</span></Td>
                  <Td><span className="font-mono text-stone-400">{a.displayOrder}</span></Td>
                  <Td>
                    <div className="flex items-center gap-1.5">
                      <Btn variant="ghost" size="xs" onClick={() => openEditAlb(a)}><Edit className="w-3 h-3" /></Btn>
                      <Btn variant="danger" size="xs" onClick={() => handleDeleteAlb(a)}><Trash2 className="w-3 h-3" /></Btn>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrapper>
        </Card>
      )}

      {/* ── Add / Edit Image slide-over ── */}
      <SlideOver open={imgSlideOpen} onClose={() => setImgSlideOpen(false)} title={editingImg ? "Edit Gallery Image" : "Add Gallery Image"}>
        <form onSubmit={handleSaveImg} className="space-y-4">
          <div>
            <label className="text-stone-400 text-xs block mb-2">Image *</label>
            {editingImg && imgForm.url && (
              <img src={imgForm.url} className="w-full h-32 object-cover rounded-xl mb-2" alt="" />
            )}
            <MediaUploader bucket="media" folder="gallery" onUploaded={url => fi("url", url)} label={editingImg ? "Replace image" : "Drop files here or click to browse"} />
          </div>
          <div>
            <label className="text-stone-400 text-xs block mb-1.5">Album</label>
            <select
              value={imgForm.albumId ?? ""}
              onChange={e => fi("albumId", e.target.value || null)}
              className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32]"
            >
              <option value="">— No album —</option>
              {albums.map(a => <option key={a.id} value={a.id}>{a.nameEn}</option>)}
            </select>
          </div>
          <div>
            <label className="text-stone-400 text-xs block mb-1.5">Caption (EN)</label>
            <input value={imgForm.captionEn ?? ""} onChange={e => fi("captionEn", e.target.value)}
              className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32]" />
          </div>
          <div>
            <label className="text-stone-400 text-xs block mb-1.5">Caption (FR)</label>
            <input value={imgForm.captionFr ?? ""} onChange={e => fi("captionFr", e.target.value)}
              className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32]" />
          </div>
          <div>
            <label className="text-stone-400 text-xs block mb-1.5">Display Order</label>
            <input type="number" value={imgForm.displayOrder ?? 0} onChange={e => fi("displayOrder", Number(e.target.value))}
              className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32]" />
          </div>
          <div className="flex gap-3 pt-2">
            <Btn variant="secondary" onClick={() => setImgSlideOpen(false)} className="flex-1">Cancel</Btn>
            <Btn variant="primary" loading={saving} disabled={!imgForm.url && !editingImg} className="flex-1">
              {editingImg ? "Save Changes" : "Add to Gallery"}
            </Btn>
          </div>
        </form>
      </SlideOver>

      {/* ── Add / Edit Album slide-over ── */}
      <SlideOver open={albSlideOpen} onClose={() => setAlbSlideOpen(false)} title={editingAlb ? "Edit Album" : "New Album"}>
        <form onSubmit={handleSaveAlb} className="space-y-4">
          <div>
            <label className="text-stone-400 text-xs block mb-1.5">Name (English) *</label>
            <input required value={albForm.nameEn ?? ""} onChange={e => fa("nameEn", e.target.value)}
              className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32]" />
          </div>
          <div>
            <label className="text-stone-400 text-xs block mb-1.5">Name (Français)</label>
            <input value={albForm.nameFr ?? ""} onChange={e => fa("nameFr", e.target.value)}
              className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32]" />
          </div>
          <div>
            <label className="text-stone-400 text-xs block mb-1.5">Display Order</label>
            <input type="number" value={albForm.displayOrder ?? 0} onChange={e => fa("displayOrder", Number(e.target.value))}
              className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32]" />
          </div>
          <div className="flex gap-3 pt-2">
            <Btn variant="secondary" onClick={() => setAlbSlideOpen(false)} className="flex-1">Cancel</Btn>
            <Btn variant="primary" loading={albSaving} className="flex-1">{editingAlb ? "Save Changes" : "Create Album"}</Btn>
          </div>
        </form>
      </SlideOver>

      {/* Fullscreen preview */}
      {preview && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="relative max-w-4xl max-h-[90vh]">
            <img src={preview.url} className="max-w-full max-h-[85vh] rounded-2xl object-contain" alt="" />
            {preview.captionEn && (
              <p className="text-white text-sm text-center mt-3">{preview.captionEn}</p>
            )}
          </div>
        </div>
      )}
    </PageShell>
  );
}
