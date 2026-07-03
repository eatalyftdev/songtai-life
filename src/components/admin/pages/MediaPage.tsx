import { useState, useEffect } from "react";
import { Library, Copy, Check, Trash2, File, Image } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import PageShell, { Card, Btn, SearchInput, Select } from "../shared/PageShell";
import EmptyState from "../shared/EmptyState";
import MediaUploader from "../../MediaUploader";

interface MediaFile {
  name: string; bucket: string; url: string; size: number; mimeType: string; createdAt: string;
}

const BUCKETS = ["media","documents","testimonials"];

export default function MediaPage() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [bucket, setBucket] = useState("media");
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);

  const load = async (b: string) => {
    setLoading(true);
    const { data } = await supabase.storage.from(b).list("", { limit: 200, sortBy: { column: "created_at", order: "desc" } });
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

  return (
    <PageShell
      title="Media Library"
      subtitle={`${files.length} files in "${bucket}" bucket`}
      actions={<Btn variant="primary" onClick={() => setUploadOpen(v => !v)}>{uploadOpen ? "Close Uploader" : "Upload File"}</Btn>}
    >
      {uploadOpen && (
        <Card className="p-5">
          <p className="text-stone-400 text-xs mb-3">Upload to <span className="text-[#C9A227] font-semibold">{bucket}</span> bucket</p>
          <MediaUploader bucket={bucket as any} onUploaded={() => { load(bucket); setUploadOpen(false); }} /* no currentUrl */ />
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
    </PageShell>
  );
}
