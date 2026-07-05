import { useState, useEffect, type ReactNode } from "react";
import { Phone, Save, ChevronDown, ChevronUp } from "lucide-react";
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

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
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

interface ContactPageData {
  tagline_en: string; tagline_fr: string;
  headline_en: string; headline_fr: string;
  intro_en: string; intro_fr: string;
  office_yaounde_en: string; office_yaounde_fr: string;
  office_douala_en: string; office_douala_fr: string;
  phone_primary: string; phone_secondary: string;
  email_support: string;
  whatsapp_number: string;
  whatsapp_message_en: string; whatsapp_message_fr: string;
  hours_en: string; hours_fr: string;
}

const DEFAULTS: ContactPageData = {
  tagline_en: "Get In Touch", tagline_fr: "Contactez-Nous",
  headline_en: "Contact Our Offices", headline_fr: "Contacter Nos Bureaux",
  intro_en: "Have questions about our botanical lines or unilevel commission structures? Send us a direct message or stop by our physical offices.",
  intro_fr: "Des questions sur nos gammes botaniques ou nos structures de commission ? Envoyez-nous un message ou passez dans nos bureaux.",
  office_yaounde_en: "Avenue Kennedy, Near Boulangerie Calafatas, Yaoundé, Cameroon",
  office_yaounde_fr: "Avenue Kennedy, Près de la Boulangerie Calafatas, Yaoundé, Cameroun",
  office_douala_en: "Rue Akwa, Opposite Pharmacie du Centre, Douala, Cameroon",
  office_douala_fr: "Rue Akwa, En face de la Pharmacie du Centre, Douala, Cameroun",
  phone_primary: "+237 655 000 000",
  phone_secondary: "+237 222 111 222",
  email_support: "support@songtailife.com",
  whatsapp_number: "237655000000",
  whatsapp_message_en: "Hello Songtai Life, I would like to inquire about becoming a distributor.",
  whatsapp_message_fr: "Bonjour Songtai Life, je souhaite des informations pour devenir distributeur.",
  hours_en: "Mon – Fri: 8:00 AM – 6:00 PM | Sat: 9:00 AM – 2:00 PM",
  hours_fr: "Lun – Ven : 8h00 – 18h00 | Sam : 9h00 – 14h00",
};

export default function ContactInfoPage() {
  const [data, setData] = useState<ContactPageData>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase.from("homepage_sections").select("content").eq("section_key", "page_contact").maybeSingle()
      .then(({ data: row }) => { if (row?.content) setData(d => ({ ...d, ...row.content as Partial<ContactPageData> })); });
  }, []);

  const s = (k: keyof ContactPageData) => (v: string) => setData(d => ({ ...d, [k]: v }));

  const save = async () => {
    setSaving(true);
    await upsertSection("page_contact", data);
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500);
  };

  return (
    <PageShell
      title="Contact Page Editor"
      subtitle="Edit the public Contact page content — addresses, phone, email, WhatsApp"
      actions={<div className="flex items-center gap-2 text-stone-500 text-xs"><Phone className="w-4 h-4" /><span>Changes go live instantly via Realtime</span></div>}
    >
      <div className="space-y-4">
        <SectionCard title="📝 Page Header">
          <BilingualFields prefix="Tag line" values={[data.tagline_en, data.tagline_fr]} onChange={(l, v) => s(l === "en" ? "tagline_en" : "tagline_fr")(v)} />
          <BilingualFields prefix="Headline" values={[data.headline_en, data.headline_fr]} onChange={(l, v) => s(l === "en" ? "headline_en" : "headline_fr")(v)} />
          <BilingualFields prefix="Intro paragraph" values={[data.intro_en, data.intro_fr]} onChange={(l, v) => s(l === "en" ? "intro_en" : "intro_fr")(v)} multiline />
        </SectionCard>

        <SectionCard title="🏢 Office Addresses">
          <BilingualFields prefix="Yaoundé office address" values={[data.office_yaounde_en, data.office_yaounde_fr]} onChange={(l, v) => s(l === "en" ? "office_yaounde_en" : "office_yaounde_fr")(v)} multiline />
          <BilingualFields prefix="Douala office address" values={[data.office_douala_en, data.office_douala_fr]} onChange={(l, v) => s(l === "en" ? "office_douala_en" : "office_douala_fr")(v)} multiline />
          <BilingualFields prefix="Office hours" values={[data.hours_en, data.hours_fr]} onChange={(l, v) => s(l === "en" ? "hours_en" : "hours_fr")(v)} />
        </SectionCard>

        <SectionCard title="📞 Phone & Email">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InputField label="Primary phone" value={data.phone_primary} onChange={s("phone_primary")} />
            <InputField label="Secondary phone" value={data.phone_secondary} onChange={s("phone_secondary")} />
            <InputField label="Support email" value={data.email_support} onChange={s("email_support")} />
          </div>
        </SectionCard>

        <SectionCard title="💬 WhatsApp Settings">
          <InputField label="WhatsApp number (digits only, incl. country code e.g. 237655000000)" value={data.whatsapp_number} onChange={s("whatsapp_number")} />
          <BilingualFields prefix="Pre-filled WhatsApp message" values={[data.whatsapp_message_en, data.whatsapp_message_fr]} onChange={(l, v) => s(l === "en" ? "whatsapp_message_en" : "whatsapp_message_fr")(v)} multiline />
        </SectionCard>

        <Btn variant="primary" loading={saving} onClick={save}>{saved ? "✓ All Changes Saved!" : <><Save className="w-3.5 h-3.5" /> Save Contact Page</>}</Btn>
      </div>
    </PageShell>
  );
}
