import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { Upload, X, CheckCircle2, AlertCircle, Image as ImageIcon, FileText } from "lucide-react";
import { supabase } from "../lib/supabase";

interface MediaUploaderProps {
  bucket: "media" | "documents" | "testimonials";
  /** Called with the public URL of each successfully uploaded file */
  onUploaded: (url: string, path: string) => void;
  accept?: string;           // default: "image/*"
  maxSizeMb?: number;        // default: 10
  multiple?: boolean;
  label?: string;
}

interface FileState {
  file: File;
  preview: string | null;
  progress: number;          // 0-100
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
  url?: string;
}

export default function MediaUploader({
  bucket,
  onUploaded,
  accept = "image/*",
  maxSizeMb = 10,
  multiple = false,
  label = "Drop files here or click to browse",
}: MediaUploaderProps) {
  const [files, setFiles] = useState<FileState[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const arr = Array.from(incoming);
    const newStates: FileState[] = arr.map(file => {
      if (file.size > maxSizeMb * 1024 * 1024) {
        return { file, preview: null, progress: 0, status: "error", error: `File exceeds ${maxSizeMb} MB` };
      }
      const isImage = file.type.startsWith("image/");
      const preview = isImage ? URL.createObjectURL(file) : null;
      return { file, preview, progress: 0, status: "pending" };
    });
    setFiles(prev => (multiple ? [...prev, ...newStates] : newStates));
    // Kick off uploads
    newStates.forEach((fs, i) => {
      if (fs.status === "error") return;
      uploadFile(fs.file, multiple ? files.length + i : i);
    });
  };

  const uploadFile = async (file: File, idx: number) => {
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    setFiles(prev => prev.map((f, i) => i === idx ? { ...f, status: "uploading", progress: 10 } : f));

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (error) {
      setFiles(prev => prev.map((f, i) => i === idx ? { ...f, status: "error", error: error.message, progress: 0 } : f));
      return;
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
    const publicUrl = urlData.publicUrl;

    setFiles(prev => prev.map((f, i) => i === idx ? { ...f, status: "done", progress: 100, url: publicUrl } : f));
    onUploaded(publicUrl, data.path);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };
  const handleDragOver = (e: DragEvent) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => addFiles(e.target.files);
  const removeFile = (idx: number) => setFiles(prev => prev.filter((_, i) => i !== idx));

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all select-none ${
          dragging
            ? "border-[#ecc246] bg-[#ecc246]/5"
            : "border-stone-700 hover:border-stone-500 bg-stone-950/30"
        }`}
      >
        <Upload className="w-6 h-6 text-stone-500 mx-auto mb-2" />
        <p className="text-stone-400 text-xs">{label}</p>
        <p className="text-stone-600 text-[10px] mt-1">Max {maxSizeMb} MB per file</p>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((fs, idx) => (
            <div key={idx} className="flex items-center gap-3 bg-stone-900 border border-stone-800 rounded-lg p-2.5">
              {/* Thumbnail or icon */}
              {fs.preview
                ? <img src={fs.preview} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-stone-700" />
                : (
                  <div className="w-10 h-10 rounded-lg bg-stone-800 flex items-center justify-center flex-shrink-0">
                    {fs.file.type.startsWith("image/")
                      ? <ImageIcon className="w-5 h-5 text-stone-500" />
                      : <FileText className="w-5 h-5 text-stone-500" />}
                  </div>
                )
              }

              <div className="flex-1 min-w-0">
                <p className="text-xs text-stone-200 truncate">{fs.file.name}</p>
                <p className="text-[10px] text-stone-500">{(fs.file.size / 1024).toFixed(0)} KB</p>
                {fs.status === "uploading" && (
                  <div className="w-full h-1 bg-stone-800 rounded-full mt-1 overflow-hidden">
                    <div
                      className="h-full bg-[#ecc246] rounded-full transition-all"
                      style={{ width: `${fs.progress}%` }}
                    />
                  </div>
                )}
                {fs.status === "error" && (
                  <p className="text-[10px] text-red-400 mt-0.5">{fs.error}</p>
                )}
                {fs.status === "done" && fs.url && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(fs.url!); }}
                    className="text-[10px] text-emerald-400 mt-0.5 hover:underline cursor-pointer"
                  >
                    Copy URL
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                {fs.status === "done" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                {fs.status === "error" && <AlertCircle className="w-4 h-4 text-red-400" />}
                {fs.status === "uploading" && (
                  <span className="w-4 h-4 border-2 border-stone-700 border-t-[#ecc246] rounded-full animate-spin" />
                )}
                <button type="button" onClick={() => removeFile(idx)} className="text-stone-600 hover:text-stone-300 cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
