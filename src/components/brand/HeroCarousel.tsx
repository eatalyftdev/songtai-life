import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "motion/react";
import { useTranslation } from "react-i18next";
import { supabase } from "../../lib/supabase";

interface CarouselSlide {
  id: string;
  image_url: string;
  title_en: string | null;
  title_fr: string | null;
  subtitle_en: string | null;
  subtitle_fr: string | null;
  sort_order: number;
}

const FALLBACK_SLIDES: CarouselSlide[] = [
  {
    id: "1",
    image_url: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&q=80&w=1600",
    title_en: "Cellular Vitality Pro",
    title_fr: "Vitalité Cellulaire Pro",
    subtitle_en: "Advanced antioxidants from West African botanical heritage",
    subtitle_fr: "Antioxydants avancés du patrimoine botanique ouest-africain",
    sort_order: 1,
  },
  {
    id: "2",
    image_url: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=1600",
    title_en: "Luminous Gold Elixir",
    title_fr: "Élixir Or Lumineux",
    subtitle_en: "Ultra-premium face serum with cold-pressed argan oil",
    subtitle_fr: "Sérum visage ultra-premium à l'huile d'argan pressée à froid",
    sort_order: 2,
  },
  {
    id: "3",
    image_url: "https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&q=80&w=1600",
    title_en: "Bio-Yield Max",
    title_fr: "Bio-Rendement Max",
    subtitle_en: "Ecological bio-stimulant for maximum harvest yield",
    subtitle_fr: "Bio-stimulant écologique pour un rendement maximal",
    sort_order: 3,
  },
];

const INTERVAL_MS = 5500;

export default function HeroCarousel() {
  const { i18n } = useTranslation();
  const locale = i18n.language?.startsWith("fr") ? "fr" : "en";
  const [slides, setSlides] = useState<CarouselSlide[]>(FALLBACK_SLIDES);
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dragX = useMotionValue(0);

  // Fetch slides from Supabase
  useEffect(() => {
    supabase
      .from("hero_carousel")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => {
        if (data && data.length > 0) setSlides(data);
      });
  }, []);

  // Auto-advance
  const advance = (dir: number) => {
    setDirection(dir);
    setCurrent(prev => (prev + dir + slides.length) % slides.length);
  };

  useEffect(() => {
    if (paused) return;
    intervalRef.current = setInterval(() => advance(1), INTERVAL_MS);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [slides.length, paused]);

  // Drag-to-swipe
  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.x < -60) advance(1);
    else if (info.offset.x > 60) advance(-1);
    dragX.set(0);
  };

  const slide = slides[current];
  const title    = locale === "fr" ? (slide.title_fr    || slide.title_en)    : slide.title_en;
  const subtitle = locale === "fr" ? (slide.subtitle_fr || slide.subtitle_en) : slide.subtitle_en;

  const variants = {
    enter:  (dir: number) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit:   (dir: number) => ({ x: dir > 0 ? "-100%" : "100%", opacity: 0 }),
  };

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl aspect-[16/9] max-h-[420px] select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <AnimatePresence mode="popLayout" custom={direction}>
        <motion.div
          key={slide.id}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.15}
          onDragEnd={handleDragEnd}
          style={{ x: dragX }}
          className="absolute inset-0 cursor-grab active:cursor-grabbing"
        >
          <img
            src={slide.image_url}
            alt={title || ""}
            className="w-full h-full object-cover"
            draggable={false}
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/20 to-transparent" />

          {/* Slide text */}
          {(title || subtitle) && (
            <div className="absolute bottom-0 left-0 right-0 p-5">
              {title && (
                <motion.h3
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.4 }}
                  className="text-white font-black text-lg sm:text-xl drop-shadow-lg"
                >
                  {title}
                </motion.h3>
              )}
              {subtitle && (
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25, duration: 0.4 }}
                  className="text-stone-300 text-xs sm:text-sm mt-1 drop-shadow"
                >
                  {subtitle}
                </motion.p>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Dot indicators + progress bar */}
      <div className="absolute bottom-3 right-4 flex items-center gap-1.5">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => { setDirection(i > current ? 1 : -1); setCurrent(i); }}
            className={`rounded-full transition-all duration-300 cursor-pointer ${
              i === current
                ? "w-5 h-1.5 bg-[#ecc246]"
                : "w-1.5 h-1.5 bg-white/40 hover:bg-white/70"
            }`}
          />
        ))}
      </div>

      {/* Progress bar */}
      {!paused && (
        <motion.div
          key={`progress-${current}`}
          className="absolute top-0 left-0 h-0.5 bg-[#ecc246]/70"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: INTERVAL_MS / 1000, ease: "linear" }}
        />
      )}

      {/* FEATURED label */}
      <div className="absolute top-3 left-3">
        <span className="text-[9px] uppercase tracking-widest font-black text-[#ecc246] bg-stone-950/70 backdrop-blur-sm px-2 py-1 rounded-full border border-[#ecc246]/30">
          Featured Solution
        </span>
      </div>
    </div>
  );
}
