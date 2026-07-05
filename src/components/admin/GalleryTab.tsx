import { useState, type FormEvent } from "react";
import { Plus, Trash2, X, Image as ImageIcon } from "lucide-react";
import { useAdminResource } from "../../hooks/useAdminResource";
import MediaUploader from "../MediaUploader";

interface GalleryImage {
  id: string;
  url: string;
  caption: string;
  captionFr: string;
  album: string;
  displayOrder: number;
}

interface GalleryTabProps {
  addNotification: (msg: string, type: "success" | "info" | "gold") => void;
}

const blank = (): Omit<GalleryImage, "id"> => ({
  url: "", caption: "", captionFr: "", album: "General", displayOrder: 0,
});

export default function GalleryTab({ addNotification }: GalleryTabProps) {
  const { data: images, loading, insert, remove } = useAdminResource<GalleryImage>({
    tableName: "gallery_images",
    orderBy: { column: "display_order", ascending: true },
    map: r => ({
      id: r.id,
      url: r.url ?? r.image_url ?? "",
      caption: r.caption ?? r.caption_en ?? "",
      captionFr: r.caption_fr ?? "",
      album: r.album ?? "General",
      displayOrder: r.display_order ?? 0,
    }),
  });

  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState(blank());
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [albumFilter, setAlbumFilter] = useState("All");

  const albums = ["All", ...Array.from(new Set(images.map(i => i.album).filter(Boolean)))];
  const filtered = albumFilter === "All" ? images : images.filter(i => i.album === albumFilter);

  const handleUploaded = (url: string) => {
    setUploadedUrl(url);
    setForm(f => ({ ...f, url }));
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    const url = form.url || uploadedUrl;
    if (!url) { addNotification("Please provide or upload an image.", "info"); return; }
    setSaving(true);
    const { error } = await insert({
      url,
      caption: form.caption || null,
      caption_fr: form.captionFr || null,
      album: form.album || "General",
      display_order: Number(form.displayOrder),
    });
    setSaving(false);
    if (error) { addNotification("Error saving image: " + error.message, "info"); return; }
    addNotification("Image added to gallery.", "success");
    setIsAdding(false);
    setForm(blank());
    setUploadedUrl("");
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Remove this image from the gallery?")) return;
    const { error } = await remove(id);
    if (error) addNotification("Error deleting image.", "info");
    else addNotification("Image removed.", "success");
  };

  const inputCls = "w-full px-3 py-2 bg-stone-950 border border-stone-800 focus:border-[#ecc246] rounded-lg text-sm text-white outline-none";
  const labelCls = "text-stone-400 text-[10px] uppercase font-black block mb-1.5";

  return (
    <div className="space-y-6 text-left animate-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-extrabold text-lg text-stone-100">Gallery</h3>
          <p className="text-xs text-stone-500">Upload and organise photos across albums.</p>
        </div>
        <button onClick={() => { setIsAdding(true); setForm(blank()); setUploadedUrl(""); }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg cursor-pointer">
          <Plus className="w-3.5 h-3.5" />Add Image
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSave} className="bg-stone-900 border border-stone-800 rounded-xl p-6 space-y-4 max-w-2xl">
          <div className="flex justify-between items-center pb-2 border-b border-stone-800">
            <h4 className="font-bold text-sm text-stone-100">Add Gallery Image</h4>
            <button type="button" onClick={() => setIsAdding(false)} className="text-stone-500 hover:text-stone-200 cursor-pointer"><X className="w-4 h-4" /></button>
          </div>

          {/* Upload or URL */}
          <div>
            <label className={labelCls}>Upload to Storage</label>
            <MediaUploader
              bucket="media"
              onUploaded={handleUploaded}
              accept="image/*"
              label="Drop an image here or click to browse"
            />
          </div>
          <div>
            <label className={labelCls}>— or paste an image URL —</label>
            <input type="url" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
              placeholder="https://..." className={inputCls} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className={labelCls}>Caption (EN)</label><input value={form.caption} onChange={e => setForm(f => ({ ...f, caption: e.target.value }))} className={inputCls} /></div>
            <div><label className={labelCls}>Caption (FR)</label><input value={form.captionFr} onChange={e => setForm(f => ({ ...f, captionFr: e.target.value }))} className={inputCls} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelCls}>Album</label><input value={form.album} onChange={e => setForm(f => ({ ...f, album: e.target.value }))} placeholder="General" className={inputCls} /></div>
            <div><label className={labelCls}>Display Order</label><input type="number" value={form.displayOrder} onChange={e => setForm(f => ({ ...f, displayOrder: Number(e.target.value) }))} className={inputCls} /></div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 bg-stone-800 text-stone-400 text-xs rounded-lg cursor-pointer">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg cursor-pointer disabled:opacity-60">
              {saving ? "Saving…" : "Save Image"}
            </button>
          </div>
        </form>
      )}

      {/* Album filter */}
      {albums.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {albums.map(a => (
            <button key={a} onClick={() => setAlbumFilter(a)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${albumFilter === a ? "bg-[#ecc246] text-stone-950" : "bg-stone-900 text-stone-400 hover:text-stone-200"}`}>
              {a}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><span className="w-6 h-6 border-2 border-stone-700 border-t-[#ecc246] rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-stone-600">
          <ImageIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No images yet. Upload the first one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map(img => (
            <div key={img.id} className="group relative aspect-square rounded-xl overflow-hidden border border-stone-800">
              <img src={img.url} alt={img.caption} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-stone-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-end p-3 gap-2">
                {img.caption && <p className="text-white text-[10px] text-center line-clamp-2">{img.caption}</p>}
                <button onClick={() => handleDelete(img.id)}
                  className="p-1.5 bg-red-600 rounded-lg text-white cursor-pointer">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              {img.album !== "General" && (
                <span className="absolute top-2 left-2 bg-stone-950/70 text-[9px] text-stone-300 px-1.5 py-0.5 rounded">{img.album}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
