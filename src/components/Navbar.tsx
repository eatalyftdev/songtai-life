import { Sprout, ShoppingBag, MessageSquareCode, Globe2, Sun, Moon, Menu, X, ChevronDown } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import { supabase } from "../lib/supabase";

interface NavbarProps {
  activeTab: "brand" | "portal" | "tech-spec";
  setActiveTab: (tab: "brand" | "portal" | "tech-spec") => void;
  brandPage: string;
  setBrandPage: (page: string) => void;
  cartCount: number;
  openCart: () => void;
  toggleAI: () => void;
  theme: "dark" | "light";
  toggleTheme: () => void;
}

const NAV_ITEMS = [
  { id: "home",        labelKey: "nav.home" },
  { id: "about",       labelKey: "nav.about" },
  { id: "products",    labelKey: "nav.products", hasMega: true },
  { id: "events",      labelKey: "nav.events" },
  { id: "blog",        labelKey: "nav.blog" },
  { id: "faq",         labelKey: "nav.faq" },
  { id: "contact",     labelKey: "nav.contact" },
];

const PRODUCT_CATEGORIES = [
  { id: "health",      icon: "🌿", labelEn: "Health & Wellness",    labelFr: "Santé & Bien-être" },
  { id: "beauty",      icon: "✨", labelEn: "Beauty & Skincare",     labelFr: "Beauté & Soin" },
  { id: "agriculture", icon: "🌾", labelEn: "Agriculture Boosters",  labelFr: "Boosters Agricoles" },
];

export default function Navbar({
  activeTab,
  setActiveTab,
  brandPage,
  setBrandPage,
  cartCount,
  openCart,
  toggleAI,
  theme,
  toggleTheme,
}: NavbarProps) {
  const { t, i18n: i18nInstance } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const megaRef = useRef<HTMLDivElement>(null);
  const locale = i18nInstance.language?.startsWith("fr") ? "fr" : "en";

  // Scroll detection for glass condensing
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mega menu on outside click
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
    // Persist locale preference to profile for logged-in users
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      supabase.from("profiles").update({ locale: nextLang }).eq("id", user.id).then(() => {});
    }
  };

  return (
    <motion.nav
      animate={{
        height: scrolled ? 56 : 64,
        backdropFilter: scrolled ? "blur(24px)" : "blur(12px)",
      }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="sticky top-0 z-50 w-full bg-stone-900/80 border-b border-stone-800/60 shadow-sm"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
        <div className="flex justify-between items-center h-full">

          {/* Logo */}
          <div
            onClick={() => handleMenuClick("home")}
            className="flex items-center gap-2 cursor-pointer group flex-shrink-0"
          >
            <div className="p-2 bg-gradient-to-tr from-[#006224] to-[#ecc246] rounded-xl text-white shadow-md shadow-emerald-950/20 group-hover:scale-105 transition-transform duration-300">
              <Sprout className="w-4 h-4" />
            </div>
            <span className="font-sans font-bold text-base tracking-tight text-white group-hover:text-[#ecc246] transition-colors duration-300">
              Songtai <span className="font-normal text-[#ecc246]">Life</span>
            </span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-0.5" ref={megaRef}>
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === "brand" && brandPage === item.id;
              if (item.hasMega) {
                return (
                  <div key={item.id} className="relative">
                    <button
                      onClick={() => setMegaOpen(o => !o)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full font-semibold text-sm transition-all duration-200 cursor-pointer ${
                        isActive || megaOpen
                          ? "bg-[#0A7D32]/20 border border-[#0A7D32]/40 text-emerald-400"
                          : "text-stone-300 hover:text-white hover:bg-stone-800/50 border border-transparent"
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
                          className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-72 bg-stone-900/95 backdrop-blur-xl border border-stone-800 rounded-2xl shadow-2xl p-4"
                        >
                          <p className="text-[10px] uppercase tracking-widest text-stone-500 font-bold mb-3">
                            {locale === "fr" ? "Nos Catégories" : "Our Categories"}
                          </p>
                          {PRODUCT_CATEGORIES.map(cat => (
                            <button
                              key={cat.id}
                              onClick={() => handleMenuClick("products")}
                              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-stone-800/60 text-left transition-colors group"
                            >
                              <span className="text-lg">{cat.icon}</span>
                              <div>
                                <p className="text-sm font-semibold text-white group-hover:text-[#ecc246] transition-colors">
                                  {locale === "fr" ? cat.labelFr : cat.labelEn}
                                </p>
                              </div>
                            </button>
                          ))}
                          <div className="mt-3 pt-3 border-t border-stone-800">
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
                  className={`relative px-3 py-1.5 rounded-full font-semibold text-sm transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "text-emerald-400"
                      : "text-stone-300 hover:text-white border border-transparent hover:bg-stone-800/50"
                  }`}
                >
                  {t(item.labelKey)}
                  {isActive && (
                    <motion.span
                      layoutId="nav-active-indicator"
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-emerald-400 rounded-full"
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
              className="relative flex items-center justify-between w-12 h-7 bg-stone-800/80 hover:bg-stone-700 border border-stone-700/50 rounded-full p-0.5 cursor-pointer transition-colors duration-300 shadow-inner overflow-hidden"
              title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
            >
              <motion.div
                className="absolute w-5.5 h-5.5 w-[22px] h-[22px] rounded-full bg-emerald-500 shadow-md flex items-center justify-center z-10"
                animate={{ x: theme === "light" ? 20 : 0, rotate: theme === "light" ? 360 : 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 24 }}
              >
                {theme === "light"
                  ? <Sun className="w-3 h-3 text-stone-950 stroke-[3]" />
                  : <Moon className="w-3 h-3 text-stone-950 stroke-[3]" />}
              </motion.div>
              <Moon className="w-3 h-3 text-stone-500 ml-1 pointer-events-none" />
              <Sun className="w-3 h-3 text-stone-500 mr-1 pointer-events-none" />
            </button>

            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-stone-700/50 bg-stone-800/60 hover:bg-stone-700/60 cursor-pointer transition-colors group"
              title={locale === "en" ? "Passer en Français" : "Switch to English"}
            >
              <Globe2 className="w-3.5 h-3.5 text-stone-400 group-hover:text-white" />
              <span className="text-xs font-bold text-stone-300 group-hover:text-white uppercase tracking-wide">
                {locale === "en" ? "FR" : "EN"}
              </span>
            </button>

            {/* Shopping Cart */}
            <button
              onClick={openCart}
              className="relative p-1.5 text-stone-300 hover:text-[#ecc246] hover:bg-stone-800/50 rounded-full transition-all duration-300 cursor-pointer"
            >
              <ShoppingBag className="w-4.5 h-4.5 w-[18px] h-[18px]" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-[#ecc246] text-stone-900 text-[9px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>

            {/* AI Assistant */}
            <button
              onClick={toggleAI}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-750 text-white rounded-full text-xs font-semibold border border-[#006224]/30 hover:border-[#ecc246]/50 transition-all duration-300 shadow-md shadow-black/40 cursor-pointer"
            >
              <MessageSquareCode className="w-3.5 h-3.5 text-[#ecc246]" />
              <span className="hidden md:inline">AI Architect</span>
            </button>

            {/* Become a Distributor CTA */}
            <button
              onClick={() => handleMenuClick("opportunity")}
              className="hidden xl:flex items-center px-3 py-1.5 bg-[#ecc246] hover:bg-[#dbb13b] text-stone-900 rounded-full text-xs font-black transition-all cursor-pointer shadow-md"
            >
              {t("nav.join")}
            </button>

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 text-stone-400 hover:text-white lg:hidden hover:bg-stone-800/50 rounded-full transition-colors cursor-pointer"
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
            className="lg:hidden absolute left-0 right-0 top-full bg-stone-900/98 backdrop-blur-2xl border-b border-stone-800 shadow-2xl px-4 py-4"
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
                    className={`w-full flex items-center justify-between px-4 py-3 text-sm font-bold rounded-xl transition-all cursor-pointer ${
                      isActive
                        ? "bg-[#0A7D32]/15 border border-[#0A7D32]/30 text-emerald-400"
                        : "text-stone-300 hover:text-white hover:bg-stone-800/50"
                    }`}
                  >
                    {t(item.labelKey)}
                    {isActive && <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />}
                  </motion.button>
                );
              })}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="mt-4 pt-4 border-t border-stone-800 flex items-center gap-3"
            >
              <button
                onClick={toggleLanguage}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-stone-700 bg-stone-800/50 text-sm font-bold text-stone-300 hover:text-white transition-colors cursor-pointer"
              >
                <Globe2 className="w-4 h-4" />
                {locale === "en" ? "Passer en Français" : "Switch to English"}
              </button>
              <button
                onClick={() => { handleMenuClick("opportunity"); }}
                className="flex-1 py-2.5 bg-[#ecc246] hover:bg-[#dbb13b] text-stone-900 rounded-xl text-sm font-black transition-all cursor-pointer text-center"
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
