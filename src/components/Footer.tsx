import { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { Globe2 } from "lucide-react";
import { motion } from "motion/react";
import i18n from "../i18n";
import { useSiteSettings } from "../hooks/useSiteSettings";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import Logo from "./Logo";

const SOCIAL_ICONS: Record<string, ReactElement> = {
  facebook: (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  ),
  instagram: (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  ),
  tiktok: (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
    </svg>
  ),
  youtube: (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
      <path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/>
    </svg>
  ),
  linkedin: (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  ),
};

interface FooterProps {
  setBrandPage: (page: string) => void;
  openPrivacyPolicy: () => void;
  theme: "dark" | "light";
}

export default function Footer({ setBrandPage, openPrivacyPolicy, theme }: FooterProps) {
  const { t, i18n: i18nInstance } = useTranslation();
  const { socials, contact } = useSiteSettings();
  const locale = i18nInstance.language?.startsWith("fr") ? "fr" : "en";
  const year = new Date().getFullYear();

  const { user } = useAuth();

  const toggleLanguage = async () => {
    const nextLang = locale === "en" ? "fr" : "en";
    i18n.changeLanguage(nextLang);
    localStorage.setItem("songtai_lng", nextLang);
    if (user) {
      supabase.from("profiles").update({ locale: nextLang }).eq("id", user.id).then(() => {});
    }
  };

  const QUICK_LINKS = [
    { key: "home",        label: t("footer.home") },
    { key: "about",       label: t("footer.about") },
    { key: "products",    label: t("footer.products") },
    { key: "opportunity", label: t("footer.opportunity") },
    { key: "events",      label: t("footer.events") },
    { key: "blog",        label: t("footer.blog") },
    { key: "gallery",     label: t("footer.gallery") },
    { key: "media",       label: t("footer.mediaCenter") },
    { key: "faq",         label: t("footer.faq") },
    { key: "contact",     label: t("footer.contact") },
    { key: "join",        label: t("footer.becomeDistributor") },
  ];

  const activeSocials = Object.entries(socials).filter(([, url]) => !!url);

  const textMuted = theme === "light" ? "text-stone-500" : "text-stone-400";
  const textDim = theme === "light" ? "text-stone-400" : "text-stone-500";
  const headingCls = theme === "light" ? "text-stone-700" : "text-stone-300";
  const borderCls = theme === "light" ? "border-stone-200" : "border-stone-900";
  const bgCls = theme === "light" ? "bg-stone-100" : "bg-stone-950";
  const linkHover = "hover:text-[#C9A227] transition-colors duration-200 cursor-pointer";

  return (
    <footer className={`${bgCls} border-t ${borderCls}`}>
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10`}>

        {/* Column 1 — Company / Logo */}
        <div className="space-y-5">
          <Logo theme={theme} size="md" onClick={() => setBrandPage("home")} />
          <p className={`${textMuted} text-xs leading-relaxed max-w-[220px]`}>
            {t("footer.tagline")}
          </p>
          <button
            onClick={toggleLanguage}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full border ${theme === "light" ? "border-stone-300 bg-white text-stone-600 hover:bg-stone-50" : "border-stone-800 bg-stone-900/60 text-stone-400 hover:bg-stone-800/60"} text-xs font-bold transition-colors cursor-pointer`}
          >
            <Globe2 className="w-3.5 h-3.5" />
            {locale === "en" ? "Passer en Français" : "Switch to English"}
          </button>
        </div>

        {/* Column 2 — Quick Links (public pages only) */}
        <div>
          <h5 className={`font-bold text-[11px] uppercase tracking-widest ${headingCls} mb-4`}>
            {t("footer.quickLinks")}
          </h5>
          <ul className="space-y-2">
            {QUICK_LINKS.map(link => (
              <li key={link.key}>
                <button
                  onClick={() => setBrandPage(link.key)}
                  className={`text-xs ${textMuted} ${linkHover} text-left`}
                >
                  {link.label}
                </button>
              </li>
            ))}
          </ul>
          <div className={`mt-4 pt-4 border-t ${borderCls}`}>
            <a
              href="/distributor/login"
              className={`text-xs font-semibold ${theme === "light" ? "text-emerald-700" : "text-emerald-400"} ${linkHover} flex items-center gap-1`}
            >
              {t("footer.distributorLogin")} ↗
            </a>
          </div>
        </div>

        {/* Column 3 — Contact & Location (from site_settings) */}
        <div>
          <h5 className={`font-bold text-[11px] uppercase tracking-widest ${headingCls} mb-4`}>
            {t("footer.contactUs")}
          </h5>
          <div className={`space-y-3 text-xs ${textMuted} leading-relaxed`}>
            {contact.phone && (
              <p>
                <span className={`block text-[10px] font-bold uppercase tracking-wider ${textDim} mb-0.5`}>Phone</span>
                <a href={`tel:${contact.phone}`} className={linkHover}>{contact.phone}</a>
              </p>
            )}
            {contact.email && (
              <p>
                <span className={`block text-[10px] font-bold uppercase tracking-wider ${textDim} mb-0.5`}>Email</span>
                <a href={`mailto:${contact.email}`} className={`text-[#C9A227] font-semibold ${linkHover}`}>{contact.email}</a>
              </p>
            )}
            {(contact.address_en || contact.address_fr) && (
              <p>
                <span className={`block text-[10px] font-bold uppercase tracking-wider ${textDim} mb-0.5`}>Address</span>
                <span className="whitespace-pre-line">
                  {locale === "fr" ? (contact.address_fr || contact.address_en) : (contact.address_en || contact.address_fr)}
                </span>
              </p>
            )}
            {!contact.phone && !contact.email && !contact.address_en && (
              <p className={textDim + " italic"}>
                {locale === "fr" ? "Coordonnées à configurer dans les paramètres." : "Contact details managed in admin settings."}
              </p>
            )}
          </div>
        </div>

        {/* Column 4 — Socials */}
        <div>
          <h5 className={`font-bold text-[11px] uppercase tracking-widest ${headingCls} mb-4`}>
            {t("footer.followUs")}
          </h5>
          {activeSocials.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {activeSocials.map(([platform, url]) => (
                SOCIAL_ICONS[platform] && (
                  <motion.a
                    key={platform}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.12, y: -2 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    className={`flex items-center justify-center w-9 h-9 rounded-xl border transition-colors ${theme === "light" ? "border-stone-300 bg-white text-stone-600 hover:border-[#C9A227] hover:text-[#C9A227]" : "border-stone-800 bg-stone-900/50 text-stone-400 hover:border-[#C9A227] hover:text-[#C9A227]"}`}
                    title={platform}
                  >
                    {SOCIAL_ICONS[platform]}
                  </motion.a>
                )
              ))}
            </div>
          ) : (
            <p className={`text-xs ${textDim} italic`}>
              {locale === "fr" ? "Liens sociaux à configurer dans les paramètres." : "Social links managed in admin settings."}
            </p>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div className={`border-t ${borderCls} ${bgCls}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] uppercase tracking-widest">
          <span className={textDim}>
            © {year} Songtai Life. {t("footer.rights")}
          </span>
          <div className="flex items-center gap-4">
            <button
              onClick={openPrivacyPolicy}
              className={`${textDim} ${linkHover} normal-case tracking-normal text-xs`}
            >
              {t("footer.privacyPolicy")}
            </button>
            <span className={textDim}>·</span>
            <button
              onClick={openPrivacyPolicy}
              className={`${textDim} ${linkHover} normal-case tracking-normal text-xs`}
            >
              {t("footer.terms")}
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
