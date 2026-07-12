import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Shield, Sparkles, Award, Sprout, Heart, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "../../lib/supabase";
import InitialsAvatar from "./InitialsAvatar";

interface StoryContent {
  tagline_en: string; tagline_fr: string;
  headline_en: string; headline_fr: string;
  intro_en: string; intro_fr: string;
}

interface StoryBody {
  story1_en: string; story1_fr: string;
  story2_en: string; story2_fr: string;
  mission_en: string; mission_fr: string;
  vision_en: string; vision_fr: string;
  image_url: string;
}

interface TeamMember { name: string; role_en: string; role_fr?: string; desc_en: string; desc_fr?: string; bio_en?: string; bio_fr?: string; image: string; photo_url?: string; }
interface Cert { label_en: string; label_fr: string; sub_en: string; sub_fr: string; }

const DEFAULT_HEADER: StoryContent = {
  tagline_en: "About Songtai Life", tagline_fr: "À Propos de Songtai Life",
  headline_en: "Empowering Through Science, Sourcing Locally",
  headline_fr: "Autonomiser par la Science, Sourcer Localement",
  intro_en: "Our mission is to engineer West Africa's most respected wellness brand, transforming biological resources into sovereign streams of health and economic security.",
  intro_fr: "Notre mission est de bâtir la marque de bien-être la plus respectée d'Afrique de l'Ouest.",
};

const DEFAULT_BODY: StoryBody = {
  story1_en: "Songtai Life began with a single vision in Douala: to bridge the gap between traditional West African plant wisdom and cutting-edge pharmaceutical standards. We realized that our local crops—such as northern Moringa, wild ginger, shea, and adaptogenic roots—possessed incredible bioactive benefits that, when scientifically processed, could transform lives.",
  story1_fr: "Songtai Life a débuté avec une vision unique à Douala : combler le fossé entre la sagesse traditionnelle des plantes d'Afrique de l'Ouest et les normes pharmaceutiques de pointe.",
  story2_en: "Today, we have established direct-trade partnerships with organic agricultural cooperatives across Cameroon's West, Centre, and Littoral regions, securing premium incomes for local farmers while delivering pure, high-potency products to our global network of distributors.",
  story2_fr: "Aujourd'hui, nous avons établi des partenariats de commerce direct avec des coopératives agricoles biologiques à travers les régions Ouest, Centre et Littoral du Cameroun.",
  mission_en: "To deliver premium-quality botanical solutions and direct-selling templates that provide families with robust health, biological food yields, and sovereign financial independence.",
  mission_fr: "Fournir des solutions botaniques de haute qualité et des modèles de vente directe qui offrent aux familles une santé robuste et une indépendance financière souveraine.",
  vision_en: "To become the absolute standard of organic direct-marketing across Sub-Saharan Africa, proving that local natural resources can fuel global-scale enterprises.",
  vision_fr: "Devenir la référence absolue du marketing direct biologique en Afrique subsaharienne, prouvant que les ressources naturelles locales peuvent alimenter des entreprises à l'échelle mondiale.",
  image_url: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&q=80&w=600",
};

// No stock photos here by design — until a real headshot is uploaded via the
// admin CMS, team members render as a designed initials avatar rather than a
// mismatched stock headshot presented as if it were a real person.
const DEFAULT_TEAM: TeamMember[] = [
  { name: "Dr. Elena Ndip", role_en: "Chief Medical & Botanical Officer", desc_en: "Over 18 years of clinical pharmacology, specializes in phytomedicine research at the University of Yaoundé.", image: "" },
  { name: "Francois Beyene", role_en: "Agronomist & Sourcing Expert", desc_en: "Advises our cacao, moringa, and coffee farmer cooperatives in Bafoussam on biological growth multipliers.", image: "" },
  { name: "Amadou Diallo", role_en: "Double Diamond Global Ambassador", desc_en: "An executive business coach who has mentored thousands of direct-selling entrepreneurs throughout CEMAC.", image: "" },
];

const DEFAULT_CERTS: Cert[] = [
  { label_en: "MINSANTE Approved", label_fr: "Approuvé MINSANTE", sub_en: "Ministry of Public Health Cameroon", sub_fr: "Ministère de la Santé Publique" },
  { label_en: "100% Organic Sourcing", label_fr: "100% Biologique", sub_en: "Biological chemical-free crops", sub_fr: "Cultures biologiques sans produits chimiques" },
  { label_en: "HALAL Certified", label_fr: "Certifié HALAL", sub_en: "Pure processing standards", sub_fr: "Normes de traitement pures" },
  { label_en: "ISO 9001 Compliant", label_fr: "Conforme ISO 9001", sub_en: "Global quality frameworks", sub_fr: "Cadres de qualité mondiaux" },
];

async function fetchSection<T>(key: string): Promise<T | null> {
  const { data } = await supabase.from("homepage_sections").select("content").eq("section_key", key).maybeSingle();
  return data?.content as T | null;
}

export default function About() {
  const { i18n } = useTranslation();
  const lang: "en" | "fr" = i18n.language?.startsWith("fr") ? "fr" : "en";
  const [header, setHeader] = useState<StoryContent>(DEFAULT_HEADER);
  const [body, setBody] = useState<StoryBody>(DEFAULT_BODY);
  const [team, setTeam] = useState<TeamMember[]>(DEFAULT_TEAM);
  const [certs, setCerts] = useState<Cert[]>(DEFAULT_CERTS);
  const [expandedBio, setExpandedBio] = useState<number | null>(null);

  useEffect(() => {
    fetchSection<StoryContent>("page_our_story").then(d => { if (d) setHeader(prev => ({ ...prev, ...d })); });
    fetchSection<StoryBody>("page_our_story_body").then(d => { if (d) setBody(prev => ({ ...prev, ...d })); });
    fetchSection<{ members: TeamMember[] }>("page_our_story_team").then(d => { if (d?.members?.length) setTeam(d.members); });
    fetchSection<{ certs: Cert[] }>("page_our_story_certs").then(d => { if (d?.certs?.length) setCerts(d.certs); });
  }, []);

  const t = (en: string, fr: string) => lang === "fr" ? (fr || en) : en;

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 py-16 font-sans relative overflow-hidden text-left">
      <div className="absolute top-[15%] left-[5%] w-[400px] h-[400px] rounded-full bg-emerald-600/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[20%] right-[10%] w-[500px] h-[500px] rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 relative z-10">
        
        <div className="space-y-4">
          <span className="text-xs uppercase tracking-widest text-[color:var(--color-gold)] font-bold">{t(header.tagline_en, header.tagline_fr)}</span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-[1.1]">
            {t(header.headline_en, header.headline_fr)}
          </h1>
          <p className="text-stone-400 text-sm max-w-2xl leading-relaxed">
            {t(header.intro_en, header.intro_fr)}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-stone-900/30 border border-stone-850 p-8 rounded-[32px]">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Sprout className="w-5 h-5 text-emerald-400" /> Our Story & Heritage
            </h2>
            <p className="text-stone-300 text-xs sm:text-sm leading-relaxed">{t(body.story1_en, body.story1_fr)}</p>
            <p className="text-stone-400 text-xs leading-relaxed">{t(body.story2_en, body.story2_fr)}</p>
          </div>
          <div className="aspect-video rounded-2xl overflow-hidden bg-stone-950 border border-stone-800">
            <img src={body.image_url} alt="Cameroon organic farms" loading="lazy" className="w-full h-full object-cover opacity-80" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-stone-900/10 border border-stone-850 p-8 rounded-[24px] space-y-3">
            <h3 className="font-extrabold text-white text-lg flex items-center gap-2">
              <Heart className="w-5 h-5 text-emerald-400" /> Our Sovereign Mission
            </h3>
            <p className="text-stone-400 text-xs sm:text-sm leading-relaxed">{t(body.mission_en, body.mission_fr)}</p>
          </div>
          <div className="bg-stone-900/10 border border-stone-850 p-8 rounded-[24px] space-y-3">
            <h3 className="font-extrabold text-white text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[color:var(--color-gold)]" /> Our Pan-African Vision
            </h3>
            <p className="text-stone-400 text-xs sm:text-sm leading-relaxed">{t(body.vision_en, body.vision_fr)}</p>
          </div>
        </div>

        <div className="space-y-8">
          <h3 className="text-xl font-bold text-white border-b border-stone-900 pb-2">Our Executive Leadership</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {team.map((member, idx) => {
              const photo = member.photo_url || member.image;
              const desc = lang === "fr" ? (member.desc_fr || member.bio_fr || member.desc_en || member.bio_en || "") : (member.desc_en || member.bio_en || "");
              const isLong = desc.length > 140;
              const isOpen = expandedBio === idx;
              const shownDesc = isLong && !isOpen ? `${desc.slice(0, 140).trimEnd()}…` : desc;
              return (
                <div key={idx} className="bg-stone-900/30 border border-stone-850 p-6 rounded-2xl space-y-4">
                  {photo ? (
                    <img src={photo} alt={member.name} loading="lazy" className="w-16 h-16 rounded-full object-cover border border-stone-800" />
                  ) : (
                    <InitialsAvatar name={member.name} size={64} className="border border-stone-800" />
                  )}
                  <div>
                    <h4 className="font-bold text-white text-base">{member.name}</h4>
                    <span className="text-[10px] text-[color:var(--color-gold)] font-bold block uppercase">{lang === "fr" ? (member.role_fr || member.role_en) : member.role_en}</span>
                    <p className="text-stone-400 text-xs mt-2.5 leading-relaxed">{shownDesc}</p>
                    {isLong && (
                      <button
                        onClick={() => setExpandedBio(isOpen ? null : idx)}
                        className="mt-2 text-[10px] font-bold text-emerald-400 hover:underline cursor-pointer"
                      >
                        {isOpen ? (lang === "fr" ? "Réduire" : "Read less") : (lang === "fr" ? "Lire plus" : "Read more")}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-stone-900/40 border border-stone-850 p-8 rounded-[32px] space-y-6">
          <div className="space-y-1.5">
            <h3 className="font-extrabold text-white text-xl flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-400" /> Guaranteed Quality & Certifications
            </h3>
            <p className="text-stone-400 text-xs">Every Songtai Life release complies strictly with local and international food & drug safety mandates.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            {certs.map((cert, idx) => (
              <div key={idx} className="bg-stone-950 p-4 rounded-xl border border-stone-900/80 space-y-1">
                <div className="flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-[color:var(--color-gold)]" />
                  <span className="text-white text-xs font-bold">{t(cert.label_en, cert.label_fr)}</span>
                </div>
                <p className="text-stone-500 text-[10px]">{t(cert.sub_en, cert.sub_fr)}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
