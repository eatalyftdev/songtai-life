import { useState } from "react";
import { FileText, Music, Video, Image as ImageIcon, Archive, Download, X, Play } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import OptimizedImage from "../OptimizedImage";
import { MediaAsset, MediaCategoryGroup, formatFileSize, trackMediaDownload } from "../../lib/mediaCenter";

const FILE_ICONS = {
  video: Video,
  audio: Music,
  document: FileText,
  image: ImageIcon,
  archive: Archive,
} as const;

interface MediaAssetSectionProps {
  groups: MediaCategoryGroup[];
  locale: "en" | "fr";
}

/**
 * Shared per-file-type rendering used by both the public Media Center page
 * and the distributor "Media & Resources" tab. Video/audio never autoplay;
 * documents/images/archives show a download action that increments the
 * server-trusted download counter via RPC before opening the file.
 */
export default function MediaAssetSection({ groups, locale }: MediaAssetSectionProps) {
  const [lightbox, setLightbox] = useState<MediaAsset | null>(null);

  const handleDownload = async (asset: MediaAsset) => {
    trackMediaDownload(asset.id); // fire-and-forget; never blocks the download
    window.open(asset.fileUrl, "_blank", "noopener,noreferrer");
  };

  if (groups.length === 0) {
    return (
      <div className="py-16 text-center">
        <FileText className="w-10 h-10 text-stone-700 mx-auto mb-3" />
        <p className="text-stone-500 text-sm">
          {locale === "fr" ? "Aucune ressource disponible pour le moment." : "No resources available yet."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {groups.map(({ category, assets }) => (
        <section key={category.id}>
          <div className="border-b border-stone-800 pb-3 mb-5">
            <h2 className="text-xl font-extrabold text-white tracking-tight">
              {locale === "fr" ? category.nameFr : category.nameEn}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {assets.map(asset => {
              const title = locale === "fr" ? asset.titleFr : asset.titleEn;
              const description = locale === "fr" ? asset.descriptionFr : asset.descriptionEn;
              const Icon = FILE_ICONS[asset.fileType];

              return (
                <div
                  key={asset.id}
                  className="bg-stone-900/40 border border-stone-800 rounded-2xl overflow-hidden hover:border-emerald-900/50 transition-colors flex flex-col"
                >
                  {/* Media preview */}
                  {asset.fileType === "video" && (
                    <div
                      className="relative aspect-video bg-stone-950 cursor-pointer group"
                      onClick={() => setLightbox(asset)}
                    >
                      {asset.thumbnailUrl ? (
                        <OptimizedImage src={asset.thumbnailUrl} alt={title} width={480} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Video className="w-8 h-8 text-stone-700" />
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
                        <div className="w-11 h-11 rounded-full bg-white/90 flex items-center justify-center">
                          <Play className="w-5 h-5 text-stone-900 ml-0.5" />
                        </div>
                      </div>
                    </div>
                  )}

                  {asset.fileType === "image" && (
                    <div
                      className="relative aspect-video bg-stone-950 cursor-pointer"
                      onClick={() => setLightbox(asset)}
                    >
                      <OptimizedImage src={asset.fileUrl} alt={title} width={480} className="w-full h-full object-cover" />
                    </div>
                  )}

                  {asset.fileType === "audio" && (
                    <div className="p-4 pb-0">
                      <audio controls preload="none" className="w-full h-10">
                        <source src={asset.fileUrl} />
                      </audio>
                    </div>
                  )}

                  {(asset.fileType === "document" || asset.fileType === "archive") && (
                    <div className="aspect-[3/1] bg-stone-950/60 flex items-center justify-center">
                      <Icon className="w-9 h-9 text-stone-600" />
                    </div>
                  )}

                  {/* Meta + actions */}
                  <div className="p-4 flex-1 flex flex-col">
                    <p className="text-white font-semibold text-sm leading-snug">{title}</p>
                    {description && (
                      <p className="text-stone-500 text-xs mt-1 leading-relaxed line-clamp-2">{description}</p>
                    )}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-stone-800/70">
                      <span className="text-stone-600 text-[10px] uppercase tracking-wide">
                        {formatFileSize(asset.fileSizeBytes) || asset.fileType}
                      </span>
                      <button
                        onClick={() => handleDownload(asset)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 cursor-pointer transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        {locale === "fr" ? "Télécharger" : "Download"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {/* Lightbox for video/image preview — click-to-play, never autoplay */}
      <AnimatePresence>
        {lightbox && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
            <div className="absolute inset-0 cursor-pointer" onClick={() => setLightbox(null)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative max-w-4xl w-full z-10"
            >
              {lightbox.fileType === "video" ? (
                <video
                  src={lightbox.fileUrl}
                  poster={lightbox.thumbnailUrl || undefined}
                  controls
                  autoPlay={false}
                  className="w-full max-h-[80vh] rounded-2xl bg-black"
                />
              ) : (
                <img
                  src={lightbox.fileUrl}
                  alt={locale === "fr" ? lightbox.titleFr : lightbox.titleEn}
                  className="w-full max-h-[80vh] object-contain rounded-2xl"
                />
              )}
              <button
                onClick={() => setLightbox(null)}
                className="absolute -top-3 -right-3 p-2 bg-stone-900 rounded-full text-white hover:bg-stone-800 cursor-pointer border border-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
