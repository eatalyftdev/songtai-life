import { useState, useRef, DragEvent, ChangeEvent, useCallback } from "react";
import * as tus from "tus-js-client";
import { Upload, X, CheckCircle2, AlertCircle, RefreshCw, Play, Video } from "lucide-react";
import { supabase, SUPABASE_URL } from "../lib/supabase";
import MediaUploader from "./MediaUploader";

interface VideoUploaderProps {
  folder: string;
  locale: "en" | "fr";
  currentVideoUrl?: string;
  currentThumbnailUrl?: string;
  onUploaded: (videoUrl: string, thumbnailUrl: string, durationSeconds: number) => void;
  onRemoved?: () => void;
}

type UploadStatus = "idle" | "uploading" | "processing" | "done" | "error";

async function captureThumbnail(
  file: File,
  videoEl: HTMLVideoElement
): Promise<{ blob: Blob; durationSeconds: number }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    videoEl.src = objectUrl;
    videoEl.muted = true;
    videoEl.preload = "metadata";

    videoEl.onloadedmetadata = () => {
      const duration = videoEl.duration;
      videoEl.currentTime = Math.min(1, duration * 0.05);

      videoEl.onseeked = () => {
        const canvas = document.createElement("canvas");
        const w = videoEl.videoWidth || 1280;
        const h = videoEl.videoHeight || 720;
        canvas.width = Math.min(w, 1280);
        canvas.height = Math.round(h * (canvas.width / w));
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("Canvas unavailable")); return; }
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl);
            if (blob) resolve({ blob, durationSeconds: Math.round(duration) });
            else reject(new Error("Thumbnail capture failed"));
          },
          "image/jpeg",
          0.85
        );
      };
    };

    videoEl.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Video element failed to load file"));
    };
  });
}

export default function VideoUploader({
  folder,
  locale,
  currentVideoUrl,
  currentThumbnailUrl,
  onUploaded,
  onRemoved,
}: VideoUploaderProps) {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const hiddenVideoRef = useRef<HTMLVideoElement>(null);

  const hasNewUpload = status === "done";
  const showCurrentVideo = currentVideoUrl && !hasNewUpload;

  const startUpload = useCallback(async (file: File) => {
    const VIDEO_MIMES = ["video/mp4", "video/webm", "video/mov", "video/avi", "video/quicktime", "video/x-msvideo"];
    if (!VIDEO_MIMES.some(m => file.type === m || file.type.startsWith("video/"))) {
      setError("Please select a video file (MP4, WebM, MOV, AVI).");
      setStatus("error");
      return;
    }

    setError(null);
    setProgress(0);
    setStatus("uploading");

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) {
      setError("Not authenticated. Please log in and try again.");
      setStatus("error");
      return;
    }

    const ext = file.name.split(".").pop() ?? "mp4";
    const uniqueName = `${locale}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const objectName = `${folder}/${uniqueName}`;

    const tusEndpoint = `${SUPABASE_URL}/storage/v1/upload/resumable`;

    await new Promise<void>((resolve, reject) => {
      const upload = new tus.Upload(file, {
        endpoint: tusEndpoint,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        headers: {
          authorization: `Bearer ${token}`,
          "x-upsert": "true",
        },
        uploadDataDuringCreation: true,
        removeFingerprintOnSuccess: true,
        metadata: {
          bucketName: "product-videos",
          objectName,
          contentType: file.type || "video/mp4",
          cacheControl: "3600",
        },
        chunkSize: 6 * 1024 * 1024,
        onError: (err) => reject(err),
        onProgress: (bytesUploaded, bytesTotal) => {
          setProgress(Math.round((bytesUploaded / bytesTotal) * 90));
        },
        onSuccess: () => resolve(),
      });

      upload.findPreviousUploads().then((previous) => {
        if (previous.length) upload.resumeFromPreviousUpload(previous[0]);
        upload.start();
      });
    }).catch((err) => {
      setError(err?.message ?? "Upload failed. Check your connection and try again.");
      setStatus("error");
      throw err;
    });

    const videoPublicUrl = `${SUPABASE_URL}/storage/v1/object/public/product-videos/${objectName}`;
    setUploadedVideoUrl(videoPublicUrl);
    setProgress(92);

    setStatus("processing");

    let durationSeconds = 0;
    let thumbnailUrl = "";

    try {
      if (hiddenVideoRef.current) {
        const { blob, durationSeconds: dur } = await captureThumbnail(file, hiddenVideoRef.current);
        durationSeconds = dur;

        const thumbExt = "jpg";
        const thumbName = `${folder}-${locale}-${Date.now()}.${thumbExt}`;
        const thumbPath = `products/thumbnails/${thumbName}`;
        const { data: thumbData, error: thumbErr } = await supabase.storage
          .from("media")
          .upload(thumbPath, blob, { contentType: "image/jpeg", cacheControl: "3600", upsert: true });

        if (!thumbErr && thumbData) {
          const { data: thumbUrlData } = supabase.storage.from("media").getPublicUrl(thumbData.path);
          thumbnailUrl = thumbUrlData.publicUrl;
        }
      }
    } catch (_thumbErr) {
      // Thumbnail capture failed — proceed without it
    }

    setProgress(100);
    setStatus("done");
    onUploaded(videoPublicUrl, thumbnailUrl, durationSeconds);
  }, [folder, locale, onUploaded]);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    startUpload(files[0]);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleRemoveCurrent = () => {
    setStatus("idle");
    setProgress(0);
    setError(null);
    setUploadedVideoUrl(null);
    onRemoved?.();
  };

  const displayVideoUrl = uploadedVideoUrl ?? currentVideoUrl;

  return (
    <div className="space-y-3">
      <video ref={hiddenVideoRef} className="hidden" muted playsInline crossOrigin="anonymous" />

      {/* Existing / just-uploaded video preview */}
      {showCurrentVideo && (
        <div className="rounded-xl overflow-hidden border border-stone-800 bg-stone-950 space-y-2">
          <video
            src={currentVideoUrl}
            poster={currentThumbnailUrl}
            controls
            preload="metadata"
            className="w-full max-h-52 bg-stone-950 object-contain"
          />
          <div className="px-3 pb-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 rounded-lg text-[10px] text-stone-300 cursor-pointer transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> Replace
            </button>
            {onRemoved && (
              <button
                type="button"
                onClick={handleRemoveCurrent}
                className="flex items-center gap-1.5 px-3 py-1.5 text-red-400 hover:bg-red-950/30 rounded-lg text-[10px] cursor-pointer transition-colors"
              >
                <X className="w-3 h-3" /> Remove
              </button>
            )}
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept="video/*"
              onChange={(e: ChangeEvent<HTMLInputElement>) => handleFiles(e.target.files)}
            />
          </div>
        </div>
      )}

      {/* New upload preview (just uploaded) */}
      {hasNewUpload && displayVideoUrl && (
        <div className="rounded-xl overflow-hidden border border-emerald-800/40 bg-stone-950 space-y-2">
          <video
            src={displayVideoUrl}
            controls
            preload="metadata"
            className="w-full max-h-52 bg-stone-950 object-contain"
          />
          <div className="px-3 pb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="text-[10px] text-emerald-400 font-semibold">Video uploaded successfully</span>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 rounded-lg text-[10px] text-stone-300 cursor-pointer transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> Replace
            </button>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept="video/*"
              onChange={(e: ChangeEvent<HTMLInputElement>) => handleFiles(e.target.files)}
            />
          </div>
        </div>
      )}

      {/* Drop zone — shown when no video and not uploading */}
      {!showCurrentVideo && status === "idle" && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all select-none ${
            dragging
              ? "border-[#ecc246] bg-[#ecc246]/5"
              : "border-stone-700 hover:border-stone-500 bg-stone-950/30"
          }`}
        >
          <Video className="w-7 h-7 text-stone-500 mx-auto mb-2" />
          <p className="text-stone-400 text-xs font-medium">Drop video here or click to browse</p>
          <p className="text-stone-600 text-[10px] mt-1">MP4, WebM, MOV, AVI — large files supported via resumable upload</p>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept="video/*"
            onChange={(e: ChangeEvent<HTMLInputElement>) => handleFiles(e.target.files)}
          />
        </div>
      )}

      {/* Progress bar during upload */}
      {(status === "uploading" || status === "processing") && (
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-stone-300">
              {status === "uploading" ? "Uploading via resumable TUS…" : "Generating thumbnail…"}
            </span>
            <span className="text-xs text-stone-400 font-mono">{progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#ecc246] rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          {status === "uploading" && (
            <p className="text-[10px] text-stone-500">If connection drops, uploading will resume automatically.</p>
          )}
        </div>
      )}

      {/* Error state */}
      {status === "error" && (
        <div className="flex items-start gap-2 bg-red-950/30 border border-red-900/50 rounded-xl p-3">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-red-300">{error}</p>
            <button
              type="button"
              onClick={() => { setStatus("idle"); setError(null); setProgress(0); }}
              className="text-[10px] text-red-400 hover:underline cursor-pointer mt-1"
            >
              Try again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
