import { useState, useEffect, useRef, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";
import HeroCarousel from "./HeroCarousel";
import { 
  Sprout, Award, TrendingUp, Users, ArrowRight, Sparkles, Check, 
  Clock, Calendar, BookOpen, Volume2, Download, HelpCircle, Phone, Globe, ChevronRight
} from "lucide-react";
import { PRODUCTS_SEED, BLOG_SEED, EVENTS_SEED, GALLERY_SEED, TESTIMONIALS_SEED } from "../../data/mockData";

interface HomeSectionProps {
  onNavigate: (page: string) => void;
  onAddToCart: (product: any) => void;
}

export default function HomeSection({ onNavigate, onAddToCart }: HomeSectionProps) {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [currentTestimonialIdx, setCurrentTestimonialIdx] = useState(0);
  const [selectedGalleryImg, setSelectedGalleryImg] = useState<string | null>(null);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterSubmitted, setNewsletterSubmitted] = useState(false);

  // Stats count-up simulation (triggered when visible)
  const [stats, setStats] = useState({ countries: 0, members: 0, products: 0, years: 0, awards: 0 });
  useEffect(() => {
    const timer = setTimeout(() => {
      setStats({ countries: 12, members: 42800, products: 24, years: 8, awards: 15 });
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Countdown timers for events
  const [countdowns, setCountdowns] = useState<{ [key: string]: string }>({});
  useEffect(() => {
    const calculateCountdowns = () => {
      const updated: { [key: string]: string } = {};
      EVENTS_SEED.forEach(ev => {
        const diff = new Date(ev.startAt).getTime() - Date.now();
        if (diff <= 0) {
          updated[ev.id] = "Live Now";
        } else {
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const secs = Math.floor((diff % (1000 * 60)) / 1000);
          updated[ev.id] = `${days}d ${hours}h ${mins}m ${secs}s`;
        }
      });
      setCountdowns(updated);
    };

    calculateCountdowns();
    const interval = setInterval(calculateCountdowns, 1000);
    return () => clearInterval(interval);
  }, []);

  // Filter featured products
  const categories = ["All", "Health", "Beauty", "Agriculture", "New Arrivals"];
  const filteredProducts = activeCategory === "All" 
    ? PRODUCTS_SEED.slice(0, 4) 
    : PRODUCTS_SEED.filter(p => p.category === activeCategory).slice(0, 4);

  // Auto slide testimonials
  useEffect(() => {
    const slideInterval = setInterval(() => {
      setCurrentTestimonialIdx(prev => (prev + 1) % TESTIMONIALS_SEED.length);
    }, 6000);
    return () => clearInterval(slideInterval);
  }, []);

  const handleSubscribe = (e: FormEvent) => {
    e.preventDefault();
    if (newsletterEmail.trim()) {
      setNewsletterSubmitted(true);
      setTimeout(() => {
        setNewsletterEmail("");
      }, 3000);
    }
  };

  return (
    <div className="space-y-24 pb-24 overflow-hidden">
      
      {/* SECTION 1: HERO */}
      <section className="relative min-h-[95vh] flex items-center justify-center pt-24 px-4 overflow-hidden bg-stone-950">
        {/* Background radial soft gradients */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[10%] left-[20%] w-[600px] h-[600px] rounded-full bg-[#0A7D32]/10 blur-[120px] animate-float-1" />
          <div className="absolute bottom-[15%] right-[10%] w-[500px] h-[500px] rounded-full bg-[#C9A227]/10 blur-[100px] animate-float-2" />
        </div>

        {/* Animated background lines */}
        <svg className="absolute inset-0 w-full h-full stroke-stone-900/40 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <line x1="10%" y1="0" x2="10%" y2="100%" strokeDasharray="5,5" />
          <line x1="30%" y1="0" x2="30%" y2="100%" strokeDasharray="5,5" />
          <line x1="70%" y1="0" x2="70%" y2="100%" strokeDasharray="5,5" />
          <line x1="90%" y1="0" x2="90%" y2="100%" strokeDasharray="5,5" />
        </svg>

        <div className="max-w-7xl mx-auto w-full relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center text-left">
          
          {/* Headline Content */}
          <div className="lg:col-span-7 space-y-8">
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="inline-flex items-center gap-2 px-3 py-1 bg-[#0A7D32]/10 border border-[#0A7D32]/30 rounded-full text-xs font-semibold text-emerald-400"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#C9A227]" />
              <span>Sovereign Health & Wealth Movement</span>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.05]"
            >
              {t("hero.slogan")}
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="text-stone-400 text-sm sm:text-base max-w-xl leading-relaxed"
            >
              {t("hero.sub")}
            </motion.p>

            {/* CTAs */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-wrap gap-4 pt-4"
            >
              <button
                onClick={() => onNavigate("join")}
                className="px-8 py-4 bg-[#0A7D32] hover:bg-[#086327] text-white font-bold text-xs sm:text-sm rounded-2xl transition-all shadow-lg hover:shadow-emerald-950/40 cursor-pointer flex items-center gap-2 group border border-transparent"
              >
                <span>{t("hero.cta.join")}</span>
                <ArrowRight className="w-4 h-4 text-[#C9A227] transition-transform group-hover:translate-x-1" />
              </button>

              <button
                onClick={() => onNavigate("products")}
                className="px-8 py-4 bg-stone-900/60 hover:bg-stone-850 border border-stone-800 text-stone-300 hover:text-white font-bold text-xs sm:text-sm rounded-2xl transition-all cursor-pointer"
              >
                {t("hero.cta.products")}
              </button>
            </motion.div>
          </div>

          {/* Hero Carousel */}
          <motion.div
            className="lg:col-span-5"
            initial={{ opacity: 0, scale: 0.93 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <HeroCarousel />
          </motion.div>

        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 opacity-50">
          <span className="text-[9px] uppercase tracking-widest text-stone-500 font-bold">Scroll Down</span>
          <div className="w-1.5 h-6 bg-stone-800 rounded-full overflow-hidden">
            <div className="w-full h-2 bg-[#C9A227] rounded-full animate-bounce mt-1" />
          </div>
        </div>
      </section>

      {/* SECTION 2: COMPANY INTRODUCTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Brand copy */}
          <div className="lg:col-span-6 space-y-6">
            <span className="text-xs uppercase tracking-widest text-[#C9A227] font-bold">Our Heritage</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
              Merging Nature's Wisdom with West African Ambition
            </h2>
            <p className="text-stone-400 text-sm leading-relaxed">
              Founded on the belief that health is the truest foundation of prosperity, Songtai Life manufactures premium botanical supplements, skin therapy systems, and biological agricultural enhancers. We source locally across central and northern Cameroon, empowering farming cooperatives and building independent digital franchises.
            </p>
            <div className="pt-4">
              <button 
                onClick={() => onNavigate("about")}
                className="text-emerald-400 hover:text-emerald-300 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer group"
              >
                <span>Read our Full Mission & Core Leadership</span>
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>

          {/* Stats count up block */}
          <div className="lg:col-span-6 grid grid-cols-2 gap-4">
            <div className="bg-stone-900/30 border border-stone-850/60 p-6 rounded-[24px] space-y-2">
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white">{(stats.members / 1000).toFixed(1)}k+</h3>
              <p className="text-xs text-stone-500 font-medium uppercase tracking-wider">{t("stats.members")}</p>
            </div>
            <div className="bg-stone-900/30 border border-stone-850/60 p-6 rounded-[24px] space-y-2">
              <h3 className="text-2xl sm:text-3xl font-extrabold text-emerald-400">+{stats.countries}</h3>
              <p className="text-xs text-stone-500 font-medium uppercase tracking-wider">{t("stats.countries")}</p>
            </div>
            <div className="bg-stone-900/30 border border-stone-850/60 p-6 rounded-[24px] space-y-2 col-span-2 sm:col-span-1">
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white">{stats.products}</h3>
              <p className="text-xs text-stone-500 font-medium uppercase tracking-wider">{t("stats.products")}</p>
            </div>
            <div className="bg-stone-900/30 border border-stone-850/60 p-6 rounded-[24px] space-y-2 col-span-2 sm:col-span-1">
              <h3 className="text-2xl sm:text-3xl font-extrabold text-[#C9A227]">{stats.awards}</h3>
              <p className="text-xs text-stone-500 font-medium uppercase tracking-wider">{t("stats.awards")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: FEATURED PRODUCTS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left space-y-12">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 border-b border-stone-900 pb-6">
          <div>
            <span className="text-xs uppercase tracking-widest text-[#C9A227] font-bold">Luminous Catalog</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-1">Sovereign Products</h2>
            <p className="text-stone-400 text-xs mt-1">Formulated with premium biological components for maximum safety and yield.</p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-stone-950 rounded-xl border border-stone-900 w-fit">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeCategory === cat
                    ? "bg-[#0A7D32] text-white"
                    : "text-stone-500 hover:text-stone-300"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Horizontally scrollable product grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredProducts.map(p => (
            <div 
              key={p.id}
              className="bg-stone-900/20 border border-stone-850/70 hover:border-emerald-950/60 rounded-[24px] p-4 flex flex-col justify-between group transition-all duration-300 hover:bg-stone-900/40 relative"
            >
              <div className="space-y-4">
                {/* Image */}
                <div className="relative aspect-square rounded-2xl overflow-hidden bg-stone-950">
                  <img 
                    src={p.images[0]} 
                    alt={p.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span className="absolute top-3 left-3 px-2 py-1 bg-stone-900/80 backdrop-blur-md text-[10px] font-bold text-[#C9A227] rounded-md border border-stone-800">
                    {p.pvPoints} PV
                  </span>
                </div>

                {/* Details */}
                <div>
                  <span className="text-[9px] uppercase tracking-widest text-stone-500 font-bold">{p.category}</span>
                  <h4 className="font-bold text-base text-white mt-0.5 group-hover:text-emerald-400 transition-colors line-clamp-1">{p.name}</h4>
                  <p className="text-stone-400 text-xs mt-1.5 line-clamp-2 leading-relaxed">{p.description}</p>
                </div>
              </div>

              {/* Price & Add */}
              <div className="mt-6 pt-4 border-t border-stone-900/60 flex items-center justify-between">
                <span className="text-sm font-extrabold text-white">{p.priceXaf.toLocaleString()} XAF</span>
                <button
                  onClick={() => onAddToCart(p)}
                  className="px-4 py-2 bg-[#0A7D32]/10 hover:bg-[#0A7D32] border border-[#0A7D32]/30 text-emerald-400 hover:text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Add to Cart
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 4: OPPORTUNITY & TIMELINE */}
      <section className="bg-stone-900/35 border-y border-stone-900/60 py-20 text-left">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="max-w-xl">
            <span className="text-xs uppercase tracking-widest text-[#C9A227] font-bold">Unlocking Abundance</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-1">A Clear Roadmap to Sovereign Income</h2>
            <p className="text-stone-400 text-sm mt-2 leading-relaxed">
              We don't rely on complex schemes. Our direct-selling timeline shows how any motivated Cameroon citizen can scale an organic trade into a pan-African unilevel leadership network.
            </p>
          </div>

          {/* SVG line-draw timeline */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            {/* Background line for md screens */}
            <div className="hidden md:block absolute top-[28px] left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-emerald-900 to-yellow-900" />

            {/* Timesteps */}
            {[
              { step: "01", label: "Join the Family", desc: "Acquire a high-potency starter pack. Activate your referral node code instantly on our portal." },
              { step: "02", label: "Grow Organic Volume", desc: "Share premium health and agricultural products in your local Cameroon region. Accumulate PV." },
              { step: "03", label: "Lead Your Group", desc: "Mentor new distributors to establish robust downline adjacency trees. Earn weekly overrides." },
              { step: "04", label: "Earn Diamond Incentives", desc: "Settle direct bonuses into your MoMo/Orange Money wallet instantly with MeSomb gateway." }
            ].map((item, idx) => (
              <div key={idx} className="space-y-4 relative z-10">
                <div className="w-14 h-14 rounded-full bg-stone-950 border border-stone-800 flex items-center justify-center font-extrabold text-sm text-[#C9A227] shadow-xl">
                  {item.step}
                </div>
                <div className="space-y-1.5">
                  <h4 className="font-extrabold text-white text-base">{item.label}</h4>
                  <p className="text-stone-400 text-xs leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 5: DISTRIBUTOR BENEFITS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left space-y-12">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <span className="text-xs uppercase tracking-widest text-[#C9A227] font-bold">Why Join Us</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">Distributor Benefits</h2>
          <p className="text-stone-400 text-sm">We provide the highest payout margin in Cameroon's health sector.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-stone-900/20 border border-stone-850 p-8 rounded-[28px] space-y-4">
            <div className="p-3 bg-[#0A7D32]/10 border border-[#0A7D32]/20 text-[#C9A227] rounded-xl w-fit">
              <Award className="w-6 h-6" />
            </div>
            <h4 className="font-extrabold text-white text-lg">High Direct Overrides</h4>
            <p className="text-stone-400 text-xs leading-relaxed">
              Earn a direct 10% cash commission on all sales generated by your first-generation referrals. Settle directly into mobile wallets.
            </p>
          </div>

          <div className="bg-stone-900/20 border border-stone-850 p-8 rounded-[28px] space-y-4">
            <div className="p-3 bg-[#0A7D32]/10 border border-[#0A7D32]/20 text-[#C9A227] rounded-xl w-fit">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h4 className="font-extrabold text-white text-lg">Biweekly Performance Pools</h4>
            <p className="text-stone-400 text-xs leading-relaxed">
              We pool 3% of all national unilevel product sales volume to distribute directly among active Gold and Diamond ranked leaders.
            </p>
          </div>

          <div className="bg-stone-900/20 border border-stone-850 p-8 rounded-[28px] space-y-4">
            <div className="p-3 bg-[#0A7D32]/10 border border-[#0A7D32]/20 text-[#C9A227] rounded-xl w-fit">
              <Users className="w-6 h-6" />
            </div>
            <h4 className="font-extrabold text-white text-lg">World-Class Academy</h4>
            <p className="text-stone-400 text-xs leading-relaxed">
              Gain free lifetime access to physical business forums, presentation templates, and digital media catalogues to scale your team.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 6: SUCCESS STORIES */}
      <section className="bg-[#0A7D32]/5 py-20 text-left">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-4 space-y-6">
            <span className="text-xs uppercase tracking-widest text-[#C9A227] font-bold">Inspiration</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">Sovereign Stories of Triumph</h2>
            <p className="text-stone-400 text-xs sm:text-sm leading-relaxed">
              Hear directly from our active regional directors and medical consultants who built solid, recurring wellness enterprises using the Songtai platform.
            </p>
            <div className="flex gap-2">
              {TESTIMONIALS_SEED.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentTestimonialIdx(idx)}
                  className={`w-3 h-3 rounded-full transition-all ${
                    currentTestimonialIdx === idx ? "bg-[#C9A227] w-6" : "bg-stone-800"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Sliding card */}
          <div className="lg:col-span-8 bg-stone-900 border border-stone-850 p-8 rounded-[32px] shadow-xl relative overflow-hidden">
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
                <p className="text-stone-200 text-sm sm:text-base italic leading-relaxed">
                  "{TESTIMONIALS_SEED[currentTestimonialIdx].quote}"
                </p>

                <div className="flex items-center gap-4 pt-4 border-t border-stone-850">
                  <img 
                    src={TESTIMONIALS_SEED[currentTestimonialIdx].image} 
                    alt={TESTIMONIALS_SEED[currentTestimonialIdx].name}
                    className="w-12 h-12 rounded-full object-cover border border-stone-850"
                  />
                  <div>
                    <h5 className="font-extrabold text-white text-sm">{TESTIMONIALS_SEED[currentTestimonialIdx].name}</h5>
                    <span className="text-stone-500 text-[10px] uppercase font-bold tracking-wider">
                      {TESTIMONIALS_SEED[currentTestimonialIdx].rank} • {TESTIMONIALS_SEED[currentTestimonialIdx].region}
                    </span>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

        </div>
      </section>

      {/* SECTION 7: UPCOMING EVENTS WITH COUNTDOWNS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left space-y-12">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div>
            <span className="text-xs uppercase tracking-widest text-[#C9A227] font-bold">Be Involved</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-1">Upcoming Leadership Summits</h2>
            <p className="text-stone-400 text-xs mt-1">Secure your physical entry seats to build direct networks.</p>
          </div>
          <button 
            onClick={() => onNavigate("events")}
            className="px-5 py-2.5 bg-stone-900 border border-stone-800 text-stone-300 text-xs font-bold rounded-xl hover:text-white transition-all cursor-pointer"
          >
            See Past Events
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {EVENTS_SEED.map(ev => (
            <div key={ev.id} className="bg-stone-900/30 border border-stone-850 rounded-[24px] overflow-hidden group flex flex-col justify-between">
              <div>
                {/* Photo & Timer */}
                <div className="relative h-48 bg-stone-950">
                  <img 
                    src={ev.image} 
                    alt={ev.title}
                    className="w-full h-full object-cover opacity-80"
                  />
                  <div className="absolute top-4 left-4 px-3 py-1 bg-stone-950/90 backdrop-blur-md border border-[#C9A227]/40 text-[#C9A227] font-mono text-[10px] font-bold rounded-full flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{countdowns[ev.id] || "Calculating..."}</span>
                  </div>
                </div>

                <div className="p-6 space-y-3">
                  <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {new Date(ev.startAt).toLocaleDateString()}
                  </span>
                  <h4 className="font-extrabold text-white text-base leading-snug">{ev.title}</h4>
                  <p className="text-stone-400 text-xs line-clamp-2 leading-relaxed">{ev.description}</p>
                </div>
              </div>

              <div className="px-6 pb-6 pt-4 border-t border-stone-900 flex items-center justify-between text-xs text-stone-500 font-medium">
                <span>{ev.location}</span>
                <span className="text-stone-400">Cap: {ev.capacity}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 8: LATEST NEWS/BLOG PREVIEW (Asymmetric grid) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left space-y-12">
        <div className="border-b border-stone-900 pb-6 flex justify-between items-end">
          <div>
            <span className="text-xs uppercase tracking-widest text-[#C9A227] font-bold">Botanical & MLM Hub</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-1">Latest Insights & Science</h2>
          </div>
          <button 
            onClick={() => onNavigate("blog")}
            className="text-emerald-400 hover:text-[#C9A227] font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
          >
            Visit Blog Hub <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Asymmetric Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Featured post (Col 7) */}
          <div className="lg:col-span-7 bg-stone-900/20 border border-stone-850 rounded-[32px] p-6 flex flex-col justify-between group cursor-pointer" onClick={() => onNavigate("blog")}>
            <div className="space-y-4">
              <div className="aspect-[16/9] rounded-2xl overflow-hidden bg-stone-950">
                <img 
                  src={BLOG_SEED[0].image} 
                  alt={BLOG_SEED[0].title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
                />
              </div>
              <div className="space-y-2">
                <span className="text-[#C9A227] font-bold text-[10px] uppercase tracking-wider">{BLOG_SEED[0].category}</span>
                <h4 className="font-extrabold text-white text-xl sm:text-2xl leading-snug group-hover:text-emerald-400 transition-colors">{BLOG_SEED[0].title}</h4>
                <p className="text-stone-400 text-xs sm:text-sm leading-relaxed">{BLOG_SEED[0].excerpt}</p>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-stone-900/60 flex justify-between items-center text-xs text-stone-500">
              <span>{BLOG_SEED[0].author}</span>
              <span>{BLOG_SEED[0].publishedAt}</span>
            </div>
          </div>

          {/* Secondary posts (Col 5) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {BLOG_SEED.slice(1, 3).map(post => (
              <div 
                key={post.id}
                onClick={() => onNavigate("blog")}
                className="bg-stone-900/20 border border-stone-850 p-5 rounded-2xl flex gap-4 group cursor-pointer hover:bg-stone-900/35 transition-all"
              >
                <img 
                  src={post.image} 
                  alt={post.title}
                  className="w-20 h-20 rounded-xl object-cover bg-stone-950"
                />
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-bold text-[#C9A227]">{post.category}</span>
                  <h5 className="font-extrabold text-sm text-white line-clamp-2 leading-snug group-hover:text-emerald-400 transition-colors">{post.title}</h5>
                  <p className="text-stone-500 text-[11px] font-mono">{post.publishedAt}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 9: GALLERY TEASER WITH LIGHTBOX */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left space-y-8">
        <div>
          <span className="text-xs uppercase tracking-widest text-[#C9A227] font-bold">Visual Record</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-1">Our Moments in Cameroon</h2>
        </div>

        {/* Gallery Strip */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {GALLERY_SEED.slice(0, 6).map(img => (
            <div 
              key={img.id}
              onClick={() => setSelectedGalleryImg(img.url)}
              className="relative aspect-square rounded-2xl overflow-hidden bg-stone-950 cursor-pointer group border border-stone-850/60"
            >
              <img 
                src={img.url} 
                alt={img.caption}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-3 text-center">
                <span className="text-white text-[10px] font-semibold leading-relaxed line-clamp-3">{img.caption}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Lightbox Portal Overlay */}
        <AnimatePresence>
          {selectedGalleryImg && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
              <div className="absolute inset-0 cursor-pointer" onClick={() => setSelectedGalleryImg(null)} />
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative max-w-4xl max-h-[85vh] z-10"
              >
                <img 
                  src={selectedGalleryImg} 
                  alt="Enlarged gallery view"
                  className="rounded-3xl max-w-full max-h-[85vh] object-contain border border-stone-800"
                />
                <button
                  onClick={() => setSelectedGalleryImg(null)}
                  className="absolute -top-12 right-0 text-stone-400 hover:text-white font-bold text-xs"
                >
                  Close (Esc)
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </section>

      {/* SECTION 10: NEWSLETTER */}
      <section className="relative py-20 bg-stone-900 border-y border-stone-850/60 overflow-hidden">
        {/* Soft gold backdrop */}
        <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-[#C9A227]/10 blur-3xl rounded-full" />
        
        <div className="max-w-4xl mx-auto px-4 text-center space-y-6 relative z-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">{t("newsletter.title")}</h2>
          <p className="text-stone-400 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
            {t("newsletter.desc")}
          </p>

          <AnimatePresence mode="wait">
            {!newsletterSubmitted ? (
              <motion.form 
                onSubmit={handleSubscribe} 
                className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto pt-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <input
                  type="email"
                  required
                  placeholder={t("newsletter.placeholder")}
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  className="flex-grow px-4 py-3 bg-stone-950 border border-stone-850 focus:border-[#0A7D32] focus:ring-1 focus:ring-[#0A7D32] rounded-xl text-white outline-none text-xs"
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-[#0A7D32] hover:bg-[#086327] text-white font-bold text-xs rounded-xl transition-all cursor-pointer whitespace-nowrap"
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
