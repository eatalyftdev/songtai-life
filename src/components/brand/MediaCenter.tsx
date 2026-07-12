import { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Download, Play, FileText, Volume2, ShieldCheck, ExternalLink, Pause, Leaf } from "lucide-react";

export default function MediaCenter() {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const showNotice = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(null), 3000);
  };

  // Simulated audio track
  const audioTrackUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

  const toggleAudio = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(audioTrackUrl);
      audioRef.current.loop = true;
    }
    if (isPlayingAudio) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => console.log("Audio play blocked by browser policy"));
    }
    setIsPlayingAudio(!isPlayingAudio);
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 py-16 font-sans text-left relative overflow-hidden">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 relative z-10">
        
        {/* Header */}
        <div className="space-y-4">
          <span className="text-xs uppercase tracking-widest text-[color:var(--color-gold)] font-bold">Press Archives</span>
          <h1 className="text-4xl font-extrabold text-white tracking-tight">Media & Download Center</h1>
          <p className="text-stone-400 text-sm max-w-xl leading-relaxed">
            Access authorized marketing pamphlets, presentation folders, pan-African product catalogs, and certified media streams to scale your regional meetings.
          </p>
        </div>

        {/* Non-blocking inline notice — replaces native alert() popups */}
        <AnimatePresence>
          {notice && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-stone-900 border border-stone-800 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-xl"
              role="status"
            >
              {notice}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 1. Video Section */}
        <div className="bg-stone-900/30 border border-stone-850 p-6 sm:p-8 rounded-[32px] space-y-6">
          <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider block">Corporate Presentation Video</span>
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            {/* Visual placeholder — branded pattern, not a mismatched stock photo */}
            <div className="md:col-span-7 aspect-video rounded-2xl overflow-hidden bg-stone-950 border border-stone-800 relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-stone-950 to-stone-950" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Leaf className="w-20 h-20 text-emerald-900" strokeWidth={1} aria-hidden="true" />
              </div>
              <div className="signature-rule absolute bottom-0 left-0 right-0" aria-hidden="true" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/45 transition-colors">
                <button
                  onClick={() => showNotice("Corporate video coming soon — production stream loads once published.")}
                  className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-lg cursor-pointer transition-transform group-hover:scale-105"
                  aria-label="Play corporate presentation video"
                >
                  <Play className="w-6 h-6 text-[color:var(--color-gold)] fill-[color:var(--color-gold)] ml-1" />
                </button>
              </div>
            </div>

            {/* Description */}
            <div className="md:col-span-5 space-y-4 text-left">
              <span className="text-emerald-400 text-xs font-bold font-mono">Run Time: 4:32</span>
              <h3 className="text-xl font-bold text-white leading-snug">Songtai Life: Sowing Abundance</h3>
              <p className="text-stone-400 text-xs sm:text-sm leading-relaxed">
                Take a behind-the-scenes look at our northern Cameroon botanical collection facilities, our laboratory testing standards, and double diamond award ceremonies.
              </p>
              <div className="pt-2">
                <span className="text-[10px] font-bold text-[color:var(--color-gold)] flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> Authorized Corporate Copy
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Downloadable PDFs & Catalogues */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-white border-b border-stone-900 pb-2">Business Materials & PDFs</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                title: "Songtai Product Catalog 2026",
                desc: "High-resolution PDF featuring entire botanical capsules, skincare serum ingredients, and agricultural liquid dosages.",
                size: "4.8 MB (PDF)",
                file: "songtai_catalog_2026.pdf"
              },
              {
                title: "Compensation Plan Guidebook",
                desc: "A thorough handbook illustrating active binary cycles, unilevel override ranks, and fast-track diamond awards.",
                size: "2.1 MB (PDF)",
                file: "songtai_compensation_v3.pdf"
              },
              {
                title: "Physical Banner Layouts",
                desc: "Print-ready high-resolution billboard and standee templates for local Yaoundé and Douala training hubs.",
                size: "18.5 MB (ZIP)",
                file: "songtai_marketing_banners.zip"
              }
            ].map((dl, idx) => (
              <div key={idx} className="bg-stone-900/10 border border-stone-850 p-6 rounded-2xl flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-600/10 border border-emerald-600/20 text-[color:var(--color-gold)] rounded-xl w-fit">
                    <FileText className="w-5 h-5" />
                  </div>
                  <h4 className="font-extrabold text-white text-base leading-snug">{dl.title}</h4>
                  <p className="text-stone-400 text-xs leading-relaxed">{dl.desc}</p>
                </div>

                <div className="pt-4 flex items-center justify-between border-t border-stone-900 text-xs">
                  <span className="text-stone-500 font-mono">{dl.size}</span>
                  <button
                    onClick={() => showNotice(`Preparing ${dl.file} for download…`)}
                    className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    Download <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Audio / Anthem Section */}
        <div className="bg-emerald-600/5 border border-emerald-950/40 p-6 rounded-[24px] flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-left">
            <div className="p-3 bg-[color:var(--color-gold)]/10 text-[color:var(--color-gold)] rounded-xl border border-[color:var(--color-gold)]/20">
              <Volume2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-extrabold text-white text-base">Songtai Life Official Brand Anthem</h4>
              <p className="text-stone-400 text-xs mt-0.5 max-w-md">
                Listen to the official musical theme played at all pan-African Diamond Leadership conferences.
              </p>
            </div>
          </div>

          <button
            onClick={toggleAudio}
            className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer transition-all shadow-md self-stretch sm:self-auto justify-center keep-white"
          >
            {isPlayingAudio ? (
              <>
                <Pause className="w-4 h-4 text-[color:var(--color-gold)] fill-[color:var(--color-gold)]" />
                <span>Pause Anthem</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 text-[color:var(--color-gold)] fill-[color:var(--color-gold)]" />
                <span>Play Anthem</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
