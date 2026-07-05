import React, { useState, useEffect, useCallback } from "react";
import { LayoutTemplate, Save, Loader2, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import PageShell, { Card, Btn } from "../shared/PageShell";

// ── Types ──────────────────────────────────────────────────────────────────

interface HeroContent {
  headline_en: string; headline_fr: string;
  subheadline_en: string; subheadline_fr: string;
  cta_primary_en: string; cta_primary_fr: string;
  cta_secondary_en: string; cta_secondary_fr: string;
}

interface CompanyIntroContent {
  story_en: string; story_fr: string;
  stat_countries: number; stat_members: number;
  stat_products: number; stat_years: number; stat_awards: number;
}

interface OppStep {
  label_en: string; label_fr: string;
  desc_en: string; desc_fr: string;
}

interface BenefitItem {
  icon: string; title_en: string; title_fr: string;
  desc_en: string; desc_fr: string;
}

interface BenefitsContent {
  headline_en: string; headline_fr: string;
  sub_en: string; sub_fr: string;
  items: BenefitItem[];
}

interface NewsletterContent {
  headline_en: string; headline_fr: string;
  body_en: string; body_fr: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function InputField({
  label, value, onChange, multiline = false,
}: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean }) {
  const cls = "w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32] transition-colors";
  return (
    <div>
      <label className="text-stone-400 text-xs block mb-1.5">{label}</label>
      {multiline ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} rows={3} className={`${cls} resize-none`} />
      ) : (
        <input value={value} onChange={e => onChange(e.target.value)} className={cls} />
      )}
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

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <span className="text-white font-bold text-sm">{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-stone-500" /> : <ChevronDown className="w-4 h-4 text-stone-500" />}
      </button>
      {open && <div className="px-5 pb-5 space-y-4 border-t border-stone-800 pt-4">{children}</div>}
    </Card>
  );
}

function BilingualFields({
  prefix, labels, values, onChange, multiline = false,
}: {
  prefix: string;
  labels: [string, string];
  values: [string, string];
  onChange: (lang: "en" | "fr", v: string) => void;
  multiline?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <InputField label={`${prefix} (EN) — ${labels[0]}`} value={values[0]} onChange={v => onChange("en", v)} multiline={multiline} />
      <InputField label={`${prefix} (FR) — ${labels[1]}`} value={values[1]} onChange={v => onChange("fr", v)} multiline={multiline} />
    </div>
  );
}

// ── Upsert helper ──────────────────────────────────────────────────────────

async function upsertSection(key: string, content: unknown) {
  const { error } = await supabase
    .from("homepage_sections")
    .upsert({ section_key: key, content, updated_at: new Date().toISOString() }, { onConflict: "section_key" });
  return error;
}

// ── Sub-section components ─────────────────────────────────────────────────

function HeroSection() {
  const [data, setData] = useState<HeroContent>({
    headline_en: "", headline_fr: "", subheadline_en: "", subheadline_fr: "",
    cta_primary_en: "", cta_primary_fr: "", cta_secondary_en: "", cta_secondary_fr: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase.from("homepage_sections").select("content").eq("section_key", "hero").maybeSingle()
      .then(({ data: row }) => { if (row?.content) setData(d => ({ ...d, ...row.content as Partial<HeroContent> })); });
  }, []);

  const set = (k: keyof HeroContent) => (v: string) => setData(d => ({ ...d, [k]: v }));

  const save = async () => {
    setSaving(true);
    const err = await upsertSection("hero", data);
    setSaving(false);
    if (!err) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
  };

  return (
    <SectionCard title="🦸 Hero Section">
      <BilingualFields prefix="Headline" labels={["Headline", "Titre"]} values={[data.headline_en, data.headline_fr]}
        onChange={(l, v) => set(l === "en" ? "headline_en" : "headline_fr")(v)} />
      <BilingualFields prefix="Sub-headline" labels={["Sub-headline", "Sous-titre"]} values={[data.subheadline_en, data.subheadline_fr]}
        onChange={(l, v) => set(l === "en" ? "subheadline_en" : "subheadline_fr")(v)} />
      <BilingualFields prefix="Primary CTA" labels={["Button text", "Texte bouton"]} values={[data.cta_primary_en, data.cta_primary_fr]}
        onChange={(l, v) => set(l === "en" ? "cta_primary_en" : "cta_primary_fr")(v)} />
      <BilingualFields prefix="Secondary CTA" labels={["Button text", "Texte bouton"]} values={[data.cta_secondary_en, data.cta_secondary_fr]}
        onChange={(l, v) => set(l === "en" ? "cta_secondary_en" : "cta_secondary_fr")(v)} />
      <Btn variant="primary" loading={saving} onClick={save}>
        {saved ? "✓ Saved!" : <><Save className="w-3.5 h-3.5" /> Save Hero</>}
      </Btn>
    </SectionCard>
  );
}

function CompanyIntroSection() {
  const [data, setData] = useState<CompanyIntroContent>({
    story_en: "", story_fr: "", stat_countries: 12, stat_members: 42800,
    stat_products: 24, stat_years: 8, stat_awards: 15,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase.from("homepage_sections").select("content").eq("section_key", "company_intro").maybeSingle()
      .then(({ data: row }) => { if (row?.content) setData(d => ({ ...d, ...row.content as Partial<CompanyIntroContent> })); });
  }, []);

  const set = (k: keyof CompanyIntroContent) => (v: string | number) =>
    setData(d => ({ ...d, [k]: v }));

  const save = async () => {
    setSaving(true);
    const err = await upsertSection("company_intro", data);
    setSaving(false);
    if (!err) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
  };

  return (
    <SectionCard title="🏢 Company Introduction & Stats">
      <BilingualFields prefix="Story paragraph" labels={["Story (EN)", "Histoire (FR)"]}
        values={[data.story_en, data.story_fr]}
        onChange={(l, v) => set(l === "en" ? "story_en" : "story_fr")(v)} multiline />
      <p className="text-stone-500 text-xs pt-2 font-semibold">Stat Counter Values</p>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <NumberField label="Countries" value={data.stat_countries} onChange={set("stat_countries")} />
        <NumberField label="Members" value={data.stat_members} onChange={set("stat_members")} />
        <NumberField label="Products" value={data.stat_products} onChange={set("stat_products")} />
        <NumberField label="Years Active" value={data.stat_years} onChange={set("stat_years")} />
        <NumberField label="Awards" value={data.stat_awards} onChange={set("stat_awards")} />
      </div>
      <Btn variant="primary" loading={saving} onClick={save}>
        {saved ? "✓ Saved!" : <><Save className="w-3.5 h-3.5" /> Save Company Intro</>}
      </Btn>
    </SectionCard>
  );
}

function OpportunitySection() {
  const [steps, setSteps] = useState<OppStep[]>([
    { label_en: "Join", label_fr: "Rejoindre", desc_en: "", desc_fr: "" },
    { label_en: "Grow", label_fr: "Grandir", desc_en: "", desc_fr: "" },
    { label_en: "Lead", label_fr: "Diriger", desc_en: "", desc_fr: "" },
    { label_en: "Earn", label_fr: "Gagner", desc_en: "", desc_fr: "" },
  ]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase.from("homepage_sections").select("content").eq("section_key", "opportunity").maybeSingle()
      .then(({ data: row }) => {
        const c = row?.content as { steps?: OppStep[] } | undefined;
        if (c?.steps && c.steps.length > 0) setSteps(c.steps);
      });
  }, []);

  const updateStep = (i: number, k: keyof OppStep, v: string) =>
    setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, [k]: v } : s));
  const addStep = () => setSteps(p => [...p, { label_en: "", label_fr: "", desc_en: "", desc_fr: "" }]);
  const removeStep = (i: number) => setSteps(p => p.filter((_, idx) => idx !== i));

  const save = async () => {
    setSaving(true);
    const err = await upsertSection("opportunity", { steps });
    setSaving(false);
    if (!err) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
  };

  return (
    <SectionCard title="⏱ Opportunity Timeline Steps">
      <div className="space-y-4">
        {steps.map((step, i) => (
          <div key={i} className="p-4 bg-stone-900/60 border border-stone-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-stone-500 text-xs font-bold">Step {String(i + 1).padStart(2, "0")}</span>
              <button type="button" onClick={() => removeStep(i)} className="text-stone-600 hover:text-red-400 transition-colors cursor-pointer">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InputField label="Label (EN)" value={step.label_en} onChange={v => updateStep(i, "label_en", v)} />
              <InputField label="Label (FR)" value={step.label_fr} onChange={v => updateStep(i, "label_fr", v)} />
              <InputField label="Description (EN)" value={step.desc_en} onChange={v => updateStep(i, "desc_en", v)} multiline />
              <InputField label="Description (FR)" value={step.desc_fr} onChange={v => updateStep(i, "desc_fr", v)} multiline />
            </div>
          </div>
        ))}
        <button type="button" onClick={addStep}
          className="flex items-center gap-1.5 text-stone-500 hover:text-[#0A7D32] text-xs font-bold transition-colors cursor-pointer">
          <Plus className="w-3.5 h-3.5" /> Add Step
        </button>
      </div>
      <Btn variant="primary" loading={saving} onClick={save}>
        {saved ? "✓ Saved!" : <><Save className="w-3.5 h-3.5" /> Save Timeline</>}
      </Btn>
    </SectionCard>
  );
}

function BenefitsSection() {
  const [data, setData] = useState<BenefitsContent>({
    headline_en: "Why Join Songtai Life?", headline_fr: "Pourquoi Rejoindre Songtai Life ?",
    sub_en: "", sub_fr: "", items: [],
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase.from("homepage_sections").select("content").eq("section_key", "benefits").maybeSingle()
      .then(({ data: row }) => { if (row?.content) setData(d => ({ ...d, ...row.content as Partial<BenefitsContent> })); });
  }, []);

  const set = (k: keyof BenefitsContent) => (v: string | BenefitItem[]) => setData(d => ({ ...d, [k]: v }));
  const updateItem = (i: number, k: keyof BenefitItem, v: string) =>
    setData(d => ({ ...d, items: d.items.map((it, idx) => idx === i ? { ...it, [k]: v } : it) }));
  const addItem = () => setData(d => ({ ...d, items: [...d.items, { icon: "Award", title_en: "", title_fr: "", desc_en: "", desc_fr: "" }] }));
  const removeItem = (i: number) => setData(d => ({ ...d, items: d.items.filter((_, idx) => idx !== i) }));

  const save = async () => {
    setSaving(true);
    const err = await upsertSection("benefits", data);
    setSaving(false);
    if (!err) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
  };

  return (
    <SectionCard title="⭐ Distributor Benefits">
      <BilingualFields prefix="Section headline" labels={["Headline", "Titre"]}
        values={[data.headline_en, data.headline_fr]}
        onChange={(l, v) => set(l === "en" ? "headline_en" : "headline_fr")(v)} />
      <BilingualFields prefix="Sub-text" labels={["Sub-text", "Sous-texte"]}
        values={[data.sub_en, data.sub_fr]}
        onChange={(l, v) => set(l === "en" ? "sub_en" : "sub_fr")(v)} multiline />
      <p className="text-stone-500 text-xs pt-2 font-semibold">Benefit Cards</p>
      <div className="space-y-4">
        {data.items.map((item, i) => (
          <div key={i} className="p-4 bg-stone-900/60 border border-stone-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-stone-500 text-xs font-bold">Card {i + 1}</span>
              <button type="button" onClick={() => removeItem(i)} className="text-stone-600 hover:text-red-400 transition-colors cursor-pointer">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <InputField label="Icon name (Award / TrendingUp / Users / Star etc.)" value={item.icon} onChange={v => updateItem(i, "icon", v)} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InputField label="Title (EN)" value={item.title_en} onChange={v => updateItem(i, "title_en", v)} />
              <InputField label="Title (FR)" value={item.title_fr} onChange={v => updateItem(i, "title_fr", v)} />
              <InputField label="Description (EN)" value={item.desc_en} onChange={v => updateItem(i, "desc_en", v)} multiline />
              <InputField label="Description (FR)" value={item.desc_fr} onChange={v => updateItem(i, "desc_fr", v)} multiline />
            </div>
          </div>
        ))}
        <button type="button" onClick={addItem}
          className="flex items-center gap-1.5 text-stone-500 hover:text-[#0A7D32] text-xs font-bold transition-colors cursor-pointer">
          <Plus className="w-3.5 h-3.5" /> Add Benefit Card
        </button>
      </div>
      <Btn variant="primary" loading={saving} onClick={save}>
        {saved ? "✓ Saved!" : <><Save className="w-3.5 h-3.5" /> Save Benefits</>}
      </Btn>
    </SectionCard>
  );
}

function NewsletterSection() {
  const [data, setData] = useState<NewsletterContent>({
    headline_en: "", headline_fr: "", body_en: "", body_fr: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase.from("homepage_sections").select("content").eq("section_key", "newsletter").maybeSingle()
      .then(({ data: row }) => { if (row?.content) setData(d => ({ ...d, ...row.content as Partial<NewsletterContent> })); });
  }, []);

  const set = (k: keyof NewsletterContent) => (v: string) => setData(d => ({ ...d, [k]: v }));

  const save = async () => {
    setSaving(true);
    const err = await upsertSection("newsletter", data);
    setSaving(false);
    if (!err) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
  };

  return (
    <SectionCard title="📧 Newsletter Section">
      <BilingualFields prefix="Headline" labels={["Headline", "Titre"]}
        values={[data.headline_en, data.headline_fr]}
        onChange={(l, v) => set(l === "en" ? "headline_en" : "headline_fr")(v)} />
      <BilingualFields prefix="Body text" labels={["Body", "Corps"]}
        values={[data.body_en, data.body_fr]}
        onChange={(l, v) => set(l === "en" ? "body_en" : "body_fr")(v)} multiline />
      <Btn variant="primary" loading={saving} onClick={save}>
        {saved ? "✓ Saved!" : <><Save className="w-3.5 h-3.5" /> Save Newsletter</>}
      </Btn>
    </SectionCard>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function HomepagePage() {
  return (
    <PageShell
      title="Homepage Editor"
      subtitle="Edit every text section on the public homepage — changes go live instantly"
      actions={
        <div className="flex items-center gap-2 text-stone-500 text-xs">
          <LayoutTemplate className="w-4 h-4" />
          <span>All saves publish immediately via Realtime</span>
        </div>
      }
    >
      <div className="space-y-4">
        <HeroSection />
        <CompanyIntroSection />
        <OpportunitySection />
        <BenefitsSection />
        <NewsletterSection />
      </div>
    </PageShell>
  );
}
