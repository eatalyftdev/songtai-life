import React from "react";
import { useState, useEffect } from "react";
import { ShoppingBag, Plus, Edit, Trash2, ToggleLeft, ToggleRight, Copy, Video } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import PageShell, { Card, TableWrapper, Th, Td, Btn, SearchInput, Select } from "../shared/PageShell";
import SlideOver from "../shared/SlideOver";
import { SkeletonTable } from "../shared/Skeleton";
import EmptyState from "../shared/EmptyState";
import MediaUploader from "../../MediaUploader";
import VideoUploader from "../../VideoUploader";
import { extractYouTubeId, getYouTubeThumbnail } from "../../../lib/youtube";

interface Product {
  id: string; slug: string; nameEn: string; nameFr: string;
  descriptionEn: string; descriptionFr: string; priceXaf: number;
  strikePriceXaf: number | null; pvPoints: number; isActive: boolean;
  isFeatured: boolean; featuredOrder: number;
  images: string[]; categoryId: string | null; stock: number;
  videoUrlEn?: string; videoUrlFr?: string;
  videoSourceEn?: "upload" | "youtube"; videoSourceFr?: "upload" | "youtube";
  videoThumbnailEn?: string; videoThumbnailFr?: string;
  videoDurationSeconds?: number;
  videoTitleEn?: string; videoTitleFr?: string;
  videoDescriptionEn?: string; videoDescriptionFr?: string;
}

const BLANK: Partial<Product> = {
  nameEn: "", nameFr: "", slug: "", descriptionEn: "", descriptionFr: "",
  priceXaf: 0, strikePriceXaf: null, pvPoints: 0, isActive: true,
  isFeatured: false, featuredOrder: 0, images: [], stock: 100,
  videoUrlEn: "", videoUrlFr: "", videoSourceEn: "upload", videoSourceFr: "upload",
  videoThumbnailEn: "", videoThumbnailFr: "",
  videoDurationSeconds: undefined, videoTitleEn: "", videoTitleFr: "",
  videoDescriptionEn: "", videoDescriptionFr: "",
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [slideOpen, setSlideOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<Partial<Product>>(BLANK);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [videoTab, setVideoTab] = useState<"en" | "fr">("en");

  const load = async () => {
    setLoading(true);
    const [{ data }, { data: cats }] = await Promise.all([
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("product_categories").select("id, name, name_en").eq("is_active", true).order("display_order"),
    ]);
    setCategories((cats ?? []).map((c: any) => ({ id: c.id, name: c.name ?? c.name_en ?? "" })));
    setProducts((data ?? []).map(p => ({
      id: p.id, slug: p.slug ?? "", nameEn: p.name_en ?? "", nameFr: p.name_fr ?? "",
      descriptionEn: p.description_en ?? "", descriptionFr: p.description_fr ?? "",
      priceXaf: p.price_xaf ?? 0, strikePriceXaf: p.strike_price_xaf ?? null,
      pvPoints: p.pv_points ?? 0, isActive: p.is_active ?? true,
      isFeatured: p.is_featured ?? false, featuredOrder: p.featured_order ?? 0,
      images: p.images ?? [], categoryId: p.category_id ?? null, stock: p.stock ?? 0,
      videoUrlEn: p.video_url_en ?? "", videoUrlFr: p.video_url_fr ?? "",
      videoSourceEn: (p.video_source_en === "youtube" ? "youtube" : "upload"),
      videoSourceFr: (p.video_source_fr === "youtube" ? "youtube" : "upload"),
      videoThumbnailEn: p.video_thumbnail_en ?? "", videoThumbnailFr: p.video_thumbnail_fr ?? "",
      videoDurationSeconds: p.video_duration_seconds ?? undefined,
      videoTitleEn: p.video_title_en ?? "", videoTitleFr: p.video_title_fr ?? "",
      videoDescriptionEn: p.video_description_en ?? "", videoDescriptionFr: p.video_description_fr ?? "",
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = products.filter(p => {
    const q = search.toLowerCase();
    if (filter === "active" && !p.isActive) return false;
    if (filter === "inactive" && p.isActive) return false;
    if (filter === "featured" && !p.isFeatured) return false;
    return !q || p.nameEn.toLowerCase().includes(q) || p.nameFr.toLowerCase().includes(q);
  });

  const openAdd = () => { setEditing(null); setForm(BLANK); setSlideOpen(true); };
  const openEdit = (p: Product) => { setEditing(p); setForm(p); setSlideOpen(true); };
  const openDuplicate = (p: Product) => {
    setEditing(null);
    setForm({ ...p, id: undefined, slug: `${p.slug}-copy`, nameEn: `${p.nameEn} (Copy)` });
    setSlideOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.videoSourceEn === "youtube" && form.videoUrlEn && !extractYouTubeId(form.videoUrlEn)) {
      alert("The English video URL doesn't look like a valid YouTube link. Fix it before saving.");
      return;
    }
    if (form.videoSourceFr === "youtube" && form.videoUrlFr && !extractYouTubeId(form.videoUrlFr)) {
      alert("The French video URL doesn't look like a valid YouTube link. Fix it before saving.");
      return;
    }
    setSaving(true);
    const payload = {
      slug: (form.slug || `prod-${Date.now()}`),
      name_en: form.nameEn, name_fr: form.nameFr || null,
      description_en: form.descriptionEn, description_fr: form.descriptionFr || null,
      price_xaf: Number(form.priceXaf || 0),
      strike_price_xaf: form.strikePriceXaf ? Number(form.strikePriceXaf) : null,
      pv_points: Number(form.pvPoints || 0), stock: Number(form.stock || 0),
      images: form.images ?? [], is_active: form.isActive ?? true,
      is_featured: form.isFeatured ?? false, featured_order: Number(form.featuredOrder ?? 0),
      category_id: form.categoryId || null,
      video_url_en: form.videoUrlEn || null, video_url_fr: form.videoUrlFr || null,
      video_source_en: form.videoSourceEn || "upload", video_source_fr: form.videoSourceFr || "upload",
      video_thumbnail_en: form.videoThumbnailEn || null, video_thumbnail_fr: form.videoThumbnailFr || null,
      video_duration_seconds: form.videoDurationSeconds ?? null,
      video_title_en: form.videoTitleEn || null, video_title_fr: form.videoTitleFr || null,
      video_description_en: form.videoDescriptionEn || null, video_description_fr: form.videoDescriptionFr || null,
    };
    if (editing) {
      await supabase.from("products").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("products").insert(payload);
    }
    await supabase.from("audit_logs").insert({ action: editing ? "Product Updated" : "Product Created", details: form.nameEn });
    setSaving(false); setSlideOpen(false); load();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    await supabase.from("products").delete().eq("id", id);
    await supabase.from("audit_logs").insert({ action: "Product Deleted", details: name });
    load();
  };

  const handleToggleActive = async (p: Product) => {
    await supabase.from("products").update({ is_active: !p.isActive }).eq("id", p.id);
    setProducts(prev => prev.map(x => x.id === p.id ? { ...x, isActive: !x.isActive } : x));
  };

  const handleBulkAction = async (action: "activate" | "deactivate" | "delete") => {
    if (action === "delete" && !confirm(`Delete ${selected.size} products?`)) return;
    for (const id of selected) {
      if (action === "activate") await supabase.from("products").update({ is_active: true }).eq("id", id);
      else if (action === "deactivate") await supabase.from("products").update({ is_active: false }).eq("id", id);
      else await supabase.from("products").delete().eq("id", id);
    }
    setSelected(new Set()); load();
  };

  const allSelected = filtered.length > 0 && filtered.every(p => selected.has(p.id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(filtered.map(p => p.id)));
  const f = (k: keyof Product, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <PageShell
      title="Products"
      subtitle={`${products.length} products in catalog`}
      actions={<>
        {selected.size > 0 && (
          <>
            <Btn variant="secondary" onClick={() => handleBulkAction("activate")}>Activate ({selected.size})</Btn>
            <Btn variant="secondary" onClick={() => handleBulkAction("deactivate")}>Deactivate</Btn>
            <Btn variant="danger" onClick={() => handleBulkAction("delete")}>Delete</Btn>
          </>
        )}
        <Btn variant="primary" onClick={openAdd}><Plus className="w-3.5 h-3.5" /> Add Product</Btn>
      </>}
    >
      <Card>
        <div className="flex flex-wrap gap-3 p-4 border-b border-stone-800">
          <SearchInput value={search} onChange={setSearch} placeholder="Search products…" />
          <Select value={filter} onChange={setFilter}>
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="featured">Featured on Homepage</option>
          </Select>
        </div>

        <TableWrapper>
          <thead>
            <tr>
              <Th><input type="checkbox" checked={allSelected} onChange={toggleAll} className="cursor-pointer" /></Th>
              <Th>Product</Th>
              <Th>Price</Th>
              <Th>PV</Th>
              <Th>Stock</Th>
              <Th>Active</Th>
              <Th>Featured</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          {loading ? <SkeletonTable cols={7} /> : (
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7}><EmptyState icon={ShoppingBag} title="No products yet" description="Add your first product to the catalog." action={{ label: "Add Product", onClick: openAdd }} /></td></tr>
              ) : filtered.map(p => (
                <tr key={p.id} className="border-b border-stone-800/50 hover:bg-stone-800/20 transition-colors">
                  <Td><input type="checkbox" checked={selected.has(p.id)} onChange={() => setSelected(prev => { const s = new Set(prev); s.has(p.id) ? s.delete(p.id) : s.add(p.id); return s; })} className="cursor-pointer" /></Td>
                  <Td>
                    <div className="flex items-center gap-3">
                      {p.images[0] && <img src={p.images[0]} className="w-9 h-9 rounded-lg object-cover flex-shrink-0 bg-stone-800" />}
                      <div>
                        <p className="text-white font-medium">{p.nameEn}</p>
                        {p.nameFr && <p className="text-stone-500 text-[10px]">{p.nameFr}</p>}
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <div>
                      <span className="text-white font-mono">{p.priceXaf.toLocaleString()} XAF</span>
                      {p.strikePriceXaf && <span className="line-through text-stone-500 ml-2 text-[10px]">{p.strikePriceXaf.toLocaleString()}</span>}
                    </div>
                  </Td>
                  <Td><span className="text-[#C9A227] font-mono font-semibold">{p.pvPoints} PV</span></Td>
                  <Td><span className="font-mono">{p.stock}</span></Td>
                  <Td>
                    <button onClick={() => handleToggleActive(p)} className="cursor-pointer text-stone-400 hover:text-white transition-colors">
                      {p.isActive ? <ToggleRight className="w-5 h-5 text-[#0A7D32]" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>
                  </Td>
                  <Td>
                    <button
                      onClick={async () => {
                        await supabase.from("products").update({ is_featured: !p.isFeatured }).eq("id", p.id);
                        setProducts(prev => prev.map(x => x.id === p.id ? { ...x, isFeatured: !x.isFeatured } : x));
                      }}
                      className="cursor-pointer text-stone-400 hover:text-white transition-colors"
                      title={p.isFeatured ? "Remove from homepage" : "Feature on homepage"}
                    >
                      {p.isFeatured ? <ToggleRight className="w-5 h-5 text-[#C9A227]" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1.5">
                      <Btn variant="ghost" size="xs" onClick={() => openEdit(p)}><Edit className="w-3 h-3" /></Btn>
                      <Btn variant="ghost" size="xs" onClick={() => openDuplicate(p)}><Copy className="w-3 h-3" /></Btn>
                      <Btn variant="danger" size="xs" onClick={() => handleDelete(p.id, p.nameEn)}><Trash2 className="w-3 h-3" /></Btn>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          )}
        </TableWrapper>
        <div className="px-4 py-3 border-t border-stone-800 text-stone-500 text-xs">
          Showing {filtered.length} of {products.length} products
        </div>
      </Card>

      <SlideOver open={slideOpen} onClose={() => setSlideOpen(false)} title={editing ? "Edit Product" : "New Product"} subtitle="Bilingual catalog entry">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-stone-400 text-xs block mb-1.5">Name (English) *</label>
              <input value={form.nameEn ?? ""} onChange={e => f("nameEn", e.target.value)} required
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32]" />
            </div>
            <div>
              <label className="text-stone-400 text-xs block mb-1.5">Name (Français)</label>
              <input value={form.nameFr ?? ""} onChange={e => f("nameFr", e.target.value)}
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32]" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-stone-400 text-xs block mb-1.5">Slug</label>
              <input value={form.slug ?? ""} onChange={e => f("slug", e.target.value)}
                placeholder="auto-generated if empty"
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32]" />
            </div>
            <div>
              <label className="text-stone-400 text-xs block mb-1.5">Category</label>
              <select
                value={form.categoryId ?? ""}
                onChange={e => f("categoryId", e.target.value || null)}
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32]"
              >
                <option value="">— None —</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-stone-400 text-xs block mb-1.5">Description (EN)</label>
            <textarea value={form.descriptionEn ?? ""} onChange={e => f("descriptionEn", e.target.value)} rows={3}
              className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32] resize-none" />
          </div>
          <div>
            <label className="text-stone-400 text-xs block mb-1.5">Description (FR)</label>
            <textarea value={form.descriptionFr ?? ""} onChange={e => f("descriptionFr", e.target.value)} rows={2}
              className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32] resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-stone-400 text-xs block mb-1.5">Price (XAF) *</label>
              <input type="number" value={form.priceXaf ?? 0} onChange={e => f("priceXaf", Number(e.target.value))} required
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32]" />
            </div>
            <div>
              <label className="text-stone-400 text-xs block mb-1.5">Strike Price (XAF)</label>
              <input type="number" value={form.strikePriceXaf ?? ""} onChange={e => f("strikePriceXaf", e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32]" />
            </div>
            <div>
              <label className="text-stone-400 text-xs block mb-1.5">PV Points</label>
              <input type="number" value={form.pvPoints ?? 0} onChange={e => f("pvPoints", Number(e.target.value))}
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32]" />
            </div>
            <div>
              <label className="text-stone-400 text-xs block mb-1.5">Stock</label>
              <input type="number" value={form.stock ?? 0} onChange={e => f("stock", Number(e.target.value))}
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32]" />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <label className="text-stone-400 text-xs">Active</label>
              <button type="button" onClick={() => f("isActive", !form.isActive)} className="cursor-pointer">
                {form.isActive ? <ToggleRight className="w-6 h-6 text-[#0A7D32]" /> : <ToggleLeft className="w-6 h-6 text-stone-500" />}
              </button>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-stone-400 text-xs">Featured on Homepage</label>
              <button type="button" onClick={() => f("isFeatured", !form.isFeatured)} className="cursor-pointer">
                {form.isFeatured ? <ToggleRight className="w-6 h-6 text-[#C9A227]" /> : <ToggleLeft className="w-6 h-6 text-stone-500" />}
              </button>
            </div>
          </div>
          {form.isFeatured && (
            <div>
              <label className="text-stone-400 text-xs block mb-1.5">Featured Order</label>
              <input type="number" value={form.featuredOrder ?? 0} onChange={e => f("featuredOrder", Number(e.target.value))}
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32]" />
            </div>
          )}
          <div>
            <label className="text-stone-400 text-xs block mb-2">Product Image</label>
            <MediaUploader
              bucket="media"
              folder="products"
              onUploaded={url => f("images", [url])}
              currentUrl={form.images?.[0] || undefined}
              onRemoved={() => f("images", [])}
            />
          </div>

          {/* ── Product Video Section ──────────────────────────── */}
          <div className="border-t border-stone-800 pt-4 space-y-3">
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-stone-400" />
              <span className="text-stone-300 text-xs font-semibold uppercase tracking-wider">Product Video</span>
            </div>

            {/* EN / FR tabs */}
            <div className="flex gap-1 bg-stone-950 p-1 rounded-xl border border-stone-850/60 w-fit">
              {(["en", "fr"] as const).map(loc => {
                const hasVideo = loc === "en" ? !!form.videoUrlEn : !!form.videoUrlFr;
                return (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => setVideoTab(loc)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      videoTab === loc
                        ? "bg-[#0A7D32]/15 border border-[#0A7D32]/30 text-emerald-400"
                        : "text-stone-400 hover:text-white"
                    }`}
                  >
                    {loc.toUpperCase()}
                    {hasVideo && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Missing-locale indicator */}
            {videoTab === "fr" && !form.videoUrlFr && form.videoUrlEn && (
              <p className="text-[10px] text-amber-400 bg-amber-950/20 border border-amber-900/30 rounded-lg px-3 py-2">
                French video not yet added — English video will show as fallback on the public page.
              </p>
            )}
            {videoTab === "en" && !form.videoUrlEn && form.videoUrlFr && (
              <p className="text-[10px] text-amber-400 bg-amber-950/20 border border-amber-900/30 rounded-lg px-3 py-2">
                English video not yet added — French video will show as fallback.
              </p>
            )}

            {/* Source toggle: uploaded file vs YouTube link — mutually exclusive per locale */}
            <div className="flex gap-1 bg-stone-950 p-1 rounded-xl border border-stone-850/60 w-fit">
              {(["upload", "youtube"] as const).map(src => {
                const current = videoTab === "en" ? (form.videoSourceEn ?? "upload") : (form.videoSourceFr ?? "upload");
                return (
                  <button
                    key={src}
                    type="button"
                    onClick={() => {
                      // Switching source clears the other source's saved URL for this locale
                      // so only one video (upload OR YouTube) is ever active per locale.
                      if (videoTab === "en") {
                        setForm(prev => ({ ...prev, videoSourceEn: src, videoUrlEn: "", videoThumbnailEn: "" }));
                      } else {
                        setForm(prev => ({ ...prev, videoSourceFr: src, videoUrlFr: "", videoThumbnailFr: "" }));
                      }
                    }}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all capitalize ${
                      current === src
                        ? "bg-[#0A7D32]/15 border border-[#0A7D32]/30 text-emerald-400"
                        : "text-stone-400 hover:text-white"
                    }`}
                  >
                    {src === "upload" ? "Upload file" : "YouTube link"}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-stone-500">
              Only one video plays per language — switching source replaces whatever was set before.
            </p>

            {/* Video uploader (file-based) */}
            {(videoTab === "en" ? form.videoSourceEn : form.videoSourceFr) !== "youtube" && (
              <VideoUploader
                folder={editing?.id ?? `draft-${Date.now()}`}
                locale={videoTab}
                currentVideoUrl={videoTab === "en" ? form.videoUrlEn || "" : form.videoUrlFr || ""}
                currentThumbnailUrl={videoTab === "en" ? form.videoThumbnailEn || "" : form.videoThumbnailFr || ""}
                onUploaded={(videoUrl, thumbnailUrl, durationSeconds) => {
                  if (videoTab === "en") {
                    setForm(prev => ({
                      ...prev,
                      videoUrlEn: videoUrl,
                      videoThumbnailEn: thumbnailUrl || prev.videoThumbnailEn,
                      videoDurationSeconds: durationSeconds || prev.videoDurationSeconds,
                    }));
                  } else {
                    setForm(prev => ({
                      ...prev,
                      videoUrlFr: videoUrl,
                      videoThumbnailFr: thumbnailUrl || prev.videoThumbnailFr,
                      videoDurationSeconds: durationSeconds || prev.videoDurationSeconds,
                    }));
                  }
                }}
                onRemoved={() => {
                  if (videoTab === "en") setForm(prev => ({ ...prev, videoUrlEn: "", videoThumbnailEn: "" }));
                  else setForm(prev => ({ ...prev, videoUrlFr: "", videoThumbnailFr: "" }));
                }}
              />
            )}

            {/* YouTube URL input */}
            {(videoTab === "en" ? form.videoSourceEn : form.videoSourceFr) === "youtube" && (() => {
              const url = (videoTab === "en" ? form.videoUrlEn : form.videoUrlFr) || "";
              const id = extractYouTubeId(url);
              const invalid = url.trim().length > 0 && !id;
              return (
                <div className="space-y-2">
                  <input
                    value={url}
                    onChange={e => {
                      const val = e.target.value;
                      if (videoTab === "en") {
                        setForm(prev => ({ ...prev, videoUrlEn: val, videoThumbnailEn: getYouTubeThumbnail(val) || prev.videoThumbnailEn }));
                      } else {
                        setForm(prev => ({ ...prev, videoUrlFr: val, videoThumbnailFr: getYouTubeThumbnail(val) || prev.videoThumbnailFr }));
                      }
                    }}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className={`w-full px-3 py-2 bg-stone-800 border rounded-xl text-white text-xs focus:outline-none ${
                      invalid ? "border-red-700 focus:border-red-500" : "border-stone-700 focus:border-[#0A7D32]"
                    }`}
                  />
                  {invalid && (
                    <p className="text-[10px] text-red-400">Doesn't look like a valid YouTube URL.</p>
                  )}
                  {id && (
                    <div className="rounded-xl overflow-hidden border border-emerald-800/40 bg-stone-950 w-40">
                      <img src={getYouTubeThumbnail(id) ?? ""} alt="YouTube thumbnail preview" className="w-full aspect-video object-cover" />
                    </div>
                  )}
                  <div className="max-w-[140px]">
                    <label className="text-stone-500 text-[10px] block mb-1 uppercase tracking-wider">Duration (mm:ss)</label>
                    <input
                      placeholder="4:32"
                      defaultValue={
                        form.videoDurationSeconds
                          ? `${Math.floor(form.videoDurationSeconds / 60)}:${String(form.videoDurationSeconds % 60).padStart(2, "0")}`
                          : ""
                      }
                      onBlur={e => {
                        const m = e.target.value.trim().match(/^(\d+):([0-5]?\d)$/);
                        if (m) f("videoDurationSeconds", Number(m[1]) * 60 + Number(m[2]));
                      }}
                      className="w-full px-3 py-1.5 bg-stone-800 border border-stone-700 rounded-lg text-white text-xs focus:outline-none focus:border-[#0A7D32]"
                    />
                  </div>
                </div>
              );
            })()}

            {/* Thumbnail manual replacement */}
            <div>
              <label className="text-stone-500 text-[10px] block mb-1.5 uppercase tracking-wider">
                Thumbnail ({videoTab.toUpperCase()}) — auto-captured; replace if needed
              </label>
              <MediaUploader
                bucket="media"
                folder="products/thumbnails"
                accept="image/*"
                currentUrl={(videoTab === "en" ? form.videoThumbnailEn : form.videoThumbnailFr) || undefined}
                onUploaded={url => {
                  if (videoTab === "en") f("videoThumbnailEn", url);
                  else f("videoThumbnailFr", url);
                }}
                onRemoved={() => {
                  if (videoTab === "en") f("videoThumbnailEn", "");
                  else f("videoThumbnailFr", "");
                }}
                label="Drop thumbnail image here"
              />
            </div>

            {/* Duration (read-only display) */}
            {(form.videoDurationSeconds ?? 0) > 0 && (
              <p className="text-[10px] text-stone-500">
                Duration detected: {Math.floor((form.videoDurationSeconds ?? 0) / 60)}m {(form.videoDurationSeconds ?? 0) % 60}s
              </p>
            )}

            {/* Video title & description */}
            <div>
              <label className="text-stone-400 text-xs block mb-1.5">
                Video Title ({videoTab.toUpperCase()})
              </label>
              <input
                value={(videoTab === "en" ? form.videoTitleEn : form.videoTitleFr) ?? ""}
                onChange={e => f(videoTab === "en" ? "videoTitleEn" : "videoTitleFr", e.target.value)}
                placeholder="e.g. Discover the benefits of Songtai Aloe Vera..."
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32]"
              />
            </div>
            <div>
              <label className="text-stone-400 text-xs block mb-1.5">
                Video Description ({videoTab.toUpperCase()})
              </label>
              <textarea
                value={(videoTab === "en" ? form.videoDescriptionEn : form.videoDescriptionFr) ?? ""}
                onChange={e => f(videoTab === "en" ? "videoDescriptionEn" : "videoDescriptionFr", e.target.value)}
                rows={2}
                placeholder="Short description of what the video covers..."
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32] resize-none"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Btn variant="secondary" onClick={() => setSlideOpen(false)} className="flex-1">Cancel</Btn>
            <Btn variant="primary" loading={saving} className="flex-1">{editing ? "Save Changes" : "Create Product"}</Btn>
          </div>
        </form>
      </SlideOver>
    </PageShell>
  );
}
