import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";
import { ShoppingBag, Globe2, Sun, Moon, Menu, X, ChevronDown } from "lucide-react";
import i18n from "../i18n";
import { supabase } from "../lib/supabase";
import Logo from "./Logo";

interface NavbarProps {
  activeTab: "brand" | "portal" | "tech-spec";
  setActiveTab: (tab: "brand" | "portal" | "tech-spec") => void;
  brandPage: string;
  setBrandPage: (page: string) => void;
  cartCount: number;
  openCart: () => void;
  theme: "dark" | "light";
  toggleTheme: () => void;
}

const NAV_ITEMS = [
  { id: "home",     labelKey: "nav.home" },
  { id: "about",    labelKey: "nav.about" },
  { id: "products", labelKey: "nav.products", hasMega: true },
  { id: "events",   labelKey: "nav.events" },
  { id: "blog",     labelKey: "nav.blog" },
  { id: "faq",      labelKey: "nav.faq" },
  { id: "contact",  labelKey: "nav.contact" },
];

// Category icons keyed by slug — fallback to 🛍️ for unknown slugs
const CATEGORY_ICONS: Record<string, string> = {
  health: "🌿", beauty: "✨", agriculture: "🌾", wellness: "💚",
  nutrition: "🍃", cosmetics: "💄", farming: "🚜",
};

export default function Navbar({
  activeTab, setActiveTab, brandPage, setBrandPage,
  cartCount, openCart, theme, toggleTheme,
}: NavbarProps) {
  const { t, i18n: i18nInstance } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const megaRef = useRef<HTMLDivElement>(null);
  const locale = i18nInstance.language?.startsWith("fr") ? "fr" : "en";
  const [navCategories, setNavCategories] = useState<{ id: string; slug: string; nameEn: string; nameFr: string }[]>([]);

  // Fetch live categories from Supabase + keep in sync via Realtime
  useEffect(() => {
    const fetchCats = async () => {
      const { data } = await supabase
        .from("product_categories")
        .select("id, slug, name, name_fr")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (data) setNavCategories(data.map((c: any) => ({
        id: c.id, slug: c.slug ?? "",
        nameEn: c.name ?? "", nameFr: c.name_fr ?? "",
      })));
    };
    fetchCats();
    const ch = supabase.channel("navbar_cats_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "product_categories" }, fetchCats)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (megaRef.current && !megaRef.current.contains(e.target as Node)) {
        setMegaOpen(false);
      }
    }
    if (megaOpen) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [megaOpen]);

  const handleMenuClick = (id: string) => {
    setActiveTab("brand");
    setBrandPage(id);
    setMobileMenuOpen(false);
    setMegaOpen(false);
  };

  const toggleLanguage = async () => {
    const nextLang = locale === "en" ? "fr" : "en";
    i18n.changeLanguage(nextLang);
    localStorage.setItem("songtai_lng", nextLang);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      supabase.from("profiles").update({ locale: nextLang }).eq("id", user.id).then(() => {});
    }
  };

  const navBg = theme === "light"
    ? "bg-white/90 border-stone-200/80"
    : "bg-stone-900/80 border-stone-800/60";

  const navText = theme === "light" ? "text-stone-700" : "text-stone-300";
  const navHover = theme === "light" ? "hover:text-stone-900 hover:bg-stone-100/70" : "hover:text-white hover:bg-stone-800/50";
  const activeText = "text-emerald-600";
  const iconBtn = theme === "light"
    ? "border-stone-300/60 bg-stone-100/60 hover:bg-stone-200/60 text-stone-600 hover:text-stone-900"
    : "border-stone-700/50 bg-stone-800/60 hover:bg-stone-700/60 text-stone-400 hover:text-white";
  const megaBg = theme === "light" ? "bg-white border-stone-200" : "bg-stone-900/95 border-stone-800";
  const megaItem = theme === "light" ? "hover:bg-stone-100/70" : "hover:bg-stone-800/60";
  const mobileBg = theme === "light" ? "bg-white/98 border-stone-200" : "bg-stone-900/98 border-stone-800";
  const mobileItem = theme === "light"
    ? "text-stone-700 hover:text-stone-900 hover:bg-stone-100/70"
    : "text-stone-300 hover:text-white hover:bg-stone-800/50";
  const mobileActive = theme === "light"
    ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
    : "bg-[#0A7D32]/15 border border-[#0A7D32]/30 text-emerald-400";

  return (
    <motion.nav
      animate={{
        height: scrolled ? 56 : 64,
        backdropFilter: scrolled ? "blur(24px)" : "blur(12px)",
      }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={`sticky top-0 z-50 w-full border-b shadow-sm ${navBg}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
        <div className="flex justify-between items-center h-full">

          {/* Logo */}
          <Logo
            theme={theme}
            size="md"
            onClick={() => handleMenuClick("home")}
          />

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-0.5" ref={megaRef}>
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === "brand" && brandPage === item.id;
              if (item.hasMega) {
                return (
                  <div key={item.id} className="relative">
                    <button
                      onClick={() => setMegaOpen(o => !o)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full font-semibold text-sm transition-all duration-200 cursor-pointer border ${
                        isActive || megaOpen
                          ? "bg-emerald-50 border-emerald-200/60 text-emerald-600"
                          : `${navText} ${navHover} border-transparent`
                      }`}
                    >
                      {t(item.labelKey)}
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${megaOpen ? "rotate-180" : ""}`} />
                    </button>

                    <AnimatePresence>
                      {megaOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -8, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -8, scale: 0.97 }}
                          transition={{ duration: 0.18 }}
                          className={`absolute left-1/2 -translate-x-1/2 top-full mt-2 w-72 ${megaBg} backdrop-blur-xl border rounded-2xl shadow-2xl p-4`}
                        >
                          <p className="text-[10px] uppercase tracking-widest text-stone-500 font-bold mb-3">
                            {t("nav.categories")}
                          </p>
                          {navCategories.map(cat => (
                            <button
                              key={cat.id}
                              onClick={() => handleMenuClick("products")}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl ${megaItem} text-left transition-colors group`}
                            >
                              <span className="text-lg">{CATEGORY_ICONS[cat.slug] ?? "🛍️"}</span>
                              <p className={`text-sm font-semibold ${navText} group-hover:text-[#ecc246] transition-colors truncate`}>
                                {locale === "fr" && cat.nameFr ? cat.nameFr : cat.nameEn}
                              </p>
                            </button>
                          ))}
                          <div className={`mt-3 pt-3 border-t ${theme === "light" ? "border-stone-200" : "border-stone-800"}`}>
                            <button
                              onClick={() => handleMenuClick("products")}
                              className="w-full text-center text-xs font-bold text-[#ecc246] hover:text-[#dbb13b] transition-colors py-1"
                            >
                              {t("products.viewAll")} →
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              }
              return (
                <button
                  key={item.id}
                  onClick={() => handleMenuClick(item.id)}
                  className={`relative px-3 py-1.5 rounded-full font-semibold text-sm transition-all duration-200 cursor-pointer border border-transparent ${
                    isActive ? activeText : `${navText} ${navHover}`
                  }`}
                >
                  {t(item.labelKey)}
                  {isActive && (
                    <motion.span
                      layoutId="nav-active-indicator"
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-emerald-500 rounded-full"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2">

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`relative flex items-center justify-between w-12 h-7 ${theme === "light" ? "bg-stone-200/80 hover:bg-stone-300/80 border-stone-300/60" : "bg-stone-800/80 hover:bg-stone-700 border-stone-700/50"} border rounded-full p-0.5 cursor-pointer transition-colors duration-300 shadow-inner overflow-hidden`}
              title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
            >
              <motion.div
                className="absolute w-[22px] h-[22px] rounded-full bg-emerald-500 shadow-md flex items-center justify-center z-10"
                animate={{ x: theme === "light" ? 20 : 0, rotate: theme === "light" ? 360 : 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 24 }}
              >
                {theme === "light"
                  ? <Sun className="w-3 h-3 text-stone-950 stroke-[3]" />
                  : <Moon className="w-3 h-3 text-stone-950 stroke-[3]" />}
              </motion.div>
              <Moon className={`w-3 h-3 ml-1 pointer-events-none ${theme === "light" ? "text-stone-400" : "text-stone-500"}`} />
              <Sun className={`w-3 h-3 mr-1 pointer-events-none ${theme === "light" ? "text-stone-400" : "text-stone-500"}`} />
            </button>

            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border ${iconBtn} cursor-pointer transition-colors group`}
              title={locale === "en" ? "Passer en Français" : "Switch to English"}
            >
              <Globe2 className="w-3.5 h-3.5" />
              <span className="text-xs font-bold uppercase tracking-wide">
                {locale === "en" ? "FR" : "EN"}
              </span>
            </button>

            {/* Shopping Cart */}
            <button
              onClick={openCart}
              className={`relative p-1.5 ${theme === "light" ? "text-stone-600 hover:text-[#ecc246] hover:bg-stone-100/80" : "text-stone-300 hover:text-[#ecc246] hover:bg-stone-800/50"} rounded-full transition-all duration-300 cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center`}
            >
              <ShoppingBag className="w-[18px] h-[18px]" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-[#ecc246] text-stone-900 text-[9px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Become a Distributor CTA */}
            <button
              onClick={() => handleMenuClick("opportunity")}
              className="hidden xl:flex items-center px-3 py-1.5 bg-[#ecc246] hover:bg-[#dbb13b] text-stone-900 rounded-full text-xs font-black transition-all cursor-pointer shadow-md min-h-[36px] whitespace-nowrap"
            >
              {t("nav.join")}
            </button>

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`p-1.5 ${theme === "light" ? "text-stone-600 hover:text-stone-900 hover:bg-stone-100/80" : "text-stone-400 hover:text-white hover:bg-stone-800/50"} lg:hidden rounded-full transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center`}
            >
              <AnimatePresence mode="wait" initial={false}>
                {mobileMenuOpen
                  ? <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}><X className="w-5 h-5" /></motion.span>
                  : <motion.span key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}><Menu className="w-5 h-5" /></motion.span>
                }
              </AnimatePresence>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Full-Screen Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className={`lg:hidden absolute left-0 right-0 top-full ${mobileBg} backdrop-blur-2xl border-b shadow-2xl px-4 py-4`}
          >
            <div className="space-y-1">
              {NAV_ITEMS.map((item, i) => {
                const isActive = activeTab === "brand" && brandPage === item.id;
                return (
                  <motion.button
                    key={item.id}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.2 }}
                    onClick={() => handleMenuClick(item.id)}
                    className={`w-full flex items-center justify-between px-4 py-3.5 text-sm font-bold rounded-xl transition-all cursor-pointer min-h-[48px] ${
                      isActive ? mobileActive : mobileItem
                    }`}
                  >
                    {t(item.labelKey)}
                    {isActive && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full flex-shrink-0" />}
                  </motion.button>
                );
              })}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              className={`mt-4 pt-4 border-t ${theme === "light" ? "border-stone-200" : "border-stone-800"} flex items-center gap-3`}
            >
              <button
                onClick={toggleLanguage}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-bold transition-colors cursor-pointer min-h-[48px] ${
                  theme === "light"
                    ? "border-stone-300 bg-stone-100 text-stone-700 hover:text-stone-900"
                    : "border-stone-700 bg-stone-800/50 text-stone-300 hover:text-white"
                }`}
              >
                <Globe2 className="w-4 h-4" />
                {locale === "en" ? "Passer en Français" : "Switch to English"}
              </button>
              <button
                onClick={() => handleMenuClick("opportunity")}
                className="flex-1 py-3 bg-[#ecc246] hover:bg-[#dbb13b] text-stone-900 rounded-xl text-sm font-black transition-all cursor-pointer text-center min-h-[48px]"
              >
                {t("nav.join")}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
