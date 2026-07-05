import { useState, useEffect } from "react";
import { BookOpen, Save, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
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

function useSectionData(key: string, defaults: Record<string, unknown>) {
  const [data, setData] = useState(defaults);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase.from("homepage_sections").select("content").eq("section_key", key).maybeSingle()
      .then(({ data: row }) => { if (row?.content) setData(d => ({ ...d, ...row.content as Record<string, unknown> })); });
  }, [key]);

  const save = async () => {
    setSaving(true);
    const err = await upsertSection(key, data);
    setSaving(false);
    if (!err) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
  };

  return { data, setData, saving, saved, save };
}

interface TeamMember { name: string; role_en: string; role_fr: string; desc_en: string; desc_fr: string; image: string; }
interface Cert { label_en: string; label_fr: string; sub_en: string; sub_fr: string; }

function HeroSection() {
  const { data, setData, saving, saved, save } = useSectionData("page_our_story", {
    tagline_en: "About Songtai Life", tagline_fr: "À Propos de Songtai Life",
    headline_en: "Empowering Through Science, Sourcing Locally",
    headline_fr: "Autonomiser par la Science, Sourcer Localement",
    intro_en: "Our mission is to engineer West Africa's most respected wellness brand, transforming biological resources into sovereign streams of health and economic security.",
    intro_fr: "Notre mission est de bâtir la marque de bien-être la plus respectée d'Afrique de l'Ouest.",
  });
  const s = (k: string) => (v: string) => setData(d => ({ ...d, [k]: v }));
  return (
    <SectionCard title="🦸 Page Hero / Header">
      <BilingualFields prefix="Tag line" values={[data.tagline_en as string, data.tagline_fr as string]} onChange={(l, v) => s(l === "en" ? "tagline_en" : "tagline_fr")(v)} />
      <BilingualFields prefix="Headline" values={[data.headline_en as string, data.headline_fr as string]} onChange={(l, v) => s(l === "en" ? "headline_en" : "headline_fr")(v)} />
      <BilingualFields prefix="Intro paragraph" values={[data.intro_en as string, data.intro_fr as string]} onChange={(l, v) => s(l === "en" ? "intro_en" : "intro_fr")(v)} multiline />
      <Btn variant="primary" loading={saving} onClick={save}>{saved ? "✓ Saved!" : <><Save className="w-3.5 h-3.5" /> Save Header</>}</Btn>
    </SectionCard>
  );
}

function StorySection() {
  const { data, setData, saving, saved, save } = useSectionData("page_our_story_body", {
    story1_en: "", story1_fr: "", story2_en: "", story2_fr: "",
    mission_en: "", mission_fr: "", vision_en: "", vision_fr: "",
    image_url: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&q=80&w=600",
  });
  const s = (k: string) => (v: string) => setData(d => ({ ...d, [k]: v }));
  return (
    <SectionCard title="📖 Our Story & Mission/Vision">
      <BilingualFields prefix="Story paragraph 1" values={[data.story1_en as string, data.story1_fr as string]} onChange={(l, v) => s(l === "en" ? "story1_en" : "story1_fr")(v)} multiline />
      <BilingualFields prefix="Story paragraph 2" values={[data.story2_en as string, data.story2_fr as string]} onChange={(l, v) => s(l === "en" ? "story2_en" : "story2_fr")(v)} multiline />
      <InputField label="Story section image URL" value={data.image_url as string} onChange={s("image_url")} />
      <p className="text-stone-500 text-xs font-semibold pt-2">Mission & Vision</p>
      <BilingualFields prefix="Mission text" values={[data.mission_en as string, data.mission_fr as string]} onChange={(l, v) => s(l === "en" ? "mission_en" : "mission_fr")(v)} multiline />
      <BilingualFields prefix="Vision text" values={[data.vision_en as string, data.vision_fr as string]} onChange={(l, v) => s(l === "en" ? "vision_en" : "vision_fr")(v)} multiline />
      <Btn variant="primary" loading={saving} onClick={save}>{saved ? "✓ Saved!" : <><Save className="w-3.5 h-3.5" /> Save Story</>}</Btn>
    </SectionCard>
  );
}

function TeamSection() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase.from("homepage_sections").select("content").eq("section_key", "page_our_story_team").maybeSingle()
      .then(({ data: row }) => {
        const c = row?.content as { members?: TeamMember[] } | undefined;
        if (c?.members?.length) setMembers(c.members);
        else setMembers([
          { name: "Dr. Elena Ndip", role_en: "Chief Medical & Botanical Officer", role_fr: "Directrice Médicale", desc_en: "Over 18 years of clinical pharmacology, specializes in phytomedicine research.", desc_fr: "", image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=300" },
        ]);
      });
  }, []);

  const update = (i: number, k: keyof TeamMember, v: string) =>
    setMembers(prev => prev.map((m, idx) => idx === i ? { ...m, [k]: v } : m));
  const add = () => setMembers(p => [...p, { name: "", role_en: "", role_fr: "", desc_en: "", desc_fr: "", image: "" }]);
  const remove = (i: number) => setMembers(p => p.filter((_, idx) => idx !== i));

  const save = async () => {
    setSaving(true);
    await upsertSection("page_our_story_team", { members });
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500);
  };

  return (
    <SectionCard title="👥 Leadership Team">
      <div className="space-y-4">
        {members.map((m, i) => (
          <div key={i} className="p-4 bg-stone-900/60 border border-stone-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-stone-500 text-xs font-bold">Member {i + 1}</span>
              <button type="button" onClick={() => remove(i)} className="text-stone-600 hover:text-red-400 transition-colors cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
            <InputField label="Full Name" value={m.name} onChange={v => update(i, "name", v)} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InputField label="Role (EN)" value={m.role_en} onChange={v => update(i, "role_en", v)} />
              <InputField label="Role (FR)" value={m.role_fr} onChange={v => update(i, "role_fr", v)} />
              <InputField label="Bio (EN)" value={m.desc_en} onChange={v => update(i, "desc_en", v)} multiline />
              <InputField label="Bio (FR)" value={m.desc_fr} onChange={v => update(i, "desc_fr", v)} multiline />
            </div>
            <InputField label="Photo URL" value={m.image} onChange={v => update(i, "image", v)} />
          </div>
        ))}
        <button type="button" onClick={add} className="flex items-center gap-1.5 text-stone-500 hover:text-[#0A7D32] text-xs font-bold transition-colors cursor-pointer">
          <Plus className="w-3.5 h-3.5" /> Add Team Member
        </button>
      </div>
      <Btn variant="primary" loading={saving} onClick={save}>{saved ? "✓ Saved!" : <><Save className="w-3.5 h-3.5" /> Save Team</>}</Btn>
    </SectionCard>
  );
}

function CertificationsSection() {
  const [certs, setCerts] = useState<Cert[]>([
    { label_en: "MINSANTE Approved", label_fr: "Approuvé MINSANTE", sub_en: "Ministry of Public Health Cameroon", sub_fr: "Ministère de la Santé Publique" },
    { label_en: "100% Organic Sourcing", label_fr: "100% Bio", sub_en: "Biological chemical-free crops", sub_fr: "Cultures biologiques sans produits chimiques" },
    { label_en: "HALAL Certified", label_fr: "Certifié HALAL", sub_en: "Pure processing standards", sub_fr: "Normes de traitement pures" },
    { label_en: "ISO 9001 Compliant", label_fr: "Conforme ISO 9001", sub_en: "Global quality frameworks", sub_fr: "Cadres de qualité mondiaux" },
  ]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase.from("homepage_sections").select("content").eq("section_key", "page_our_story_certs").maybeSingle()
      .then(({ data: row }) => {
        const c = row?.content as { certs?: Cert[] } | undefined;
        if (c?.certs?.length) setCerts(c.certs);
      });
  }, []);

  const update = (i: number, k: keyof Cert, v: string) =>
    setCerts(prev => prev.map((c, idx) => idx === i ? { ...c, [k]: v } : c));
  const add = () => setCerts(p => [...p, { label_en: "", label_fr: "", sub_en: "", sub_fr: "" }]);
  const remove = (i: number) => setCerts(p => p.filter((_, idx) => idx !== i));

  const save = async () => {
    setSaving(true);
    await upsertSection("page_our_story_certs", { certs });
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500);
  };

  return (
    <SectionCard title="🏅 Certifications">
      <div className="space-y-3">
        {certs.map((c, i) => (
          <div key={i} className="p-4 bg-stone-900/60 border border-stone-800 rounded-xl space-y-3">
            <div className="flex justify-between">
              <span className="text-stone-500 text-xs font-bold">Cert {i + 1}</span>
              <button type="button" onClick={() => remove(i)} className="text-stone-600 hover:text-red-400 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InputField label="Label (EN)" value={c.label_en} onChange={v => update(i, "label_en", v)} />
              <InputField label="Label (FR)" value={c.label_fr} onChange={v => update(i, "label_fr", v)} />
              <InputField label="Sub-label (EN)" value={c.sub_en} onChange={v => update(i, "sub_en", v)} />
              <InputField label="Sub-label (FR)" value={c.sub_fr} onChange={v => update(i, "sub_fr", v)} />
            </div>
          </div>
        ))}
        <button type="button" onClick={add} className="flex items-center gap-1.5 text-stone-500 hover:text-[#0A7D32] text-xs font-bold transition-colors cursor-pointer">
          <Plus className="w-3.5 h-3.5" /> Add Certification
        </button>
      </div>
      <Btn variant="primary" loading={saving} onClick={save}>{saved ? "✓ Saved!" : <><Save className="w-3.5 h-3.5" /> Save Certs</>}</Btn>
    </SectionCard>
  );
}

export default function OurStoryPage() {
  return (
    <PageShell title="Our Story Editor" subtitle="Edit the public 'About / Our Story' page — changes go live instantly">
      <div className="space-y-4">
        <HeroSection />
        <StorySection />
        <TeamSection />
        <CertificationsSection />
      </div>
    </PageShell>
  );
}
