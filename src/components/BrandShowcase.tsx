import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Product } from "../types";
import SEO from "./SEO";
import Footer from "./Footer";
import AppointmentBooking from "./brand/AppointmentBooking";

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
  theme: "dark" | "light";
}

type BrandSubPage =
  | "home" | "about" | "products" | "opportunity" | "events"
  | "blog" | "gallery" | "media" | "faq" | "contact" | "join" | "appointment";

const PAGE_SEO: Record<string, { titleKey: string; descKey: string }> = {
  home:     { titleKey: "hero.slogan",    descKey: "hero.sub" },
  about:    { titleKey: "about.title",    descKey: "about.subtitle" },
  products: { titleKey: "products.title", descKey: "products.subtitle" },
  faq:      { titleKey: "faq.title",      descKey: "faq.subtitle" },
  contact:  { titleKey: "contact.title",  descKey: "contact.subtitle" },
  blog:     { titleKey: "blog.title",     descKey: "blog.subtitle" },
  events:   { titleKey: "events.title",   descKey: "events.subtitle" },
};

export default function BrandShowcase({
  brandPage, setBrandPage, addToCart, setActiveTab,
  addNotification, openPrivacyPolicy, theme,
}: BrandShowcaseProps) {
  const { t } = useTranslation();
  const seo = PAGE_SEO[brandPage] ?? PAGE_SEO.home;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [brandPage]);

  return (
    <div className="relative min-h-screen flex flex-col font-sans select-none antialiased">
      <SEO title={t(seo.titleKey)} description={t(seo.descKey)} />

      <div className="flex-grow">
        {brandPage === "home" && (
          <HomeSection
            onNavigate={(page) => setBrandPage(page as BrandSubPage)}
            onAddToCart={addToCart}
            theme={theme}
          />
        )}
        {brandPage === "about" && <About />}
        {brandPage === "products" && <Products onAddToCart={addToCart} />}
        {brandPage === "opportunity" && (
          <Opportunity onNavigate={(page) => setBrandPage(page as BrandSubPage)} />
        )}
        {brandPage === "events" && <Events addNotification={addNotification} />}
        {brandPage === "blog" && <Blog />}
        {brandPage === "gallery" && <Gallery />}
        {brandPage === "media" && <MediaCenter />}
        {brandPage === "faq" && <FAQ />}
        {brandPage === "contact" && <Contact addNotification={addNotification} />}
        {brandPage === "join" && (
          <BecomeDistributor
            addNotification={addNotification}
            onNavigate={(page) => setBrandPage(page as BrandSubPage)}
          />
        )}
        {brandPage === "appointment" && (
          <AppointmentBooking addNotification={addNotification} />
        )}
      </div>

      <Footer
        setBrandPage={setBrandPage}
        openPrivacyPolicy={openPrivacyPolicy}
        theme={theme}
      />
    </div>
  );
}
