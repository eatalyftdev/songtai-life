import { useState, useEffect } from "react";
import { X, Image } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../../lib/supabase";
import { useTranslation } from "react-i18next";

interface LiveImage {
  id: string; url: string; caption: string; album: string;
}

interface LiveAlbum {
  id: string; nameEn: string; nameFr: string;
}

export default function Gallery() {
  const { i18n } = useTranslation();
  const locale = i18n.language?.startsWith("fr") ? "fr" : "en";

  const [images, setImages] = useState<LiveImage[]>([]);
  const [albums, setAlbums] = useState<LiveAlbum[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeAlbum, setActiveAlbum] = useState("All");
  const [lightboxImg, setLightboxImg] = useState<LiveImage | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [{ data: albData }, { data: imgData }] = await Promise.all([
        supabase.from("gallery_albums").select("*").order("display_order"),
        supabase.from("gallery_images").select("*, gallery_albums(name_en, name_fr)").order("display_order"),
      ]);

      const fetchedAlbums: LiveAlbum[] = (albData ?? []).map((a: any) => ({
        id: a.id, nameEn: a.name_en ?? "", nameFr: a.name_fr ?? a.name_en ?? "",
      }));

      const fetchedImages: LiveImage[] = (imgData ?? []).map((img: any) => {
        const captionEn = img.caption_en ?? img.caption ?? "";
        const captionFr = img.caption_fr ?? captionEn;
        const albumNameEn = img.gallery_albums?.name_en ?? img.album ?? "";
        const albumNameFr = img.gallery_albums?.name_fr ?? albumNameEn;
        return {
          id: img.id,
          url: img.url ?? img.image_url ?? "",
          caption: locale === "fr" ? captionFr : captionEn,
          album: locale === "fr" ? albumNameFr : albumNameEn,
        };
      });

      setImages(fetchedImages);
      setAlbums(fetchedAlbums);
      setLoading(false);
    };

    fetchData();
    const ch = supabase.channel("public_gallery_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "gallery_images" }, fetchData)
      .on("postgres_changes", { event: "*", schema: "public", table: "gallery_albums" }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [locale]);

  // Album filter list: from DB if available, else derive from image data
  const albumLabels: { key: string; label: string }[] =
    albums.length > 0
      ? albums.map(a => ({ key: a.id, label: locale === "fr" ? a.nameFr : a.nameEn }))
      : Array.from(new Set(images.map(i => i.album).filter(Boolean))).map(a => ({ key: a, label: a }));

  const filteredImages = activeAlbum === "All"
    ? images
    : albums.length > 0
      ? images.filter(img => {
          const alb = albums.find(a => a.id === activeAlbum);
          return alb ? img.album === (locale === "fr" ? alb.nameFr : alb.nameEn) : false;
        })
      : images.filter(img => img.album === activeAlbum);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 py-16 font-sans text-left relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 relative z-10">

        {/* Title */}
        <div className="border-b border-stone-900 pb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div className="space-y-1.5">
            <span className="text-xs uppercase tracking-widest text-[#C9A227] font-bold">Visual Archives</span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Media & Press Gallery</h1>
            <p className="text-stone-400 text-xs">High-definition records of summits, organic farm harvests, and active regional awards.</p>
          </div>

          {/* Album filter pills */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-stone-950 rounded-xl border border-stone-900 w-fit">
            <button
              onClick={() => setActiveAlbum("All")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeAlbum === "All" ? "bg-[#0A7D32] text-white" : "text-stone-500 hover:text-stone-300"
              }`}
            >
              {locale === "fr" ? "Tout" : "All"}
            </button>
            {albumLabels.map(alb => (
              <button
                key={alb.key}
                onClick={() => setActiveAlbum(alb.key)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeAlbum === alb.key ? "bg-[#0A7D32] text-white" : "text-stone-500 hover:text-stone-300"
                }`}
              >
                {alb.label}
              </button>
            ))}
          </div>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="columns-1 sm:columns-2 md:columns-3 gap-6 space-y-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="break-inside-avoid bg-stone-800 rounded-2xl h-48 animate-pulse mb-6" />
            ))}
          </div>
        )}

        {!loading && filteredImages.length === 0 && (
          <div className="py-20 text-center">
            <Image className="w-10 h-10 text-stone-700 mx-auto mb-3" />
            <p className="text-stone-500 text-sm">No images in this album yet.</p>
          </div>
        )}

        {/* Masonry-style Grid */}
        {!loading && filteredImages.length > 0 && (
          <div className="columns-1 sm:columns-2 md:columns-3 gap-6 space-y-6">
            {filteredImages.map(img => (
              <div
                key={img.id}
                onClick={() => setLightboxImg(img)}
                className="break-inside-avoid bg-stone-900/30 border border-stone-850/80 rounded-2xl overflow-hidden group cursor-pointer hover:border-emerald-950/60 transition-all relative"
              >
                <img
                  src={img.url}
                  alt={img.caption}
                  loading="lazy"
                  className="w-full object-cover transition-transform duration-500 group-hover:scale-102"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end text-left">
                  <span className="text-[color:var(--color-gold)] text-[9px] uppercase font-bold tracking-wider">{img.album}</span>
                  <p className="text-white text-xs font-semibold leading-relaxed mt-1">{img.caption}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Lightbox Modal */}
        <AnimatePresence>
          {lightboxImg && (
            <div className="fixed inset-0 z-[120] flex flex-col items-center justify-center p-4 bg-black/95 backdrop-blur-md">
              <div className="absolute inset-0 cursor-pointer" onClick={() => setLightboxImg(null)} />
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative max-w-4xl w-full z-10 flex flex-col items-center gap-4"
              >
                <img
                  src={lightboxImg.url}
                  alt={lightboxImg.caption}
                  className="rounded-3xl max-h-[80vh] max-w-full object-contain border border-stone-800"
                />
                {lightboxImg.caption && (
                  <p className="text-white text-sm text-center max-w-xl">{lightboxImg.caption}</p>
                )}
                {lightboxImg.album && (
                  <span className="text-[#C9A227] text-[10px] uppercase font-bold tracking-widest">{lightboxImg.album}</span>
                )}
                <button onClick={() => setLightboxImg(null)}
                  className="absolute top-0 right-0 p-2 bg-stone-900/80 rounded-xl text-white hover:bg-stone-900 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
