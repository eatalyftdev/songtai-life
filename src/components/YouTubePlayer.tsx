import { useState } from "react";
import { Play } from "lucide-react";
import { getYouTubeEmbedUrl } from "../lib/youtube";

interface YouTubePlayerProps {
  videoId: string;
  poster?: string;
  title: string;
  className?: string;
}

/**
 * Click-to-play YouTube embed. Never mounts the iframe until the user
 * interacts — keeps YouTube's tracking scripts off the initial page load
 * and avoids sending an unvalidated URL straight into an iframe src.
 */
export default function YouTubePlayer({ videoId, poster, title, className }: YouTubePlayerProps) {
  const [playing, setPlaying] = useState(false);
  const embedUrl = getYouTubeEmbedUrl(videoId);

  if (!embedUrl) return null;

  if (playing) {
    return (
      <div className={`aspect-video w-full rounded-xl overflow-hidden bg-black ${className ?? ""}`}>
        <iframe
          src={`${embedUrl}&autoplay=1`}
          title={title}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      className={`relative aspect-video w-full rounded-xl overflow-hidden bg-stone-950 border border-stone-800 group cursor-pointer ${className ?? ""}`}
      aria-label={`Play video: ${title}`}
    >
      {poster && (
        <img src={poster} alt={title} className="w-full h-full object-cover opacity-80 group-hover:opacity-95 transition-opacity" />
      )}
      <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
        <span className="w-16 h-16 rounded-full bg-[#0A7D32] group-hover:bg-emerald-600 text-white flex items-center justify-center shadow-lg transition-transform group-hover:scale-105">
          <Play className="w-6 h-6 text-[#C9A227] fill-[#C9A227] ml-1" />
        </span>
      </div>
    </button>
  );
}
