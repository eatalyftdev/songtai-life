import { useState, useEffect, useCallback, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";
import HeroCarousel from "./HeroCarousel";
import {
  Award, TrendingUp, Users, Star, ArrowRight, Sparkles, Check,
  Clock, Calendar, ChevronRight, X, Image as ImageIcon,
} from "lucide-react";
import { PRODUCTS_SEED, BLOG_SEED, TESTIMONIALS_SEED } from "../../data/mockData";
import { supabase } from "../../lib/supabase";
import { useHomepageSection } from "../../hooks/useHomepageSection";

// ── Icon map for DB-stored icon names ──────────────────────────────────────
type LucideIcon = typeof Award;
const ICON_MAP: Record<string, LucideIcon> = { Award, TrendingUp, Users, Star };
function DynIcon({ name, className }: { name: string; className?: string }) {
  const I = ICON_MAP[name] ?? Award;
  return <I className={className} />;
}

interface DBEvent {
  id: string; slug: string; title: string;
  start_at: string; location: string | null;
  capacity: number | null; description: string | null;
  image: string | null;
}

interface DBGalleryImage {
  id: string; url: string;
  caption_en: string | null; caption_fr: string | null;
  caption: string | null;
}

interface HomeSectionProps {
  onNavigate: (page: string) => void;
  onAddToCart: (product: any) => void;
  theme?: "dark" | "light";
}

export default function HomeSection({ onNavigate, onAddToCart, theme = "dark" }: HomeSectionProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith("fr") ? "fr" : "en";
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [currentTestimonialIdx, setCurrentTestimonialIdx] = useState(0);
  const [selectedGalleryImg, setSelectedGalleryImg] = useState<string | null>(null);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterSubmitted, setNewsletterSubmitted] = useState(false);

  // ── Homepage sections from DB (admin-editable) ─────────────────────────
  const { content: heroSection } = useHomepageSection("hero", {
    headline_en: "", headline_fr: "",
    subheadline_en: "", subheadline_fr: "",
    cta_primary_en: "", cta_primary_fr: "",
    cta_secondary_en: "", cta_secondary_fr: "",
  });

  const { content: companyIntroSection } = useHomepageSection("company_intro", {
    story_en: "", story_fr: "",
    stat_countries: 12, stat_members: 42800,
    stat_products: 24, stat_years: 8, stat_awards: 15,
  });

  const { content: opportunitySection } = useHomepageSection("opportunity", {
    steps: [] as Array<{ label_en: string; label_fr: string; desc_en: string; desc_fr: string }>,
  });

  const { content: benefitsSection } = useHomepageSection("benefits", {
    headline_en: "", headline_fr: "", sub_en: "", sub_fr: "",
    items: [] as Array<{ icon: string; title_en: string; title_fr: string; desc_en: string; desc_fr: string }>,
  });

  const { content: newsletterSection } = useHomepageSection("newsletter", {
    headline_en: "", headline_fr: "", body_en: "", body_fr: "",
  });

  // ── Resolved text (DB > i18n fallback) ─────────────────────────────────
  const heroHeadline = locale === "fr"
    ? (heroSection.headline_fr || t("hero.slogan"))
    : (heroSection.headline_en || t("hero.slogan"));
  const heroSub = locale === "fr"
    ? (heroSection.subheadline_fr || t("hero.sub"))
    : (heroSection.subheadline_en || t("hero.sub"));
  const heroCta1 = locale === "fr"
    ? (heroSection.cta_primary_fr || t("hero.cta.join"))
    : (heroSection.cta_primary_en || t("hero.cta.join"));
  const heroCta2 = locale === "fr"
    ? (heroSection.cta_secondary_fr || t("hero.cta.products"))
    : (heroSection.cta_secondary_en || t("hero.cta.products"));

  const introStory = locale === "fr"
    ? (companyIntroSection.story_fr || t("home.intro.body"))
    : (companyIntroSection.story_en || t("home.intro.body"));

  const OPPORTUNITY_STEPS = opportunitySection.steps && opportunitySection.steps.length > 0
    ? opportunitySection.steps.map((s, idx) => ({
        step: String(idx + 1).padStart(2, "0"),
        label: locale === "fr" ? (s.label_fr || s.label_en) : s.label_en,
        desc:  locale === "fr" ? (s.desc_fr  || s.desc_en)  : s.desc_en,
      }))
    : [
        { step: "01", label: t("home.opp.step1.label"), desc: t("home.opp.step1.desc") },
        { step: "02", label: t("home.opp.step2.label"), desc: t("home.opp.step2.desc") },
        { step: "03", label: t("home.opp.step3.label"), desc: t("home.opp.step3.desc") },
        { step: "04", label: t("home.opp.step4.label"), desc: t("home.opp.step4.desc") },
      ];

  const BENEFIT_CARDS = benefitsSection.items && benefitsSection.items.length > 0
    ? benefitsSection.items.map(item => ({
        icon: item.icon,
        title: locale === "fr" ? (item.title_fr || item.title_en) : item.title_en,
        desc:  locale === "fr" ? (item.desc_fr  || item.desc_en)  : item.desc_en,
      }))
    : [
        { icon: "Award",      title: t("home.benefits.card1.title"), desc: t("home.benefits.card1.desc") },
        { icon: "TrendingUp", title: t("home.benefits.card2.title"), desc: t("home.benefits.card2.desc") },
        { icon: "Users",      title: t("home.benefits.card3.title"), desc: t("home.benefits.card3.desc") },
      ];

  const newsletterHeadline = locale === "fr"
    ? (newsletterSection.headline_fr || t("newsletter.title"))
    : (newsletterSection.headline_en || t("newsletter.title"));
  const newsletterBody = locale === "fr"
    ? (newsletterSection.body_fr || t("newsletter.desc"))
    : (newsletterSection.body_en || t("newsletter.desc"));

  // ── Live data: products ─────────────────────────────────────────────────
  const [liveProducts, setLiveProducts] = useState<typeof PRODUCTS_SEED>([]);
  const [dbProductsLoaded, setDbProductsLoaded] = useState(false);
  useEffect(() => {
    const fetch = async () => {
      const { data: featured, error } = await supabase
        .from("products")
        .select("*, product_categories(name)")
        .eq("is_active", true)
        .eq("is_featured", true)
        .order("featured_order", { ascending: true })
        .limit(8);

      if (error) {
        // Only fall back to seeds on first load if Supabase is unreachable
        if (!dbProductsLoaded) setLiveProducts(PRODUCTS_SEED);
        return;
      }

      let rows = featured ?? [];
      if (rows.length < 4) {
        const featuredIds = new Set(rows.map((r: any) => r.id));
        const { data: recent } = await supabase
          .from("products")
          .select("*, product_categories(name)")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(16);
        const padding = (recent ?? [])
          .filter((r: any) => !featuredIds.has(r.id))
          .slice(0, 8 - rows.length);
        rows = [...rows, ...padding];
      }

      // Always update — even empty result clears deleted products
      setLiveProducts(rows.map((row: any) => ({
        id: row.id, slug: row.slug ?? "",
        name: locale === "fr" ? (row.name_fr || row.name_en || "") : (row.name_en || ""),
        description: locale === "fr" ? (row.description_fr || row.description_en || "") : (row.description_en || ""),
        priceXaf: row.price_xaf ?? 0, pvPoints: row.pv_points ?? 0,
        category: row.product_categories?.name ?? "Health",
        images: row.images ?? (row.image ? [row.image] : []),
        isActive: row.is_active ?? true,
        benefits: [], usage: "", usageInstructions: "",
        strikePrice: row.strike_price_xaf,
      })));
      setDbProductsLoaded(true);
    };
    fetch();
    const ch = supabase.channel("home_products_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, fetch)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [locale]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Live data: blog posts ───────────────────────────────────────────────
  const [liveBlogPosts, setLiveBlogPosts] = useState<typeof BLOG_SEED>(BLOG_SEED);
  useEffect(() => {
    const fetchBlogs = async () => {
      const { data, error } = await supabase
        .from("blog_posts").select("*").eq("status", "published")
        .order("published_at", { ascending: false }).limit(6);
      if (!error && data && data.length > 0) {
        setLiveBlogPosts(data.map((row: any) => ({
          id: row.id, slug: row.slug ?? "",
          title: row.title ?? "", excerpt: row.excerpt ?? "",
          body: row.body ?? "", category: row.category ?? "Wellness",
          publishedAt: row.published_at ? row.published_at.slice(0, 10) : "",
          image: row.image ?? "", author: row.author ?? "",
        })));
      }
    };
    fetchBlogs();
    const ch = supabase.channel("home_blog_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "blog_posts" }, fetchBlogs)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // ── Live data: testimonials ─────────────────────────────────────────────
  const [liveTestimonials, setLiveTestimonials] = useState<typeof TESTIMONIALS_SEED>(TESTIMONIALS_SEED);
  useEffect(() => {
    const fetchTestimonials = async () => {
      const { data, error } = await supabase
        .from("testimonials").select("*").order("display_order").limit(10);
      if (!error && data && data.length > 0) {
        setLiveTestimonials(data.map((row: any) => ({
          id: row.id, name: row.name ?? "", rank: row.rank ?? "", region: row.region ?? "",
          quote: locale === "fr" ? (row.quote_fr || row.quote || "") : (row.quote || ""),
          image: row.image ?? "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
          videoUrl: row.video_url ?? "",
        })));
      }
    };
    fetchTestimonials();
    const ch = supabase.channel("home_testimonials_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "testimonials" }, fetchTestimonials)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [locale]);

  // ── Live data: events ───────────────────────────────────────────────────
  const [liveEvents, setLiveEvents] = useState<DBEvent[]>([]);
  const fetchEvents = useCallback(async () => {
    const { data } = await supabase
      .from("events").select("*")
      .gte("start_at", new Date().toISOString())
      .order("start_at", { ascending: true }).limit(3);
    setLiveEvents(data ?? []);
  }, []);
  useEffect(() => {
    fetchEvents();
    const ch = supabase.channel("home_events_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, fetchEvents)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchEvents]);

  // ── Live data: gallery teaser ───────────────────────────────────────────
  const [liveGallery, setLiveGallery] = useState<DBGalleryImage[]>([]);
  const fetchGallery = useCallback(async () => {
    const { data } = await supabase
      .from("gallery_images").select("id, url, caption_en, caption_fr, caption")
      .order("display_order", { ascending: true }).limit(6);
    setLiveGallery(data ?? []);
  }, []);
  useEffect(() => {
    fetchGallery();
    const ch = supabase.channel("home_gallery_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "gallery_images" }, fetchGallery)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchGallery]);

  // ── Countdown for live events ───────────────────────────────────────────
  const [countdowns, setCountdowns] = useState<{ [key: string]: string }>({});
  useEffect(() => {
    const calc = () => {
      const updated: { [key: string]: string } = {};
      liveEvents.forEach(ev => {
        const diff = new Date(ev.start_at).getTime() - Date.now();
        if (diff <= 0) {
          updated[ev.id] = t("events.live", "Live Now");
        } else {
          const d = Math.floor(diff / (1000 * 60 * 60 * 24));
          const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const s = Math.floor((diff % (1000 * 60)) / 1000);
          updated[ev.id] = `${d}d ${h}h ${m}m ${s}s`;
        }
      });
      setCountdowns(updated);
    };
    calc();
    const iv = setInterval(calc, 1000);
    return () => clearInterval(iv);
  }, [liveEvents, t]);

  useEffect(() => {
    const iv = setInterval(() => {
      setCurrentTestimonialIdx(prev => (prev + 1) % liveTestimonials.length);
    }, 6000);
    return () => clearInterval(iv);
  }, [liveTestimonials.length]);

  // ── Live data: product categories (for homepage filter tabs) ───────────────
  const [liveCategories, setLiveCategories] = useState<{ key: string; label: string }[]>([]);
  useEffect(() => {
    const fetchCats = async () => {
      const { data } = await supabase
        .from("product_categories")
        .select("name, name_fr, display_order")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (data && data.length > 0) {
        setLiveCategories(data.map((c: any) => ({
          key: c.name ?? "",
          label: locale === "fr" ? (c.name_fr || c.name || "") : (c.name || ""),
        })));
      }
    };
    fetchCats();
    const ch = supabase.channel("home_cats_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "product_categories" }, fetchCats)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [locale]);

  const CATEGORIES = [
    { key: "all", label: t("home.cat.all") },
    ...liveCategories,
  ];

  const filteredProducts = activeCategory === "all"
    ? liveProducts.slice(0, 4)
    : liveProducts.filter(p => p.category === activeCategory).slice(0, 4);

  const handleSubscribe = async (e: FormEvent) => {
    e.preventDefault();
    if (newsletterEmail.trim()) {
      await supabase.from("newsletter_subscribers")
        .upsert({ email: newsletterEmail.trim(), locale, status: "active" }, { onConflict: "email" });
      setNewsletterSubmitted(true);
      setTimeout(() => setNewsletterEmail(""), 3000);
    }
  };

  // ── Theme-aware class helpers ───────────────────────────────────────────
  const cardBg       = theme === "light" ? "bg-white border-stone-200"                            : "bg-stone-900/20 border-stone-850/70";
  const sectionBg    = theme === "light" ? "bg-stone-50 border-y border-stone-200"                : "bg-stone-900/35 border-y border-stone-900/60";
  const storiesBg    = theme === "light" ? "bg-emerald-50/60"                                     : "bg-[#0A7D32]/5";
  const cardHover    = theme === "light" ? "hover:border-emerald-300 hover:bg-emerald-50/60"       : "hover:border-emerald-950/60 hover:bg-stone-900/40";
  const textPrimary  = theme === "light" ? "text-stone-900"  : "text-white";
  const textMuted    = theme === "light" ? "text-stone-500"  : "text-stone-400";
  const textDim      = theme === "light" ? "text-stone-400"  : "text-stone-500";
  const borderColor  = theme === "light" ? "border-stone-200": "border-stone-900";
  const statsCard    = theme === "light" ? "bg-white border-stone-200"                            : "bg-stone-900/30 border-stone-850/60";
  const btnPill      = theme === "light"
    ? "bg-white border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-50"
    : "bg-stone-900 border-stone-800 text-stone-300 hover:text-white";
  const timelineCircle = theme === "light" ? "bg-white border-stone-300" : "bg-stone-950 border-stone-800";
  const accentGold = theme === "light" ? "text-[#92751C]" : "text-[#C9A227]";
  const accentGreen = theme === "light" ? "text-[#0A7D32]" : "text-emerald-400";

  // Hero headline split into words for stagger animation
  const heroWords = heroHeadline.split(" ");

  return (
    <div className="space-y-16 sm:space-y-24 pb-16 sm:pb-24 overflow-x-hidden">

      {/* ── SECTION 1: HERO ──────────────────────────────────────────── */}
      <section className="relative min-h-[100svh] flex items-center justify-center pt-20 sm:pt-24 px-4 overflow-hidden">
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[10%] left-[20%] w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] rounded-full bg-[#0A7D32]/10 blur-[80px] sm:blur-[120px] animate-float-1" />
          <div className="absolute bottom-[15%] right-[10%] w-[250px] sm:w-[500px] h-[250px] sm:h-[500px] rounded-full bg-[#C9A227]/10 blur-[60px] sm:blur-[100px] animate-float-2" />
        </div>

        <svg className="absolute inset-0 w-full h-full stroke-stone-900/40 pointer-events-none hidden sm:block" xmlns="http://www.w3.org/2000/svg">
          <line x1="10%" y1="0" x2="10%" y2="100%" strokeDasharray="5,5" />
          <line x1="30%" y1="0" x2="30%" y2="100%" strokeDasharray="5,5" />
          <line x1="70%" y1="0" x2="70%" y2="100%" strokeDasharray="5,5" />
          <line x1="90%" y1="0" x2="90%" y2="100%" strokeDasharray="5,5" />
        </svg>

        <div className="max-w-7xl mx-auto w-full relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center text-left">
          <div className="lg:col-span-7 space-y-6 sm:space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className={`inline-flex items-center gap-2 px-3 py-1 bg-[#0A7D32]/10 border border-[#0A7D32]/30 rounded-full text-xs font-semibold ${accentGreen}`}
            >
              <Sparkles className={`w-3.5 h-3.5 ${accentGold} flex-shrink-0`} />
              <span>{t("home.badge")}</span>
            </motion.div>

            {/* Word-level staggered headline */}
            <h1
              className={`text-[2rem] leading-[1.1] tracking-[-0.02em] sm:text-5xl sm:leading-[1.05] sm:tracking-[-0.03em] lg:text-7xl lg:leading-[1.0] font-extrabold ${textPrimary}`}
              aria-label={heroHeadline}
            >
              {heroWords.map((word, i) => (
                <motion.span
                  key={`${word}-${i}`}
                  className="inline-block mr-[0.25em] last:mr-0"
                  initial={{ opacity: 0, y: 32 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.7,
                    delay: 0.1 + i * 0.08,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  {word}
                </motion.span>
              ))}
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 + heroWords.length * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className={`${textMuted} text-sm sm:text-base max-w-xl leading-relaxed`}
            >
              {heroSub}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 + heroWords.length * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col xs:flex-row flex-wrap gap-3 sm:gap-4 pt-2"
            >
              <button
                onClick={() => onNavigate("join")}
                className="px-6 sm:px-8 py-3.5 sm:py-4 bg-[#0A7D32] hover:bg-[#086327] text-white font-bold text-sm rounded-2xl transition-all duration-200 shadow-lg hover:shadow-emerald-950/40 hover:scale-[1.02] cursor-pointer flex items-center justify-center gap-2 group border border-transparent min-h-[48px]"
              >
                <span>{heroCta1}</span>
                <ArrowRight className={`w-4 h-4 ${accentGold} transition-transform duration-200 group-hover:translate-x-1 flex-shrink-0`} />
              </button>

              <button
                onClick={() => onNavigate("products")}
                className={`px-6 sm:px-8 py-3.5 sm:py-4 ${theme === "light" ? "bg-white border-stone-300 text-stone-700 hover:bg-stone-50" : "bg-stone-900/60 border-stone-800 text-stone-300 hover:text-white"} border font-bold text-sm rounded-2xl transition-all duration-200 hover:scale-[1.01] cursor-pointer min-h-[48px]`}
              >
                {heroCta2}
              </button>
            </motion.div>
          </div>

          <motion.div
            className="lg:col-span-5"
            initial={{ opacity: 0, scale: 0.93 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <HeroCarousel />
          </motion.div>
        </div>

        <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 hidden sm:flex flex-col items-center gap-1.5 opacity-50">
          <span className={`text-[9px] uppercase tracking-widest ${textDim} font-bold`}>{t("home.scroll")}</span>
          <div className="w-1.5 h-6 bg-stone-800 rounded-full overflow-hidden">
            <div className={`w-full h-2 bg-[#C9A227] rounded-full animate-bounce mt-1`} />
          </div>
        </div>
      </section>

      {/* ── SECTION 2: COMPANY INTRO ──────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          <div className="lg:col-span-6 space-y-5">
            <span className={`text-xs uppercase tracking-widest ${accentGold} font-bold`}>{t("home.intro.label")}</span>
            <h2 className={`text-2xl sm:text-3xl lg:text-4xl font-extrabold ${textPrimary} leading-tight`}>
              {t("home.intro.heading")}
            </h2>
            <p className={`${textMuted} text-sm leading-relaxed`}>
              {introStory}
            </p>
            <button
              onClick={() => onNavigate("about")}
              className={`${accentGreen} hover:opacity-80 font-bold text-sm flex items-center gap-2 transition-all duration-200 cursor-pointer group`}
            >
              <span>{t("home.intro.cta")}</span>
              <ChevronRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1 flex-shrink-0" />
            </button>
          </div>

          <div className="lg:col-span-6 grid grid-cols-2 gap-3 sm:gap-4">
            {[
              { value: `${((companyIntroSection.stat_members as number) / 1000).toFixed(1)}k+`, labelKey: "stats.members", colorCls: textPrimary },
              { value: `+${companyIntroSection.stat_countries}`, labelKey: "stats.countries", colorCls: accentGreen },
              { value: `${companyIntroSection.stat_products}`,   labelKey: "stats.products",  colorCls: textPrimary },
              { value: `${companyIntroSection.stat_awards}`,     labelKey: "stats.awards",    colorCls: accentGold },
            ].map((stat, i) => (
              <div key={i} className={`${statsCard} border p-4 sm:p-6 rounded-[20px] sm:rounded-[24px] space-y-2 hover:scale-[1.02] transition-transform duration-200`}>
                <h3 className={`text-xl sm:text-2xl lg:text-3xl font-extrabold ${stat.colorCls}`}>{stat.value}</h3>
                <p className={`text-xs ${textDim} font-medium uppercase tracking-wider`}>{t(stat.labelKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 3: FEATURED PRODUCTS ─────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left space-y-8 sm:space-y-12">
        <div className={`flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 sm:gap-6 border-b ${borderColor} pb-6`}>
          <div>
            <span className={`text-xs uppercase tracking-widest ${accentGold} font-bold`}>{t("home.products.label")}</span>
            <h2 className={`text-2xl sm:text-3xl lg:text-4xl font-extrabold ${textPrimary} mt-1`}>{t("home.products.heading")}</h2>
            <p className={`${textDim} text-xs mt-1`}>{t("home.products.sub")}</p>
          </div>

          <div className="flex gap-1.5 p-1 bg-stone-950/60 rounded-xl border border-stone-900 overflow-x-auto w-full sm:w-auto flex-shrink-0">
            {CATEGORIES.map(cat => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer whitespace-nowrap min-h-[36px] flex-shrink-0 ${
                  activeCategory === cat.key ? "bg-[#0A7D32] text-white" : "text-stone-500 hover:text-stone-300"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {filteredProducts.map(p => (
            <div
              key={p.id}
              className={`${cardBg} ${cardHover} rounded-[20px] sm:rounded-[24px] p-4 flex flex-col justify-between group transition-all duration-200 border relative`}
            >
              <div className="space-y-4">
                <div className="relative aspect-square rounded-2xl overflow-hidden bg-stone-950">
                  <img
                    src={p.images[0]}
                    alt={p.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <span className="absolute top-3 left-3 px-2 py-1 bg-stone-900/80 backdrop-blur-md text-[10px] font-bold text-[#C9A227] rounded-md border border-stone-800">
                    {p.pvPoints} PV
                  </span>
                </div>
                <div>
                  <span className={`text-[9px] uppercase tracking-widest ${textDim} font-bold`}>{p.category}</span>
                  <h4 className={`font-bold text-base ${textPrimary} mt-0.5 group-hover:text-emerald-400 transition-colors duration-150 line-clamp-1`}>{p.name}</h4>
                  <p className={`${textMuted} text-xs mt-1.5 line-clamp-2 leading-relaxed`}>{p.description}</p>
                </div>
              </div>

              <div className={`mt-4 sm:mt-6 pt-4 border-t ${theme === "light" ? "border-stone-100" : "border-stone-900/60"} flex items-center justify-between`}>
                <span className={`text-sm font-extrabold ${textPrimary}`}>{p.priceXaf.toLocaleString()} XAF</span>
                <button
                  onClick={() => onAddToCart(p)}
                  className="px-3 sm:px-4 py-2 bg-[#0A7D32]/10 hover:bg-[#0A7D32] border border-[#0A7D32]/30 text-emerald-400 hover:text-white text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer min-h-[36px]"
                >
                  {t("products.addToCart")}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── SECTION 4: OPPORTUNITY TIMELINE ──────────────────────────── */}
      <section className={`${sectionBg} py-16 sm:py-20 text-left`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 sm:space-y-16">
          <div className="max-w-xl">
            <span className={`text-xs uppercase tracking-widest ${accentGold} font-bold`}>{t("home.opp.label")}</span>
            <h2 className={`text-2xl sm:text-3xl lg:text-4xl font-extrabold ${textPrimary} mt-1`}>{t("home.opp.heading")}</h2>
            <p className={`${textMuted} text-sm mt-2 leading-relaxed`}>{t("home.opp.body")}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 relative">
            <div className="hidden md:block absolute top-[28px] left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-emerald-900 to-yellow-900" />
            {OPPORTUNITY_STEPS.map((item, idx) => (
              <div key={idx} className="space-y-4 relative z-10 group">
                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full ${timelineCircle} border flex items-center justify-center font-extrabold text-sm ${accentGold} shadow-xl transition-transform duration-200 group-hover:scale-110`}>
                  {item.step}
                </div>
                <div className="space-y-1.5">
                  <h4 className={`font-extrabold ${textPrimary} text-sm sm:text-base`}>{item.label}</h4>
                  <p className={`${textMuted} text-xs leading-relaxed`}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 5: DISTRIBUTOR BENEFITS ──────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left space-y-8 sm:space-y-12">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <span className={`text-xs uppercase tracking-widest ${accentGold} font-bold`}>{t("home.benefits.label")}</span>
          <h2 className={`text-2xl sm:text-3xl lg:text-4xl font-extrabold ${textPrimary}`}>
            {(locale === "fr" ? benefitsSection.headline_fr : benefitsSection.headline_en) || t("home.benefits.heading")}
          </h2>
          <p className={`${textMuted} text-sm`}>
            {(locale === "fr" ? benefitsSection.sub_fr : benefitsSection.sub_en) || t("home.benefits.sub")}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 sm:gap-6">
          {BENEFIT_CARDS.map(({ icon, title, desc }, idx) => (
            <div key={idx} className={`${cardBg} border p-6 sm:p-8 rounded-[24px] sm:rounded-[28px] space-y-4 transition-all duration-200 hover:scale-[1.01] hover:shadow-lg`}>
              <div className={`p-3 bg-[#0A7D32]/10 border border-[#0A7D32]/20 ${accentGold} rounded-xl w-fit`}>
                <DynIcon name={icon} className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <h4 className={`font-extrabold ${textPrimary} text-base sm:text-lg`}>{title}</h4>
              <p className={`${textMuted} text-xs leading-relaxed`}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── SECTION 6: SUCCESS STORIES ───────────────────────────────── */}
      <section className={`${storiesBg} py-16 sm:py-20 text-left`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">

          <div className="lg:col-span-4 space-y-4 sm:space-y-6">
            <span className={`text-xs uppercase tracking-widest ${accentGold} font-bold`}>{t("home.stories.label")}</span>
            <h2 className={`text-2xl sm:text-3xl lg:text-4xl font-extrabold ${textPrimary} leading-tight`}>{t("home.stories.heading")}</h2>
            <p className={`${textMuted} text-xs sm:text-sm leading-relaxed`}>{t("home.stories.body")}</p>
            <div className="flex gap-2">
              {liveTestimonials.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentTestimonialIdx(idx)}
                  className={`h-3 rounded-full transition-all duration-200 min-w-[12px] cursor-pointer ${
                    currentTestimonialIdx === idx ? "bg-[#C9A227] w-6" : `${theme === "light" ? "bg-stone-300" : "bg-stone-800"} w-3`
                  }`}
                />
              ))}
            </div>
          </div>

          {liveTestimonials.length > 0 && (
            <div className={`lg:col-span-8 ${theme === "light" ? "bg-white border-stone-200" : "bg-stone-900 border-stone-850"} border p-6 sm:p-8 rounded-[28px] sm:rounded-[32px] shadow-xl relative overflow-hidden`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-950/20 blur-2xl rounded-full" />
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentTestimonialIdx}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-6"
                >
                  <p className={`${theme === "light" ? "text-stone-700" : "text-stone-200"} text-sm sm:text-base italic leading-relaxed`}>
                    "{liveTestimonials[currentTestimonialIdx % liveTestimonials.length]?.quote}"
                  </p>
                  <div className={`flex items-center gap-4 pt-4 border-t ${theme === "light" ? "border-stone-100" : "border-stone-850"}`}>
                    <img
                      src={liveTestimonials[currentTestimonialIdx % liveTestimonials.length]?.image}
                      alt={liveTestimonials[currentTestimonialIdx % liveTestimonials.length]?.name}
                      className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover border ${theme === "light" ? "border-stone-200" : "border-stone-850"}`}
                    />
                    <div>
                      <h5 className={`font-extrabold ${textPrimary} text-sm`}>{liveTestimonials[currentTestimonialIdx % liveTestimonials.length]?.name}</h5>
                      <span className={`${textDim} text-[10px] uppercase font-bold tracking-wider`}>
                        {liveTestimonials[currentTestimonialIdx % liveTestimonials.length]?.rank} · {liveTestimonials[currentTestimonialIdx % liveTestimonials.length]?.region}
                      </span>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          )}
        </div>
      </section>

      {/* ── SECTION 7: UPCOMING EVENTS ───────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left space-y-8 sm:space-y-12">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 sm:gap-6">
          <div>
            <span className={`text-xs uppercase tracking-widest ${accentGold} font-bold`}>{t("home.events.label")}</span>
            <h2 className={`text-2xl sm:text-3xl lg:text-4xl font-extrabold ${textPrimary} mt-1`}>{t("home.events.heading")}</h2>
            <p className={`${textDim} text-xs mt-1`}>{t("home.events.sub")}</p>
          </div>
          <button
            onClick={() => onNavigate("events")}
            className={`px-5 py-2.5 ${btnPill} border text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer flex-shrink-0 min-h-[44px]`}
          >
            {t("home.events.seeAll")}
          </button>
        </div>

        {liveEvents.length === 0 ? (
          <div className={`text-center py-12 ${textDim} text-xs`}>
            <Calendar className="w-8 h-8 mx-auto mb-3 opacity-30" />
            <p>No upcoming events scheduled.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 sm:gap-6">
            {liveEvents.map(ev => (
              <div key={ev.id} className={`${cardBg} border rounded-[20px] sm:rounded-[24px] overflow-hidden group flex flex-col justify-between hover:scale-[1.01] transition-all duration-200`}>
                <div>
                  <div className="relative h-40 sm:h-48 bg-stone-950">
                    {ev.image ? (
                      <img src={ev.image} alt={ev.title} className="w-full h-full object-cover opacity-80 transition-transform duration-300 group-hover:scale-[1.04]" loading="lazy" />
                    ) : (
                      <div className="w-full h-full bg-stone-900 flex items-center justify-center">
                        <Calendar className="w-8 h-8 text-stone-700" />
                      </div>
                    )}
                    <div className="absolute top-4 left-4 px-3 py-1 bg-stone-950/90 backdrop-blur-md border border-[#C9A227]/40 text-[#C9A227] font-mono text-[10px] font-bold rounded-full flex items-center gap-1">
                      <Clock className="w-3 h-3 flex-shrink-0" />
                      <span>{countdowns[ev.id] || "..."}</span>
                    </div>
                  </div>
                  <div className="p-5 sm:p-6 space-y-3">
                    <span className={`text-[9px] uppercase tracking-wider ${accentGreen} font-bold flex items-center gap-1`}>
                      <Calendar className="w-3 h-3" /> {new Date(ev.start_at).toLocaleDateString()}
                    </span>
                    <h4 className={`font-extrabold ${textPrimary} text-base leading-snug group-hover:text-emerald-400 transition-colors duration-150`}>{ev.title}</h4>
                    {ev.description && (
                      <p className={`${textMuted} text-xs line-clamp-2 leading-relaxed`}>{ev.description}</p>
                    )}
                  </div>
                </div>
                <div className={`px-5 sm:px-6 pb-5 sm:pb-6 pt-4 border-t ${borderColor} flex items-center justify-between text-xs ${textDim} font-medium`}>
                  <span>{ev.location || "Location TBD"}</span>
                  {ev.capacity && <span>Cap: {ev.capacity}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── SECTION 8: BLOG PREVIEW ──────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left space-y-8 sm:space-y-12">
        <div className={`border-b ${borderColor} pb-6 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4`}>
          <div>
            <span className={`text-xs uppercase tracking-widest ${accentGold} font-bold`}>{t("home.blog.label")}</span>
            <h2 className={`text-2xl sm:text-3xl lg:text-4xl font-extrabold ${textPrimary} mt-1`}>{t("home.blog.heading")}</h2>
          </div>
          <button
            onClick={() => onNavigate("blog")}
            className={`${accentGreen} hover:opacity-80 font-bold text-xs flex items-center gap-1 transition-all duration-200 cursor-pointer flex-shrink-0 min-h-[44px]`}
          >
            {t("home.blog.visitHub")} <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
          {liveBlogPosts[0] && (
            <div
              className={`lg:col-span-7 ${cardBg} border rounded-[24px] sm:rounded-[32px] p-5 sm:p-6 flex flex-col justify-between group cursor-pointer hover:scale-[1.005] transition-all duration-200`}
              onClick={() => onNavigate("blog")}
            >
              <div className="space-y-4">
                <div className="aspect-[16/9] rounded-2xl overflow-hidden bg-stone-950">
                  {liveBlogPosts[0].image ? (
                    <img src={liveBlogPosts[0].image} alt={liveBlogPosts[0].title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                  ) : (
                    <div className="w-full h-full bg-stone-900" />
                  )}
                </div>
                <div className="space-y-2">
                  <span className={`${accentGold} font-bold text-[10px] uppercase tracking-wider`}>{liveBlogPosts[0].category}</span>
                  <h4 className={`font-extrabold ${textPrimary} text-lg sm:text-xl lg:text-2xl leading-snug group-hover:text-emerald-400 transition-colors duration-150`}>{liveBlogPosts[0].title}</h4>
                  <p className={`${textMuted} text-xs sm:text-sm leading-relaxed`}>{liveBlogPosts[0].excerpt}</p>
                </div>
              </div>
              <div className={`mt-6 sm:mt-8 pt-4 border-t ${borderColor} flex justify-between items-center text-xs ${textDim}`}>
                <span>{liveBlogPosts[0].author}</span>
                <span>{liveBlogPosts[0].publishedAt}</span>
              </div>
            </div>
          )}

          <div className={`${liveBlogPosts[0] ? "lg:col-span-5" : "lg:col-span-12"} flex flex-col gap-5 sm:gap-6`}>
            {liveBlogPosts.slice(1, 3).map(post => (
              <div
                key={post.id}
                onClick={() => onNavigate("blog")}
                className={`${cardBg} border p-4 sm:p-5 rounded-2xl flex gap-4 group cursor-pointer hover:bg-stone-900/35 hover:scale-[1.01] transition-all duration-200`}
              >
                {post.image && (
                  <img src={post.image} alt={post.title} className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover bg-stone-950 flex-shrink-0" loading="lazy" />
                )}
                <div className="space-y-1 min-w-0">
                  <span className={`text-[9px] uppercase font-bold ${accentGold}`}>{post.category}</span>
                  <h5 className={`font-extrabold text-sm ${textPrimary} line-clamp-2 leading-snug group-hover:text-emerald-400 transition-colors duration-150`}>{post.title}</h5>
                  <p className={`${textDim} text-[11px] font-mono`}>{post.publishedAt}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 9: GALLERY TEASER ─────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <span className={`text-xs uppercase tracking-widest ${accentGold} font-bold`}>{t("home.gallery.label")}</span>
            <h2 className={`text-2xl sm:text-3xl lg:text-4xl font-extrabold ${textPrimary} mt-1`}>{t("home.gallery.heading")}</h2>
          </div>
          <button
            onClick={() => onNavigate("gallery")}
            className={`${accentGreen} hover:opacity-80 font-bold text-xs flex items-center gap-1 transition-all duration-200 cursor-pointer flex-shrink-0 min-h-[44px]`}
          >
            {t("home.gallery.cta")} <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {liveGallery.length === 0 ? (
          <div className={`text-center py-12 ${textDim} text-xs`}>
            <ImageIcon className="w-8 h-8 mx-auto mb-3 opacity-30" />
            <p>No gallery images yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4">
            {liveGallery.map(img => {
              const caption = locale === "fr"
                ? (img.caption_fr ?? img.caption_en ?? img.caption ?? "")
                : (img.caption_en ?? img.caption ?? "");
              return (
                <div
                  key={img.id}
                  onClick={() => setSelectedGalleryImg(img.url)}
                  className={`relative aspect-square rounded-xl sm:rounded-2xl overflow-hidden bg-stone-950 cursor-pointer group ${theme === "light" ? "border border-stone-200" : "border border-stone-850/60"} hover:scale-[1.03] transition-transform duration-200`}
                >
                  <img src={img.url} alt={caption} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                  {caption && (
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center p-2 text-center">
                      <span className="text-white text-[10px] font-semibold leading-relaxed line-clamp-3">{caption}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Lightbox */}
        <AnimatePresence>
          {selectedGalleryImg && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
              <div className="absolute inset-0" onClick={() => setSelectedGalleryImg(null)} />
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative max-w-4xl max-h-[85vh] z-10"
              >
                <img
                  src={selectedGalleryImg}
                  alt="Gallery"
                  className="rounded-3xl max-w-full max-h-[85vh] object-contain border border-stone-800"
                />
                <button
                  onClick={() => setSelectedGalleryImg(null)}
                  className="absolute -top-10 right-0 text-stone-400 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-colors duration-150"
                >
                  <X className="w-4 h-4" /> {t("home.gallery.close")}
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </section>

      {/* ── SECTION 10: NEWSLETTER ───────────────────────────────────── */}
      <section className={`relative py-16 sm:py-20 ${theme === "light" ? "bg-stone-100 border-y border-stone-200" : "bg-stone-900 border-y border-stone-850/60"} overflow-hidden`}>
        <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-[#C9A227]/10 blur-3xl rounded-full pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 text-center space-y-5 sm:space-y-6 relative z-10">
          <h2 className={`text-xl sm:text-2xl lg:text-3xl font-extrabold ${textPrimary}`}>{newsletterHeadline}</h2>
          <p className={`${textMuted} text-xs sm:text-sm max-w-xl mx-auto leading-relaxed`}>{newsletterBody}</p>

          <AnimatePresence mode="wait">
            {!newsletterSubmitted ? (
              <motion.form
                onSubmit={handleSubscribe}
                className="flex flex-col xs:flex-row gap-3 max-w-md mx-auto pt-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <input
                  type="email"
                  required
                  placeholder={t("newsletter.placeholder")}
                  value={newsletterEmail}
                  onChange={e => setNewsletterEmail(e.target.value)}
                  className={`flex-grow px-4 py-3 ${theme === "light" ? "bg-white border-stone-300 text-stone-900 placeholder-stone-400" : "bg-stone-950 border-stone-850 text-white placeholder-stone-700"} border focus:border-[#0A7D32] focus:ring-1 focus:ring-[#0A7D32] rounded-xl outline-none text-xs min-h-[48px] transition-colors duration-150`}
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-[#0A7D32] hover:bg-[#086327] text-white font-bold text-xs rounded-xl transition-all duration-200 hover:scale-[1.02] cursor-pointer whitespace-nowrap min-h-[48px]"
                >
                  {t("newsletter.button")}
                </button>
              </motion.form>
            ) : (
              <motion.div
                className="p-4 bg-emerald-950/40 border border-emerald-900/40 rounded-2xl max-w-md mx-auto text-emerald-400 text-xs font-semibold flex items-center justify-center gap-2"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <Check className="w-4 h-4 text-[#C9A227]" />
                <span>{t("newsletter.success")}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

    </div>
  );
}
