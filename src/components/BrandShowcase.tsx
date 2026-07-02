import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Product } from "../types";
import SEO from "./SEO";
import { 
  Home, Info, ShoppingBag, TrendingUp, Calendar, BookOpen, 
  Image as ImageIcon, Video, HelpCircle, Phone, Sparkles, Sprout
} from "lucide-react";

// Sub-page component imports
import HomeSection from "./brand/HomeSection";
import About from "./brand/About";
import Products from "./brand/Products";
import Opportunity from "./brand/Opportunity";
import Events from "./brand/Events";
import Blog from "./brand/Blog";
import Gallery from "./brand/Gallery";
import MediaCenter from "./brand/MediaCenter";
import FAQ from "./brand/FAQ";
import Contact from "./brand/Contact";
import BecomeDistributor from "./brand/BecomeDistributor";

interface BrandShowcaseProps {
  brandPage: string;
  setBrandPage: (page: any) => void;
  addToCart: (product: Product) => void;
  setActiveTab: (tab: "brand" | "portal" | "tech-spec") => void;
  addNotification: (message: string, type: "success" | "info" | "gold") => void;
  openPrivacyPolicy: () => void;
}

type BrandSubPage = 
  | "home" 
  | "about" 
  | "products" 
  | "opportunity" 
  | "events" 
  | "blog" 
  | "gallery" 
  | "media" 
  | "faq" 
  | "contact" 
  | "join";

const PAGE_SEO: Record<string, { titleKey: string; descKey: string }> = {
  home:        { titleKey: "hero.slogan",       descKey: "hero.sub" },
  about:       { titleKey: "about.title",       descKey: "about.subtitle" },
  products:    { titleKey: "products.title",    descKey: "products.subtitle" },
  faq:         { titleKey: "faq.title",         descKey: "faq.subtitle" },
  contact:     { titleKey: "contact.title",     descKey: "contact.subtitle" },
  blog:        { titleKey: "blog.title",        descKey: "blog.subtitle" },
  events:      { titleKey: "events.title",      descKey: "events.subtitle" },
};

export default function BrandShowcase({ 
  brandPage, 
  setBrandPage, 
  addToCart, 
  setActiveTab, 
  addNotification, 
  openPrivacyPolicy 
}: BrandShowcaseProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const seo = PAGE_SEO[brandPage] ?? PAGE_SEO.home;

  // Smooth scroll to top when brand sub-page transitions
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [brandPage]);

  return (
    <div className="relative min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans select-none antialiased">
      <SEO title={t(seo.titleKey)} description={t(seo.descKey)} />

      {/* Primary Brand Sub-Page Router Switch */}
      <div className="flex-grow">
        {brandPage === "home" && (
          <HomeSection 
            onNavigate={(page) => setBrandPage(page as BrandSubPage)} 
            onAddToCart={addToCart} 
          />
        )}

        {brandPage === "about" && (
          <About />
        )}

        {brandPage === "products" && (
          <Products 
            onAddToCart={addToCart} 
          />
        )}

        {brandPage === "opportunity" && (
          <Opportunity 
            onNavigate={(page) => setBrandPage(page as BrandSubPage)} 
          />
        )}

        {brandPage === "events" && (
          <Events 
            addNotification={addNotification} 
          />
        )}

        {brandPage === "blog" && (
          <Blog />
        )}

        {brandPage === "gallery" && (
          <Gallery />
        )}

        {brandPage === "media" && (
          <MediaCenter />
        )}

        {brandPage === "faq" && (
          <FAQ />
        )}

        {brandPage === "contact" && (
          <Contact 
            addNotification={addNotification} 
          />
        )}

        {brandPage === "join" && (
          <BecomeDistributor 
            addNotification={addNotification} 
            onNavigate={(page) => setBrandPage(page as BrandSubPage)} 
          />
        )}
      </div>

      {/* Standard Brand Footer */}
      <footer className="border-t border-stone-900 bg-stone-950 py-12 text-stone-500 font-medium text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-4 gap-8 text-left">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Sprout className="w-5 h-5 text-[#0A7D32]" />
              <span className="font-sans font-bold text-white text-base tracking-tight">Songtai Life</span>
            </div>
            <p className="text-stone-400 leading-relaxed max-w-xs">
              Formulating sovereign health solutions and unilevel business networks across Sub-Saharan Africa.
            </p>
          </div>

          <div>
            <h5 className="font-bold text-white uppercase tracking-wider mb-3">Our Offerings</h5>
            <ul className="space-y-2">
              <li><button onClick={() => setBrandPage("products")} className="hover:text-[#C9A227] transition-all">Sovereign Supplements</button></li>
              <li><button onClick={() => setBrandPage("products")} className="hover:text-[#C9A227] transition-all">Luminous Skincare</button></li>
              <li><button onClick={() => setBrandPage("products")} className="hover:text-[#C9A227] transition-all">Bio-Yield Agriculture</button></li>
              <li><button onClick={() => setBrandPage("join")} className="hover:text-emerald-400 font-bold transition-all">Become Distributor ✦</button></li>
            </ul>
          </div>

          <div>
            <h5 className="font-bold text-white uppercase tracking-wider mb-3">Community Hub</h5>
            <ul className="space-y-2">
              <li><button onClick={() => setBrandPage("opportunity")} className="hover:text-[#C9A227] transition-all">Compensation Model</button></li>
              <li><button onClick={() => setBrandPage("events")} className="hover:text-[#C9A227] transition-all">Leadership Summits</button></li>
              <li><button onClick={() => setBrandPage("gallery")} className="hover:text-[#C9A227] transition-all">Event Gallery</button></li>
              <li><button onClick={() => setBrandPage("blog")} className="hover:text-[#C9A227] transition-all">Wellness Hub (Blog)</button></li>
              <li><button onClick={() => setBrandPage("media")} className="hover:text-[#C9A227] transition-all">Media Center</button></li>
              <li><button onClick={() => setActiveTab("portal")} className="hover:text-emerald-400 font-bold transition-all text-left flex items-center gap-1">Distributor Portal ↗</button></li>
              <li><button onClick={() => setActiveTab("tech-spec")} className="hover:text-emerald-400 font-bold transition-all text-left flex items-center gap-1">Technical Architecture ↗</button></li>
              <li><button onClick={() => navigate("/admin/dashboard")} className="hover:text-amber-400 font-bold transition-all text-left flex items-center gap-1">Admin Portal ⚙️</button></li>
              <li><button onClick={openPrivacyPolicy} className="hover:text-emerald-400 font-semibold transition-all">Privacy & Cybersecurity</button></li>
            </ul>
          </div>

          <div>
            <h5 className="font-bold text-white uppercase tracking-wider mb-3">National Offices</h5>
            <p className="text-stone-400 leading-relaxed">
              Yaoundé: Avenue Kennedy<br />
              Douala: Akwa District<br />
              <span className="text-[#C9A227] block mt-1.5 font-bold">support@songtailife.com</span>
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 mt-8 pt-8 border-t border-stone-900 text-center text-[10px] tracking-widest uppercase text-stone-600">
          <p className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2">
            <span>© 2026 Songtai Life Digital Ecosystem. All rights reserved. Registered under CEMAC trade regulations.</span>
            <span className="hidden md:inline text-stone-850">|</span>
            <button onClick={openPrivacyPolicy} className="hover:text-emerald-400 underline decoration-stone-850 hover:decoration-emerald-400 transition-all cursor-pointer normal-case tracking-normal">Data Protection Policy (Law No. 2010/012)</button>
          </p>
        </div>
      </footer>

    </div>
  );
}
