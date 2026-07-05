import { useState, useEffect } from "react";
import { Leaf, Save, ChevronDown, ChevronUp } from "lucide-react";
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

interface WellnessHubData {
  tagline_en: string; tagline_fr: string;
  headline_en: string; headline_fr: string;
  description_en: string; description_fr: string;
  seo_title_en: string; seo_title_fr: string;
  seo_desc_en: string; seo_desc_fr: string;
  category_labels: string;
}

const DEFAULTS: WellnessHubData = {
  tagline_en: "Science & News", tagline_fr: "Science & Actualités",
  headline_en: "Wellness Hub & Science", headline_fr: "Hub Bien-être & Science",
  description_en: "Botanical research reviews, entrepreneurship diaries, and MLM expansion strategies.",
  description_fr: "Revues de recherche botanique, carnets d'entrepreneuriat et stratégies d'expansion MLM.",
  seo_title_en: "Wellness Hub & Blog", seo_title_fr: "Hub Bien-être & Blog",
  seo_desc_en: "Botanical research reviews, entrepreneurship diaries, and MLM expansion strategies from Songtai Life.",
  seo_desc_fr: "Revues de recherche botanique et stratégies MLM de Songtai Life.",
  category_labels: "All,Wellness,Nutrition,Business,Research",
};

export default function WellnessHubCMSPage() {
  const [data, setData] = useState<WellnessHubData>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase.from("homepage_sections").select("content").eq("section_key", "page_wellness_hub").maybeSingle()
      .then(({ data: row }) => { if (row?.content) setData(d => ({ ...d, ...row.content as Partial<WellnessHubData> })); });
  }, []);

  const s = (k: keyof WellnessHubData) => (v: string) => setData(d => ({ ...d, [k]: v }));

  const save = async () => {
    setSaving(true);
    await upsertSection("page_wellness_hub", data);
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500);
  };

  return (
    <PageShell
      title="Wellness Hub Editor"
      subtitle="Edit the public Wellness Hub / Blog page header and metadata"
      actions={<div className="flex items-center gap-2 text-stone-500 text-xs"><Leaf className="w-4 h-4" /><span>Blog posts are managed under Blog section</span></div>}
    >
      <div className="space-y-4">
        <SectionCard title="🌿 Page Header">
          <BilingualFields prefix="Tag line (small label above headline)" values={[data.tagline_en, data.tagline_fr]} onChange={(l, v) => s(l === "en" ? "tagline_en" : "tagline_fr")(v)} />
          <BilingualFields prefix="Headline" values={[data.headline_en, data.headline_fr]} onChange={(l, v) => s(l === "en" ? "headline_en" : "headline_fr")(v)} />
          <BilingualFields prefix="Description / sub-heading" values={[data.description_en, data.description_fr]} onChange={(l, v) => s(l === "en" ? "description_en" : "description_fr")(v)} multiline />
        </SectionCard>

        <SectionCard title="🔍 SEO Metadata">
          <BilingualFields prefix="SEO page title (browser tab)" values={[data.seo_title_en, data.seo_title_fr]} onChange={(l, v) => s(l === "en" ? "seo_title_en" : "seo_title_fr")(v)} />
          <BilingualFields prefix="SEO description (Google snippet)" values={[data.seo_desc_en, data.seo_desc_fr]} onChange={(l, v) => s(l === "en" ? "seo_desc_en" : "seo_desc_fr")(v)} multiline />
        </SectionCard>

        <SectionCard title="🏷️ Category Filter Labels">
          <InputField
            label="Category labels (comma-separated, e.g. All,Wellness,Nutrition,Business,Research)"
            value={data.category_labels}
            onChange={s("category_labels")}
          />
          <p className="text-stone-600 text-[11px]">The 'All' category is always shown first. These labels filter posts by their category field in the blog table.</p>
        </SectionCard>

        <Card>
          <div className="p-5">
            <p className="text-stone-400 text-xs mb-4">
              <strong className="text-stone-300">Managing Articles:</strong> Individual blog posts (title, body, images, categories, published date) are managed under the <span className="text-[#C9A227]">Blog</span> section in the sidebar. This page only controls the Wellness Hub page header and metadata.
            </p>
            <Btn variant="primary" loading={saving} onClick={save}>{saved ? "✓ Saved!" : <><Save className="w-3.5 h-3.5" /> Save Wellness Hub Settings</>}</Btn>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
