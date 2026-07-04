import { useState, useEffect } from "react";
import { Library, Copy, Check, Trash2, File, Image, ScanLine, ExternalLink, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import PageShell, { Card, Btn, SearchInput, Select } from "../shared/PageShell";
import EmptyState from "../shared/EmptyState";
import MediaUploader from "../../MediaUploader";

interface MediaFile {
  name: string; bucket: string; url: string; size: number; mimeType: string; createdAt: string;
}

interface ExternalRef {
  table: string;
  id: string;
  label: string;    // human-readable record name
  field: string;    // column name in DB
  url: string;      // the external URL
  rehosting?: boolean;
  newUrl?: string;
  error?: string;
}

const BUCKETS = ["media","documents","testimonials"];

// The Supabase Storage base for this project — URLs that start with this are owned
const STORAGE_BASE = "https://auyjxchghtetxpiyecds.supabase.co/storage/";

function isExternal(url: string | null | undefined): boolean {
  if (!url || url.trim() === "") return false;
  return !url.startsWith(STORAGE_BASE);
}

export default function MediaPage() {
  const [tab, setTab] = useState<"library" | "scan">("library");

  // ── Library state ──────────────────────────────────────────────────────────
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [bucket, setBucket] = useState("media");
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);

  // ── Scan state ─────────────────────────────────────────────────────────────
  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState<ExternalRef[] | null>(null);
  const [rehostingAll, setRehostingAll] = useState(false);

  const load = async (b: string) => {
    setLoading(true);
    const { data } = await supabase.storage.from(b).list("", { limit: 500, sortBy: { column: "created_at", order: "desc" } });
    const items: MediaFile[] = (data ?? []).filter(f => f.name !== ".emptyFolderPlaceholder").map(f => {
      const { data: urlData } = supabase.storage.from(b).getPublicUrl(f.name);
      return {
        name: f.name, bucket: b,
        url: urlData?.publicUrl ?? "",
        size: f.metadata?.size ?? 0,
        mimeType: f.metadata?.mimetype ?? "",
        createdAt: f.created_at ?? "",
      };
    });
    setFiles(items);
    setLoading(false);
  };

  useEffect(() => { load(bucket); }, [bucket]);

  const filtered = files.filter(f => !search || f.name.toLowerCase().includes(search.toLowerCase()));

  const handleDelete = async (name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    await supabase.storage.from(bucket).remove([name]);
    setFiles(prev => prev.filter(f => f.name !== name));
  };

  const copy = (url: string) => { navigator.clipboard.writeText(url); setCopied(url); setTimeout(() => setCopied(""), 2000); };

  const fmt = (bytes: number) => bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

  const isImage = (mime: string) => mime.startsWith("image/");

  // ── External-image scan ───────────────────────────────────────────────────
  const runScan = async () => {
    setScanning(true);
    setScanResults(null);
    const found: ExternalRef[] = [];

    // blog_posts
    const { data: posts } = await supabase.from("blog_posts").select("id, title, featured_image_url");
    (posts ?? []).forEach((p: any) => {
      if (isExternal(p.featured_image_url))
        found.push({ table: "blog_posts", id: p.id, label: p.title ?? p.id, field: "featured_image_url", url: p.featured_image_url });
    });

    // gallery_images
    const { data: gallery } = await supabase.from("gallery_images").select("id, caption_en, url");
    (gallery ?? []).forEach((g: any) => {
      if (isExternal(g.url))
        found.push({ table: "gallery_images", id: g.id, label: g.caption_en ?? `Image ${g.id.slice(0, 8)}`, field: "url", url: g.url });
    });

    // product_categories
    const { data: cats } = await supabase.from("product_categories").select("id, name, image_url");
    (cats ?? []).forEach((c: any) => {
      if (isExternal(c.image_url))
        found.push({ table: "product_categories", id: c.id, label: c.name ?? c.id, field: "image_url", url: c.image_url });
    });

    // products — images[] array; flag if any element is external
    const { data: products } = await supabase.from("products").select("id, name_en, images");
    (products ?? []).forEach((p: any) => {
      const imgs: string[] = p.images ?? [];
      const hasExternal = imgs.some(u => isExternal(u));
      if (hasExternal)
        found.push({
          table: "products",
          id: p.id,
          label: p.name_en ?? p.id,
          field: "images",
          url: imgs.filter(u => isExternal(u)).join(", "),
        });
    });

    setScanning(false);
    setScanResults(found);
  };

  const rehostOne = async (ref: ExternalRef) => {
    // Products.images array → multi-URL; redirect to manual re-upload
    if (ref.field === "images") return;

    setScanResults(prev => (prev ?? []).map(r =>
      r.id === ref.id && r.field === ref.field ? { ...r, rehosting: true, error: undefined } : r
    ));

    // Determine storage folder from table
    const folderMap: Record<string, string> = {
      blog_posts: "blog",
      gallery_images: "gallery",
      product_categories: "categories",
      testimonials: "testimonials",
    };
    const folder = folderMap[ref.table] ?? "migrated";

    try {
      const res = await fetch("/api/admin/rehost-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceUrl: ref.url, bucket: "media", folder }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Upload failed");

      // Update the record in DB
      const { error: dbErr } = await supabase
        .from(ref.table)
        .update({ [ref.field]: json.newUrl })
        .eq("id", ref.id);
      if (dbErr) throw new Error(dbErr.message);

      setScanResults(prev => (prev ?? []).map(r =>
        r.id === ref.id && r.field === ref.field ? { ...r, rehosting: false, newUrl: json.newUrl } : r
      ));
    } catch (err: any) {
      setScanResults(prev => (prev ?? []).map(r =>
        r.id === ref.id && r.field === ref.field ? { ...r, rehosting: false, error: err.message } : r
      ));
    }
  };

  const rehostAll = async () => {
    const eligible = (scanResults ?? []).filter(r => !r.newUrl && !r.rehosting && r.field !== "images");
    if (!eligible.length) return;
    setRehostingAll(true);
    for (const ref of eligible) await rehostOne(ref);
    setRehostingAll(false);
  };

  const TABLE_LABELS: Record<string, string> = {
    blog_posts: "Blog Posts",
    gallery_images: "Gallery Images",
    product_categories: "Product Categories",
    products: "Products (images array)",
    testimonials: "Testimonials",
  };

  return (
    <PageShell
      title="Media Library"
      subtitle={tab === "library" ? `${files.length} files in "${bucket}" bucket` : "External image audit"}
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab("library")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${tab === "library" ? "bg-stone-700 text-white" : "text-stone-400 hover:text-white"}`}
          >
            Library
          </button>
          <button
            onClick={() => setTab("scan")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${tab === "scan" ? "bg-stone-700 text-white" : "text-stone-400 hover:text-white"}`}
          >
            <ScanLine className="w-3.5 h-3.5" /> External Images
          </button>
          {tab === "library" && (
            <Btn variant="primary" onClick={() => setUploadOpen(v => !v)}>
              {uploadOpen ? "Close Uploader" : "Upload File"}
            </Btn>
          )}
        </div>
      }
    >
      {/* ── Library tab ─────────────────────────────────────────────────────── */}
      {tab === "library" && (
        <>
          {uploadOpen && (
            <Card className="p-5">
              <p className="text-stone-400 text-xs mb-3">Upload to <span className="text-[#C9A227] font-semibold">{bucket}</span> bucket</p>
              <MediaUploader bucket={bucket as any} onUploaded={() => { load(bucket); setUploadOpen(false); }} />
            </Card>
          )}

          <Card>
            <div className="flex flex-wrap gap-3 p-4 border-b border-stone-800">
              <div className="flex gap-1">
                {BUCKETS.map(b => (
                  <button key={b} onClick={() => setBucket(b)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${bucket === b ? "bg-[#0A7D32] text-white" : "bg-stone-800 text-stone-400 hover:text-white"}`}>
                    {b}
                  </button>
                ))}
              </div>
              <SearchInput value={search} onChange={setSearch} placeholder="Search files…" />
            </div>

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-4">
                {Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-square bg-stone-800 rounded-xl animate-pulse" />)}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState icon={Library} title={`No files in "${bucket}"`} description="Upload files using the button above." />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 p-4">
                {filtered.map(file => (
                  <div key={file.name} className="group relative rounded-xl overflow-hidden border border-stone-800 bg-stone-900 hover:border-stone-600 transition-all">
                    {isImage(file.mimeType) ? (
                      <img src={file.url} className="w-full aspect-square object-cover" />
                    ) : (
                      <div className="w-full aspect-square flex items-center justify-center bg-stone-800">
                        <File className="w-8 h-8 text-stone-500" />
                      </div>
                    )}
                    <div className="p-2">
                      <p className="text-stone-300 text-[10px] truncate" title={file.name}>{file.name}</p>
                      <p className="text-stone-600 text-[9px] mt-0.5">{fmt(file.size)}</p>
                    </div>
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => copy(file.url)} className="p-1 bg-stone-900/90 rounded-lg cursor-pointer hover:bg-stone-900">
                        {copied === file.url ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-white" />}
                      </button>
                      <button onClick={() => handleDelete(file.name)} className="p-1 bg-red-900/80 rounded-lg cursor-pointer hover:bg-red-900">
                        <Trash2 className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="px-4 py-3 border-t border-stone-800 text-stone-500 text-xs">
              {filtered.length} files · {files.reduce((s, f) => s + f.size, 0) > 0 ? `${(files.reduce((s, f) => s + f.size, 0) / 1024 / 1024).toFixed(1)} MB used` : ""}
            </div>
          </Card>
        </>
      )}

      {/* ── External images scan tab ─────────────────────────────────────────── */}
      {tab === "scan" && (
        <div className="space-y-4">
          <Card className="p-5 space-y-4">
            <div className="flex items-start gap-3">
              <ScanLine className="w-5 h-5 text-[#ecc246] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-stone-100">Find externally-hosted images</p>
                <p className="text-[11px] text-stone-500 mt-1">
                  Scans Blog Posts, Gallery Images, Product Categories, and Products for image URLs that don't
                  live in your Supabase Storage — i.e. URLs you don't own or control. You can then re-host them
                  one at a time or all at once.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Btn variant="primary" loading={scanning} onClick={runScan}>
                <ScanLine className="w-3.5 h-3.5" />
                {scanning ? "Scanning…" : scanResults === null ? "Scan for external images" : "Re-scan"}
              </Btn>
              {scanResults !== null && !scanning && scanResults.filter(r => !r.newUrl && r.field !== "images").length > 0 && (
                <Btn variant="secondary" loading={rehostingAll} onClick={rehostAll}>
                  <RefreshCw className="w-3.5 h-3.5" />
                  Re-host all ({scanResults.filter(r => !r.newUrl && r.field !== "images").length})
                </Btn>
              )}
            </div>
          </Card>

          {scanResults !== null && !scanning && (
            <Card>
              {scanResults.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  <p className="text-sm font-bold text-stone-100">All clear!</p>
                  <p className="text-xs text-stone-500">No externally-hosted images found across the scanned tables.</p>
                </div>
              ) : (
                <div className="divide-y divide-stone-800">
                  <div className="px-4 py-3 text-[11px] text-stone-400 font-semibold">
                    {scanResults.length} externally-hosted image{scanResults.length !== 1 ? "s" : ""} found
                  </div>
                  {scanResults.map((ref, i) => (
                    <div key={i} className="flex items-start gap-3 px-4 py-3 hover:bg-stone-800/30 transition-colors">
                      {/* Image thumbnail */}
                      <div className="w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-stone-800 border border-stone-700">
                        {ref.field !== "images" ? (
                          <img src={ref.url} alt="" className="w-full h-full object-cover"
                            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Image className="w-5 h-5 text-stone-600" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-800 text-stone-400 font-mono">
                            {TABLE_LABELS[ref.table] ?? ref.table}
                          </span>
                          <span className="text-xs text-stone-200 font-medium truncate">{ref.label}</span>
                        </div>
                        {ref.field === "images" ? (
                          <p className="text-[10px] text-amber-400 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                            Images array — please re-upload via the Products admin page
                          </p>
                        ) : (
                          <a href={ref.url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[10px] text-stone-500 hover:text-stone-300 break-all transition-colors">
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate max-w-xs">{ref.url}</span>
                          </a>
                        )}
                        {ref.newUrl && (
                          <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                            Re-hosted → {ref.newUrl.split("/").pop()}
                          </p>
                        )}
                        {ref.error && (
                          <p className="text-[10px] text-red-400 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                            {ref.error}
                          </p>
                        )}
                      </div>

                      <div className="flex-shrink-0">
                        {ref.field === "images" ? (
                          <span className="text-[10px] text-stone-600 italic">Manual</span>
                        ) : ref.newUrl ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Btn
                            variant="secondary"
                            size="xs"
                            loading={ref.rehosting}
                            onClick={() => rehostOne(ref)}
                          >
                            <RefreshCw className="w-3 h-3" />
                            Re-host
                          </Btn>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      )}
    </PageShell>
  );
}
