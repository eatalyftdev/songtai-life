import { useState } from "react";
import { GALLERY_SEED, GalleryImageSeed } from "../../data/mockData";
import { X, Image, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function Gallery() {
  const [activeAlbum, setActiveAlbum] = useState("All");
  const [lightboxImg, setLightboxImg] = useState<GalleryImageSeed | null>(null);

  const albums = ["All", "Conventions", "Product Launches", "Field Training", "Community Outreach"];

  const filteredImages = activeAlbum === "All"
    ? GALLERY_SEED
    : GALLERY_SEED.filter(img => img.album === activeAlbum);

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

          <div className="flex flex-wrap gap-1.5 p-1 bg-stone-950 rounded-xl border border-stone-900 w-fit">
            {albums.map(alb => (
              <button
                key={alb}
                onClick={() => setActiveAlbum(alb)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeAlbum === alb ? "bg-[#0A7D32] text-white" : "text-stone-500 hover:text-stone-300"
                }`}
              >
                {alb}
              </button>
            ))}
          </div>
        </div>

        {/* Masonry-style Grid */}
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
                className="w-full object-cover transition-transform duration-500 group-hover:scale-102"
              />
              {/* Blur Hover Layer */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end text-left">
                <span className="text-[#C9A227] text-[9px] uppercase font-bold tracking-wider">{img.album}</span>
                <p className="text-white text-xs font-semibold leading-relaxed mt-1">{img.caption}</p>
              </div>
            </div>
          ))}
        </div>

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
                
                <div className="text-center space-y-1">
                  <span className="text-[#C9A227] text-[10px] uppercase font-bold tracking-wider">{lightboxImg.album}</span>
                  <p className="text-stone-300 text-sm max-w-xl mx-auto font-medium">{lightboxImg.caption}</p>
                </div>

                <button
                  onClick={() => setLightboxImg(null)}
                  className="p-2.5 bg-stone-900 hover:bg-stone-850 border border-stone-800 hover:text-white rounded-full text-stone-400 absolute -top-12 sm:top-4 sm:right-4 cursor-pointer"
                >
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
