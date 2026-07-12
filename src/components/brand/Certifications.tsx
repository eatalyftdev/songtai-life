import { useState, useEffect } from "react";
import { Award } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "../../lib/supabase";

interface Cert { label_en: string; label_fr: string; sub_en: string; sub_fr: string; }

const DEFAULT_CERTS: Cert[] = [
  { label_en: "MINSANTE Approved", label_fr: "Approuvé MINSANTE", sub_en: "Ministry of Public Health Cameroon", sub_fr: "Ministère de la Santé Publique" },
  { label_en: "100% Organic Sourcing", label_fr: "100% Biologique", sub_en: "Biological chemical-free crops", sub_fr: "Cultures biologiques sans produits chimiques" },
  { label_en: "HALAL Certified", label_fr: "Certifié HALAL", sub_en: "Pure processing standards", sub_fr: "Normes de traitement pures" },
  { label_en: "ISO 9001 Compliant", label_fr: "Conforme ISO 9001", sub_en: "Global quality frameworks", sub_fr: "Cadres de qualité mondiaux" },
];

/**
 * Sitewide trust bar — certifications + heritage, always visible in the
 * footer rather than buried on a single About page. Shares the same
 * `page_our_story_certs` CMS record as the About page so admins only
 * maintain one list.
 */
export default function Certifications({ theme }: { theme: "dark" | "light" }) {
  const { i18n } = useTranslation();
  const lang: "en" | "fr" = i18n.language?.startsWith("fr") ? "fr" : "en";
  const [certs, setCerts] = useState<Cert[]>(DEFAULT_CERTS);

  useEffect(() => {
    supabase
      .from("homepage_sections")
      .select("content")
      .eq("section_key", "page_our_story_certs")
      .maybeSingle()
      .then(({ data }) => {
        const list = (data?.content as { certs?: Cert[] } | null)?.certs;
        if (list?.length) setCerts(list);
      });
  }, []);

  const t = (en: string, fr: string) => (lang === "fr" ? fr || en : en);
  const borderCls = theme === "light" ? "border-stone-200" : "border-stone-900";
  const bgCls = theme === "light" ? "bg-stone-50" : "bg-stone-950/60";
  const textMuted = theme === "light" ? "text-stone-500" : "text-stone-400";
  const textDim = theme === "light" ? "text-stone-400" : "text-stone-600";

  return (
    <div className={`border-b ${borderCls} ${bgCls}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-wrap items-center justify-center sm:justify-between gap-x-8 gap-y-4">
          <span className={`text-[10px] font-bold uppercase tracking-widest ${textDim} shrink-0`}>
            {lang === "fr" ? "45+ ans de savoir-faire · Certifié" : "45+ years of heritage · Certified"}
          </span>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            {certs.map((cert, idx) => (
              <div key={idx} className="flex items-center gap-2" title={t(cert.sub_en, cert.sub_fr)}>
                <Award className="w-4 h-4 text-[color:var(--color-gold)] shrink-0" aria-hidden="true" />
                <span className={`text-xs font-semibold ${textMuted}`}>{t(cert.label_en, cert.label_fr)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
