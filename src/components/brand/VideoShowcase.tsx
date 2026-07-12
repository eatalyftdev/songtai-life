import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Play, Clock, ArrowRight, Film } from "lucide-react";
import { supabase } from "../../lib/supabase";
import SEO from "../SEO";
import YouTubePlayer from "../YouTubePlayer";
import { extractYouTubeId, getYouTubeThumbnail } from "../../lib/youtube";

interface VideoEntry {
  productId: string;
  slug: string;
  productName: string;
  videoUrl: string;
  source: "upload" | "youtube";
  thumbnail: string;
  title: string;
  description: string;
  durationSeconds?: number;
}

interface VideoShowcaseProps {
  onNavigate?: (page: string) => void;
}

function formatDuration(seconds?: number) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function VideoShowcase({ onNavigate }: VideoShowcaseProps) {
  const { i18n } = useTranslation();
  const locale = i18n.language?.startsWith("fr") ? "fr" : "en";

  const [videos, setVideos] = useState<VideoEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<VideoEntry | null>(null);

  useEffect(() => {
    const fetchVideos = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("products")
        .select("id, slug, name_en, name_fr, video_url_en, video_url_fr, video_source_en, video_source_fr, video_thumbnail_en, video_thumbnail_fr, video_title_en, video_title_fr, video_description_en, video_description_fr, video_duration_seconds")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      const entries: VideoEntry[] = (data ?? [])
        .map((row: any): VideoEntry | null => {
          const url = locale === "fr" ? (row.video_url_fr || row.video_url_en) : (row.video_url_en || row.video_url_fr);
          if (!url) return null;
          const source: "upload" | "youtube" = (locale === "fr"
            ? (row.video_url_fr ? row.video_source_fr : row.video_source_en)
            : (row.video_url_en ? row.video_source_en : row.video_source_fr)) === "youtube" ? "youtube" : "upload";
          const thumb = (locale === "fr" ? (row.video_thumbnail_fr || row.video_thumbnail_en) : (row.video_thumbnail_en || row.video_thumbnail_fr))
            || (source === "youtube" ? getYouTubeThumbnail(url) : "") || "";
          const productName = locale === "fr" ? (row.name_fr || row.name_en) : (row.name_en || row.name_fr);
          return {
            productId: row.id,
            slug: row.slug ?? "",
            productName: productName ?? "",
            videoUrl: url,
            source,
            thumbnail: thumb,
            title: (locale === "fr" ? (row.video_title_fr || row.video_title_en) : (row.video_title_en || row.video_title_fr)) || productName || "",
            description: (locale === "fr" ? (row.video_description_fr || row.video_description_en) : (row.video_description_en || row.video_description_fr)) || "",
            durationSeconds: row.video_duration_seconds ?? undefined,
          };
        })
        .filter((v: VideoEntry | null): v is VideoEntry => v !== null);

      setVideos(entries);
      setLoading(false);
    };

    fetchVideos();

    const channel = supabase
      .channel("product_videos_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, fetchVideos)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [locale]);

  const videoListJsonLd = videos.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: videos.map((v, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      item: {
        "@type": "VideoObject",
        name: v.title,
        description: v.description || v.productName,
        thumbnailUrl: v.thumbnail || undefined,
        uploadDate: new Date().toISOString(),
        ...(v.durationSeconds ? { duration: `PT${Math.floor(v.durationSeconds / 60)}M${v.durationSeconds % 60}S` } : {}),
      },
    })),
  } : undefined;

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 py-16 font-sans text-left relative overflow-hidden">
      <SEO
        title="Product Videos"
        description="Watch Songtai Life product videos — see how our wellness, beauty, and agriculture products are made and used."
        breadcrumbs={[{ name: "Videos", url: "/?section=videos" }]}
        jsonLd={videoListJsonLd}
      />
      <div className="absolute top-[10%] right-[5%] w-[450px] h-[450px] rounded-full bg-emerald-700/5 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 relative z-10">
        <div className="border-b border-stone-900 pb-6 space-y-1.5">
          <span className="text-xs uppercase tracking-widest text-[color:var(--color-gold)] font-bold">Watch & Learn</span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Product Videos</h1>
          <p className="text-stone-400 text-xs">See our botanical products in action — sourcing, formulation, and real results.</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="aspect-video rounded-[28px] bg-stone-900/40 animate-pulse" />
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div className="py-24 text-center text-stone-500 space-y-3">
            <Film className="w-12 h-12 text-stone-800 mx-auto" />
            <p className="text-sm">No product videos yet — check back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map(v => (
              <div
                key={v.productId}
                onClick={() => setActive(v)}
                className="bg-stone-900/20 border border-stone-850/60 rounded-[28px] p-4 flex flex-col gap-4 group cursor-pointer transition-all duration-500 hover:bg-stone-900/45 hover:border-emerald-500/20 hover:-translate-y-1"
              >
                <div className="relative aspect-video rounded-2xl overflow-hidden bg-stone-950">
                  {v.thumbnail ? (
                    <img src={v.thumbnail} alt={v.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-stone-900">
                      <Film className="w-8 h-8 text-stone-700" />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/25 group-hover:bg-black/40 transition-colors">
                    <span className="w-12 h-12 rounded-full bg-emerald-700/90 text-white flex items-center justify-center shadow-lg">
                      <Play className="w-5 h-5 text-[color:var(--color-gold)] fill-[color:var(--color-gold)] ml-0.5" />
                    </span>
                  </div>
                  {v.durationSeconds ? (
                    <span className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/80 text-[10px] font-mono text-white rounded flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {formatDuration(v.durationSeconds)}
                    </span>
                  ) : null}
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] uppercase tracking-widest text-stone-500 font-bold block">{v.productName}</span>
                  <h4 className="font-extrabold text-sm text-white group-hover:text-emerald-400 transition-colors line-clamp-1">{v.title}</h4>
                  {v.description && <p className="text-stone-400 text-xs line-clamp-2 leading-relaxed">{v.description}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {active && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setActive(null)}
        >
          <div className="max-w-3xl w-full space-y-4" onClick={e => e.stopPropagation()}>
            {active.source === "youtube" && extractYouTubeId(active.videoUrl) ? (
              <YouTubePlayer videoId={extractYouTubeId(active.videoUrl)!} poster={active.thumbnail} title={active.title} />
            ) : (
              <video
                src={active.videoUrl}
                poster={active.thumbnail || undefined}
                controls
                autoPlay
                playsInline
                className="w-full rounded-xl bg-stone-950 max-h-[70vh] object-contain"
              />
            )}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-white font-bold text-sm">{active.title}</h3>
                {active.description && <p className="text-stone-400 text-xs mt-1">{active.description}</p>}
              </div>
              {onNavigate && (
                <button
                  onClick={() => onNavigate("products")}
                  className="flex-shrink-0 flex items-center gap-1 text-[10px] font-bold text-emerald-400 hover:text-emerald-300"
                >
                  View product <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
            <button
              onClick={() => setActive(null)}
              className="text-stone-500 hover:text-white text-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
