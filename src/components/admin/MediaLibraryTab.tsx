import { useState, useEffect } from "react";
import { Search, Image as ImageIcon, FileText, Trash2, Copy, Upload, RefreshCw } from "lucide-react";
import { supabase } from "../../lib/supabase";
import MediaUploader from "../MediaUploader";

interface MediaFile {
  name: string;
  path: string;
  size: number;
  type: "image" | "document" | "other";
  url: string;
  bucket: "media" | "documents";
}

interface MediaLibraryTabProps {
  addNotification: (msg: string, type: "success" | "info" | "gold") => void;
}

export default function MediaLibraryTab({ addNotification }: MediaLibraryTabProps) {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "image" | "document">("all");
  const [bucketFilter, setBucketFilter] = useState<"all" | "media" | "documents">("all");
  const [showUpload, setShowUpload] = useState(false);
  const [uploadBucket, setUploadBucket] = useState<"media" | "documents">("media");

  const fetchAll = async () => {
    setLoading(true);
    const results: MediaFile[] = [];
    for (const bucket of ["media", "documents"] as const) {
      try {
        const { data } = await supabase.storage.from(bucket).list("", { limit: 200, sortBy: { column: "created_at", order: "desc" } });
        if (data) {
          data.filter(f => f.name !== ".emptyFolderPlaceholder").forEach(f => {
            const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(f.name);
            const lc = f.name.toLowerCase();
            const type: MediaFile["type"] = /\.(jpe?g|png|gif|webp|svg|avif)$/.test(lc)
              ? "image"
              : /\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/.test(lc)
                ? "document"
                : "other";
            results.push({
              name: f.name,
              path: f.name,
              size: f.metadata?.size ?? 0,
              type,
              url: urlData.publicUrl,
              bucket,
            });
          });
        }
      } catch { /* bucket may not exist yet */ }
    }
    setFiles(results);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleDelete = async (f: MediaFile) => {
    if (!window.confirm(`Delete "${f.name}"? This cannot be undone.`)) return;
    const { error } = await supabase.storage.from(f.bucket).remove([f.path]);
    if (error) addNotification("Error deleting file: " + error.message, "info");
    else { addNotification("File deleted.", "success"); fetchAll(); }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    addNotification("URL copied to clipboard.", "gold");
  };

  const filtered = files.filter(f => {
    if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter !== "all" && f.type !== typeFilter) return false;
    if (bucketFilter !== "all" && f.bucket !== bucketFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6 text-left animate-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-extrabold text-lg text-stone-100">Media Library</h3>
          <p className="text-xs text-stone-500">{files.length} files across media &amp; documents buckets.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchAll} className="flex items-center gap-1.5 px-3 py-2 bg-stone-800 text-stone-400 text-xs rounded-lg cursor-pointer hover:text-stone-200">
            <RefreshCw className="w-3.5 h-3.5" />Refresh
          </button>
          <button onClick={() => setShowUpload(v => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg cursor-pointer">
            <Upload className="w-3.5 h-3.5" />Upload
          </button>
        </div>
      </div>

      {showUpload && (
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 space-y-4 max-w-xl">
          <div className="flex items-center gap-3">
            <label className="text-xs text-stone-400 font-bold">Bucket:</label>
            {(["media", "documents"] as const).map(b => (
              <button key={b} type="button" onClick={() => setUploadBucket(b)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${uploadBucket === b ? "bg-[#ecc246] text-stone-950" : "bg-stone-800 text-stone-400"}`}>
                {b}
              </button>
            ))}
          </div>
          <MediaUploader
            bucket={uploadBucket}
            onUploaded={() => { setTimeout(fetchAll, 500); }}
            accept={uploadBucket === "media" ? "image/*" : "*"}
            multiple
            label={`Drop files to upload to "${uploadBucket}" bucket`}
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-stone-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search files…"
            className="w-full pl-8 pr-3 py-2 bg-stone-900 border border-stone-800 focus:border-[#ecc246] rounded-lg text-xs text-white outline-none" />
        </div>
        <div className="flex gap-1.5">
          {(["all", "image", "document"] as const).map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer capitalize transition-all ${typeFilter === t ? "bg-[#ecc246] text-stone-950" : "bg-stone-900 text-stone-400 hover:text-stone-200"}`}>
              {t}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {(["all", "media", "documents"] as const).map(b => (
            <button key={b} onClick={() => setBucketFilter(b)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer capitalize transition-all ${bucketFilter === b ? "bg-blue-600 text-white" : "bg-stone-900 text-stone-400 hover:text-stone-200"}`}>
              {b}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><span className="w-6 h-6 border-2 border-stone-700 border-t-[#ecc246] rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-stone-600">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{files.length === 0 ? "No files uploaded yet." : "No files match your filters."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filtered.map(f => (
            <div key={`${f.bucket}/${f.path}`} className="group bg-stone-900 border border-stone-800 rounded-xl overflow-hidden hover:border-stone-700 transition-all">
              {/* Preview */}
              <div className="aspect-square bg-stone-950 flex items-center justify-center overflow-hidden">
                {f.type === "image"
                  ? <img src={f.url} alt={f.name} className="w-full h-full object-cover" loading="lazy" />
                  : (
                    <div className="flex flex-col items-center gap-1 text-stone-600">
                      <FileText className="w-8 h-8" />
                      <span className="text-[9px] uppercase font-bold">{f.name.split(".").pop()}</span>
                    </div>
                  )}
              </div>

              {/* Info + actions */}
              <div className="p-2.5 space-y-1.5">
                <p className="text-[10px] text-stone-300 truncate" title={f.name}>{f.name}</p>
                <div className="flex items-center justify-between gap-1">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${f.bucket === "media" ? "bg-emerald-950/50 text-emerald-400" : "bg-blue-950/50 text-blue-400"}`}>
                    {f.bucket}
                  </span>
                  <span className="text-[9px] text-stone-600">{(f.size / 1024).toFixed(0)} KB</span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => copyUrl(f.url)} title="Copy URL"
                    className="flex-1 p-1.5 bg-stone-800 hover:bg-stone-700 text-stone-400 rounded-lg transition-all cursor-pointer flex items-center justify-center">
                    <Copy className="w-3 h-3" />
                  </button>
                  <button onClick={() => handleDelete(f)} title="Delete"
                    className="flex-1 p-1.5 bg-stone-800 hover:bg-red-950/30 text-red-400 rounded-lg transition-all cursor-pointer flex items-center justify-center">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
