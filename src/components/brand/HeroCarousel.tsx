import { useState, useEffect, useRef, useCallback, type ComponentType } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";
import {
  Pause, Play, Leaf, Sparkles, Star, Shield, Heart,
  Zap, Check, Wind, Sun, Droplets, Award, ChevronRight,
} from "lucide-react";
import { supabase } from "../../lib/supabase";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Benefit {
  icon: string;
  label_en: string;
  label_fr: string;
}

interface CarouselSlide {
  id: string;
  image_url: string;
  title_en: string | null;
  title_fr: string | null;
  subtitle_en: string | null;
  subtitle_fr: string | null;
  badge_label_en: string | null;
  badge_label_fr: string | null;
  benefits: Benefit[];
  cta_link: string | null;
  linked_product_id: string | null;
  sort_order: number;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const INTERVAL_MS = 2000;

const ICON_MAP: Record<string, ComponentType<{ className?: string }>> = {
  Leaf, Sparkles, Star, Shield, Heart, Zap, Check, Wind,
  Sun, Droplets, Award, ChevronRight,
};

const FALLBACK_SLIDES: CarouselSlide[] = [
  {
    id: "f1",
    image_url: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&q=80&w=1200",
    title_en: "Cellular Vitality Pro",
    title_fr: "Vitalité Cellulaire Pro",
    subtitle_en: "Advanced antioxidants from West African botanical heritage",
    subtitle_fr: "Antioxydants avancés du patrimoine botanique ouest-africain",
    badge_label_en: "Featured Solution",
    badge_label_fr: "Solution Vedette",
    benefits: [
      { icon: "Leaf", label_en: "Natural Formula", label_fr: "Formule Naturelle" },
      { icon: "Shield", label_en: "Certified", label_fr: "Certifié" },
      { icon: "Sparkles", label_en: "Premium", label_fr: "Premium" },
    ],
    cta_link: null,
    linked_product_id: null,
    sort_order: 1,
  },
  {
    id: "f2",
    image_url: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=1200",
    title_en: "Luminous Gold Elixir",
    title_fr: "Élixir Or Lumineux",
    subtitle_en: "Ultra-premium face serum with cold-pressed argan oil",
    subtitle_fr: "Sérum visage ultra-premium à l'huile d'argan pressée à froid",
    badge_label_en: "Best Seller",
    badge_label_fr: "Meilleure Vente",
    benefits: [
      { icon: "Sun", label_en: "Brightening", label_fr: "Éclat" },
      { icon: "Droplets", label_en: "Hydrating", label_fr: "Hydratant" },
      { icon: "Award", label_en: "Awarded", label_fr: "Primé" },
    ],
    cta_link: null,
    linked_product_id: null,
    sort_order: 2,
  },
  {
    id: "f3",
    image_url: "https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&q=80&w=1200",
    title_en: "Bio-Yield Max",
    title_fr: "Bio-Rendement Max",
    subtitle_en: "Ecological bio-stimulant for maximum harvest yield",
    subtitle_fr: "Bio-stimulant écologique pour un rendement maximal",
    badge_label_en: "New Arrival",
    badge_label_fr: "Nouveauté",
    benefits: [
      { icon: "Leaf", label_en: "Organic", label_fr: "Bio" },
      { icon: "Zap", label_en: "High Yield", label_fr: "Haut Rendement" },
      { icon: "Check", label_en: "Tested", label_fr: "Testé" },
    ],
    cta_link: null,
    linked_product_id: null,
    sort_order: 3,
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function BenefitIcon({ name }: { name: string }) {
  const Icon = ICON_MAP[name] ?? Leaf;
  return <Icon className="w-3 h-3 flex-shrink-0" />;
}

/** Returns Framer Motion `animate` target for a thumbnail at the given offset from active. */
function arcTarget(offset: number) {
  const abs = Math.abs(offset);
  return {
    scale: Math.max(0.55, 1 - abs * 0.175),
    y: abs * abs * 4.5,
    rotate: offset * 4.5,
    opacity: Math.max(0.3, 1 - abs * 0.28),
    zIndex: 10 - abs,
  };
}

const SPRING = { type: "spring", stiffness: 340, damping: 36 } as const;

// ── Component ──────────────────────────────────────────────────────────────────

export default function HeroCarousel() {
  const { i18n } = useTranslation();
  const locale = i18n.language?.startsWith("fr") ? "fr" : "en";

  const [slides, setSlides] = useState<CarouselSlide[]>(FALLBACK_SLIDES);
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Respect prefers-reduced-motion
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Fetch + Realtime
  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase
        .from("hero_carousel")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (!error && data) {
        setSlides(data.length > 0 ? (data as CarouselSlide[]).map(r => ({
          ...r,
          benefits: Array.isArray(r.benefits) ? r.benefits : [],
        })) : FALLBACK_SLIDES);
      }
    };
    fetch();
    const ch = supabase
      .channel("hero_carousel_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "hero_carousel" }, fetch)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // Keep current in bounds
  useEffect(() => {
    if (slides.length > 0 && current >= slides.length) setCurrent(slides.length - 1);
  }, [slides.length, current]);

  const goTo = useCallback((idx: number) => {
    if (idx === current) return;
    setDirection(idx > current ? 1 : -1);
    setCurrent(idx);
  }, [current]);

  const advance = useCallback((dir: number) => {
    setDirection(dir);
    setCurrent(prev => (prev + dir + slides.length) % slides.length);
  }, [slides.length]);

  // Auto-play — disabled when prefers-reduced-motion
  useEffect(() => {
    if (paused || reducedMotion) return;
    intervalRef.current = setInterval(() => advance(1), INTERVAL_MS);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [slides.length, paused, reducedMotion, advance]);

  // Drag-to-swipe
  const handleDragEnd = (_: unknown, info: { offset: { x: number } }) => {
    if (info.offset.x < -55) advance(1);
    else if (info.offset.x > 55) advance(-1);
  };

  const slide = slides[current];
  const l = (en: string | null, fr: string | null) =>
    locale === "fr" ? (fr || en) : en;

  const title    = l(slide.title_en,    slide.title_fr);
  const subtitle = l(slide.subtitle_en, slide.subtitle_fr);
  const badge    = l(slide.badge_label_en, slide.badge_label_fr);

  // Visible thumbnail indices (up to 5, centred on current)
  const thumbCount = Math.min(slides.length, 5);
  const halfSpan = Math.floor(thumbCount / 2);
  const thumbOffsets: number[] = Array.from({ length: thumbCount }, (_, i) => i - halfSpan);
  const thumbSlides = thumbOffsets.map(off => ({
    off,
    idx: ((current + off) % slides.length + slides.length) % slides.length,
  }));

  // Slide variants
  const variants = reducedMotion
    ? { enter: { opacity: 0 }, center: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        enter:  (d: number) => ({ x: d > 0 ? "100%" : "-100%", opacity: 0 }),
        center: { x: "0%", opacity: 1 },
        exit:   (d: number) => ({ x: d > 0 ? "-100%" : "100%", opacity: 0 }),
      };

  const imgTransition = reducedMotion
    ? { duration: 0.15 }
    : { duration: 0.65, ease: [0.16, 1, 0.3, 1] };

  // Determine click target for a slide
  const slideCta = (s: CarouselSlide): string | null =>
    s.cta_link || null;

  return (
    <div className="flex flex-col gap-2 select-none w-full">
      {/* ── Main image area ────────────────────────────────────────────── */}
      <div
        className="relative w-full overflow-hidden rounded-2xl aspect-[16/9] max-h-[340px]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setTimeout(() => setPaused(false), 2500)}
      >
        <AnimatePresence mode="popLayout" custom={direction}>
          <motion.div
            key={slide.id}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={imgTransition}
            drag={reducedMotion ? false : "x"}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.12}
            onDragEnd={handleDragEnd}
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
            onClick={() => {
              const href = slideCta(slide);
              if (href) window.open(href, "_blank", "noopener,noreferrer");
            }}
            style={{ cursor: slideCta(slide) ? "pointer" : undefined }}
          >
            <img
              src={slide.image_url}
              alt={title || ""}
              className="w-full h-full object-cover"
              draggable={false}
              fetchPriority={current === 0 ? "high" : undefined}
              loading={current === 0 ? "eager" : "lazy"}
            />

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/25 to-transparent pointer-events-none" />

            {/* Badge pill */}
            {badge && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.35 }}
                className="absolute top-3 left-3 pointer-events-none"
              >
                <span className="text-[9px] uppercase tracking-widest font-black text-[color:var(--color-gold)] bg-stone-950/75 backdrop-blur-sm px-2.5 py-1 rounded-full border border-[color:var(--color-gold)]/30">
                  {badge}
                </span>
              </motion.div>
            )}

            {/* Slide text + benefits */}
            <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-none">
              {title && (
                <motion.h3
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12, duration: 0.38 }}
                  className="text-white font-black text-base sm:text-lg drop-shadow-lg leading-tight"
                >
                  {title}
                </motion.h3>
              )}
              {subtitle && (
                <motion.p
                  initial={{ opacity: 0, y: 7 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.35 }}
                  className="text-stone-300 text-[11px] sm:text-xs mt-1 drop-shadow leading-snug"
                >
                  {subtitle}
                </motion.p>
              )}

              {/* Benefits chips */}
              {slide.benefits?.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.28, duration: 0.35 }}
                  className="flex flex-wrap gap-1.5 mt-2"
                >
                  {slide.benefits.slice(0, 4).map((b, bi) => (
                    <span
                      key={bi}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-stone-950/60 backdrop-blur-sm border border-white/10 text-stone-200"
                    >
                      <BenefitIcon name={b.icon} />
                      {locale === "fr" ? (b.label_fr || b.label_en) : b.label_en}
                    </span>
                  ))}
                </motion.div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Progress rail */}
        {!paused && !reducedMotion && (
          <motion.div
            key={`prog-${current}`}
            className="absolute top-0 left-0 h-0.5 bg-[color:var(--color-gold)]/70 pointer-events-none"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: INTERVAL_MS / 1000, ease: "linear" }}
          />
        )}

        {/* Pause / Play */}
        <button
          type="button"
          onClick={() => setPaused(p => !p)}
          aria-label={paused ? "Play carousel" : "Pause carousel"}
          aria-pressed={paused}
          className="absolute top-3 right-3 w-7 h-7 rounded-full bg-stone-950/65 backdrop-blur-sm border border-white/10 text-white flex items-center justify-center cursor-pointer hover:bg-stone-950/85 transition-colors"
        >
          {paused ? <Play className="w-3 h-3 ml-0.5" /> : <Pause className="w-3 h-3" />}
        </button>
      </div>

      {/* ── Arc thumbnail strip (desktop only) ──────────────────────────── */}
      <div
        className="hidden sm:flex items-end justify-center gap-2 h-[72px] py-1"
        aria-label="Carousel thumbnails"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {thumbSlides.map(({ off, idx }) => {
          const s = slides[idx];
          const isActive = idx === current;
          const target = reducedMotion ? { scale: 1, y: 0, rotate: 0, opacity: 1, zIndex: 1 } : arcTarget(off);
          return (
            <motion.button
              key={`thumb-${s.id}`}
              onClick={() => goTo(idx)}
              animate={target}
              transition={reducedMotion ? { duration: 0 } : SPRING}
              aria-label={`Go to slide ${idx + 1}`}
              aria-current={isActive ? "true" : undefined}
              className={`flex-shrink-0 w-[52px] h-[52px] rounded-xl overflow-hidden border-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-gold)] transition-[border-color] duration-300 ${
                isActive
                  ? "border-[color:var(--color-gold)] shadow-md shadow-amber-900/30"
                  : "border-transparent hover:border-white/30"
              }`}
              style={{ originX: 0.5, originY: 1 }}
            >
              <img
                src={s.image_url}
                alt=""
                className="w-full h-full object-cover"
                draggable={false}
                loading="lazy"
              />
            </motion.button>
          );
        })}
      </div>

      {/* ── Mobile dot indicators ────────────────────────────────────────── */}
      <div
        className="flex sm:hidden items-center justify-center gap-1.5 py-1"
        aria-label="Slide indicators"
      >
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}`}
            aria-current={i === current ? "true" : undefined}
            className={`rounded-full transition-all duration-300 cursor-pointer ${
              i === current
                ? "w-5 h-1.5 bg-[color:var(--color-gold)]"
                : "w-1.5 h-1.5 bg-stone-600 hover:bg-stone-400"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
