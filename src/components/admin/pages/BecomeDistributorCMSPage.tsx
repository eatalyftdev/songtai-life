import { useState, useEffect } from "react";
import { Users, Save, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import PageShell, { Card, Btn } from "../shared/PageShell";

function InputField({ label, value, onChange, multiline = false }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean }) {
  const cls = "w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32] transition-colors";
  return (
    <div>
      <label className="text-stone-400 text-xs block mb-1.5">{label}</label>
      {multiline
        ? <textarea value={value} onChange={e => onChange(e.target.value)} rows={3} className={`${cls} resize-none`} />
        : <input value={value} onChange={e => onChange(e.target.value)} className={cls} />}
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="text-stone-400 text-xs block mb-1.5">{label}</label>
      <input type="number" value={value} onChange={e => onChange(Number(e.target.value))}
        className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32] transition-colors" />
    </div>
  );
}

function BilingualFields({ prefix, values, onChange, multiline = false }: { prefix: string; values: [string, string]; onChange: (l: "en" | "fr", v: string) => void; multiline?: boolean }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <InputField label={`${prefix} (EN)`} value={values[0]} onChange={v => onChange("en", v)} multiline={multiline} />
      <InputField label={`${prefix} (FR)`} value={values[1]} onChange={v => onChange("fr", v)} multiline={multiline} />
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <Card>
      <button type="button" onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between p-5 text-left">
        <span className="text-white font-bold text-sm">{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-stone-500" /> : <ChevronDown className="w-4 h-4 text-stone-500" />}
      </button>
      {open && <div className="px-5 pb-5 space-y-4 border-t border-stone-800 pt-4">{children}</div>}
    </Card>
  );
}

async function upsertSection(key: string, content: unknown) {
  const { error } = await supabase.from("homepage_sections")
    .upsert({ section_key: key, content, updated_at: new Date().toISOString() }, { onConflict: "section_key" });
  return error;
}

interface PackData { key: string; label_en: string; label_fr: string; price_xaf: number; }
interface BenefitData { text_en: string; text_fr: string; }

interface DistributorPageData {
  tagline_en: string; tagline_fr: string;
  headline_en: string; headline_fr: string;
  intro_en: string; intro_fr: string;
  packs: PackData[];
  benefits: BenefitData[];
  security_note_en: string; security_note_fr: string;
  success_credential_prefix: string;
  success_body_en: string; success_body_fr: string;
  success_email_note_en: string; success_email_note_fr: string;
}

const DEFAULTS: DistributorPageData = {
  tagline_en: "Unlocking Abundance", tagline_fr: "Libérer l'Abondance",
  headline_en: "Become a Distributor", headline_fr: "Devenir Distributeur",
  intro_en: "Fill in the direct-selling franchise activation profile. Settle your starter pack volume through mobile money using our MeSomb payment gateway wrapper.",
  intro_fr: "Remplissez le profil d'activation de la franchise. Payez votre pack de démarrage via Mobile Money avec notre passerelle MeSomb.",
  packs: [
    { key: "bronze", label_en: "Bronze Pack", label_fr: "Pack Bronze", price_xaf: 25000 },
    { key: "silver", label_en: "Silver Pack", label_fr: "Pack Argent", price_xaf: 75000 },
    { key: "gold", label_en: "Gold Pack", label_fr: "Pack Or", price_xaf: 180000 },
  ],
  benefits: [
    { text_en: "Standard physical product package collection at Douala or Yaoundé head offices.", text_fr: "Collecte du kit produit physique dans nos bureaux de Douala ou Yaoundé." },
    { text_en: "Active unilevel node credentials registered instantly on the regional system.", text_fr: "Identifiants de nœud unilevel activés immédiatement dans le système régional." },
    { text_en: "Direct access to our physical business summits and printable materials.", text_fr: "Accès direct à nos sommets d'affaires physiques et aux supports imprimables." },
    { text_en: "Immediate 10% direct refer commissions, biweekly mobile money payouts.", text_fr: "Commissions de parrainage direct de 10 % immédiates, virements bimensuels." },
  ],
  security_note_en: "Protected by MeSomb SSL Mobile Handshake.",
  security_note_fr: "Protégé par la poignée de main SSL Mobile MeSomb.",
  success_credential_prefix: "ST",
  success_body_en: "Your distributor activation has been finalized. Your physical starter package is prepared at our Yaoundé office pick-up point.",
  success_body_fr: "Votre activation de distributeur est finalisée. Votre kit de démarrage est prêt à être collecté à notre bureau de Yaoundé.",
  success_email_note_en: "An onboarding brochure and presentation slide template pack have been forwarded to your registered email address.",
  success_email_note_fr: "Une brochure d'intégration et un pack de diapositives ont été envoyés à votre adresse e-mail enregistrée.",
};

export default function BecomeDistributorCMSPage() {
  const [data, setData] = useState<DistributorPageData>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase.from("homepage_sections").select("content").eq("section_key", "page_become_distributor").maybeSingle()
      .then(({ data: row }) => { if (row?.content) setData(d => ({ ...d, ...row.content as Partial<DistributorPageData> })); });
  }, []);

  const s = (k: keyof DistributorPageData) => (v: string) => setData(d => ({ ...d, [k]: v }));

  const updatePack = (i: number, k: keyof PackData, v: string | number) =>
    setData(d => ({ ...d, packs: d.packs.map((p, idx) => idx === i ? { ...p, [k]: v } : p) }));
  const addPack = () => setData(d => ({ ...d, packs: [...d.packs, { key: `pack_${d.packs.length + 1}`, label_en: "", label_fr: "", price_xaf: 0 }] }));
  const removePack = (i: number) => setData(d => ({ ...d, packs: d.packs.filter((_, idx) => idx !== i) }));

  const updateBenefit = (i: number, k: keyof BenefitData, v: string) =>
    setData(d => ({ ...d, benefits: d.benefits.map((b, idx) => idx === i ? { ...b, [k]: v } : b) }));
  const addBenefit = () => setData(d => ({ ...d, benefits: [...d.benefits, { text_en: "", text_fr: "" }] }));
  const removeBenefit = (i: number) => setData(d => ({ ...d, benefits: d.benefits.filter((_, idx) => idx !== i) }));

  const save = async () => {
    setSaving(true);
    await upsertSection("page_become_distributor", data);
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500);
  };

  return (
    <PageShell
      title="Become a Distributor Editor"
      subtitle="Edit the public distributor registration page — packs, prices, benefits, confirmation messages"
      actions={<div className="flex items-center gap-2 text-stone-500 text-xs"><Users className="w-4 h-4" /><span>Changes go live instantly</span></div>}
    >
      <div className="space-y-4">
        <SectionCard title="📝 Page Header">
          <BilingualFields prefix="Tag line" values={[data.tagline_en, data.tagline_fr]} onChange={(l, v) => s(l === "en" ? "tagline_en" : "tagline_fr")(v)} />
          <BilingualFields prefix="Headline" values={[data.headline_en, data.headline_fr]} onChange={(l, v) => s(l === "en" ? "headline_en" : "headline_fr")(v)} />
          <BilingualFields prefix="Intro paragraph" values={[data.intro_en, data.intro_fr]} onChange={(l, v) => s(l === "en" ? "intro_en" : "intro_fr")(v)} multiline />
        </SectionCard>

        <SectionCard title="📦 Starter Packs">
          <div className="space-y-4">
            {data.packs.map((pack, i) => (
              <div key={i} className="p-4 bg-stone-900/60 border border-stone-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-stone-500 text-xs font-bold">Pack {i + 1}</span>
                  <button type="button" onClick={() => removePack(i)} className="text-stone-600 hover:text-red-400 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                <InputField label="Pack key (internal, e.g. bronze)" value={pack.key} onChange={v => updatePack(i, "key", v)} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <InputField label="Label (EN)" value={pack.label_en} onChange={v => updatePack(i, "label_en", v)} />
                  <InputField label="Label (FR)" value={pack.label_fr} onChange={v => updatePack(i, "label_fr", v)} />
                </div>
                <NumberField label="Price (XAF)" value={pack.price_xaf} onChange={v => updatePack(i, "price_xaf", v)} />
              </div>
            ))}
            <button type="button" onClick={addPack} className="flex items-center gap-1.5 text-stone-500 hover:text-[#0A7D32] text-xs font-bold transition-colors cursor-pointer">
              <Plus className="w-3.5 h-3.5" /> Add Pack
            </button>
          </div>
        </SectionCard>

        <SectionCard title="✅ Franchise Benefits Checklist">
          <div className="space-y-3">
            {data.benefits.map((b, i) => (
              <div key={i} className="p-4 bg-stone-900/60 border border-stone-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-stone-500 text-xs font-bold">Benefit {i + 1}</span>
                  <button type="button" onClick={() => removeBenefit(i)} className="text-stone-600 hover:text-red-400 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <InputField label="Text (EN)" value={b.text_en} onChange={v => updateBenefit(i, "text_en", v)} multiline />
                  <InputField label="Text (FR)" value={b.text_fr} onChange={v => updateBenefit(i, "text_fr", v)} multiline />
                </div>
              </div>
            ))}
            <button type="button" onClick={addBenefit} className="flex items-center gap-1.5 text-stone-500 hover:text-[#0A7D32] text-xs font-bold transition-colors cursor-pointer">
              <Plus className="w-3.5 h-3.5" /> Add Benefit
            </button>
          </div>
        </SectionCard>

        <SectionCard title="🎉 Success & Confirmation Messages">
          <InputField label="Distributor ID prefix (e.g. ST → ID becomes ST-123456)" value={data.success_credential_prefix} onChange={s("success_credential_prefix")} />
          <BilingualFields prefix="Success body text" values={[data.success_body_en, data.success_body_fr]} onChange={(l, v) => s(l === "en" ? "success_body_en" : "success_body_fr")(v)} multiline />
          <BilingualFields prefix="Email confirmation note" values={[data.success_email_note_en, data.success_email_note_fr]} onChange={(l, v) => s(l === "en" ? "success_email_note_en" : "success_email_note_fr")(v)} multiline />
        </SectionCard>

        <SectionCard title="🔒 Security Notice">
          <BilingualFields prefix="Security note text (shown on form)" values={[data.security_note_en, data.security_note_fr]} onChange={(l, v) => s(l === "en" ? "security_note_en" : "security_note_fr")(v)} />
        </SectionCard>

        <Btn variant="primary" loading={saving} onClick={save}>{saved ? "✓ All Changes Saved!" : <><Save className="w-3.5 h-3.5" /> Save Distributor Page</>}</Btn>
      </div>
    </PageShell>
  );
}
