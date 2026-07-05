import { useState, useEffect } from "react";
import { Bot, Save, ChevronDown, ChevronUp, Info } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import PageShell, { Card, Btn } from "../shared/PageShell";

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

interface AISettingsData {
  system_prompt: string;
  welcome_message: string;
  suggested_prompts: string;
  enabled: boolean;
}

const DEFAULTS: AISettingsData = {
  system_prompt: "",
  welcome_message: "Bonjour! I'm your Songtai Life wellness guide. I can answer questions about our products, help you understand how to become a distributor, or explain our wellness programs. How can I help you today?",
  suggested_prompts: "What products do you offer?,How do I become a distributor?,Tell me about your wellness programs",
  enabled: true,
};

export default function AISettingsPage() {
  const [data, setData] = useState<AISettingsData>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase.from("homepage_sections").select("content").eq("section_key", "ai_settings").maybeSingle()
      .then(({ data: row }) => { if (row?.content) setData(d => ({ ...d, ...row.content as Partial<AISettingsData> })); });
  }, []);

  const s = (k: keyof AISettingsData) => (v: string | boolean) => setData(d => ({ ...d, [k]: v }));

  const save = async () => {
    setSaving(true);
    await upsertSection("ai_settings", data);
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500);
  };

  const cls = "w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32] transition-colors resize-none";

  return (
    <PageShell
      title="AI Chatbot Settings"
      subtitle="Configure the floating Ask AI widget that appears on all public pages"
      actions={<div className="flex items-center gap-2 text-stone-500 text-xs"><Bot className="w-4 h-4" /><span>Powered by Gemini AI</span></div>}
    >
      <div className="space-y-4">
        <Card>
          <div className="p-5 flex items-start gap-3">
            <Info className="w-4 h-4 text-[#C9A227] flex-shrink-0 mt-0.5" />
            <p className="text-stone-400 text-xs leading-relaxed">
              The <strong className="text-white">Ask AI</strong> floating button appears on all public pages. It automatically loads context from your products catalog and company information. You can override the AI's behavior by providing a custom system prompt below.
            </p>
          </div>
        </Card>

        <SectionCard title="🤖 Chatbot Availability">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => s("enabled")(!data.enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${data.enabled ? "bg-[#0A7D32]" : "bg-stone-700"}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${data.enabled ? "translate-x-6" : "translate-x-1"}`} />
            </button>
            <span className="text-stone-300 text-xs font-medium">{data.enabled ? "Ask AI widget is enabled (visible on public pages)" : "Ask AI widget is disabled (hidden from public)"}</span>
          </div>
        </SectionCard>

        <SectionCard title="💬 Welcome Message">
          <div>
            <label className="text-stone-400 text-xs block mb-1.5">First message shown when chat opens</label>
            <textarea value={data.welcome_message} onChange={e => s("welcome_message")(e.target.value)} rows={3} className={cls} />
          </div>
        </SectionCard>

        <SectionCard title="🔘 Suggested Prompts">
          <div>
            <label className="text-stone-400 text-xs block mb-1.5">Quick prompt buttons (comma-separated, max 4 recommended)</label>
            <textarea value={data.suggested_prompts} onChange={e => s("suggested_prompts")(e.target.value)} rows={2} className={cls} />
            <p className="text-stone-600 text-[11px] mt-1.5">Example: What products do you offer?,How do I become a distributor?,Tell me about wellness programs</p>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <p className="text-stone-500 text-[11px] w-full">Preview:</p>
            {data.suggested_prompts.split(",").filter(Boolean).map((p, i) => (
              <span key={i} className="px-2.5 py-1 bg-stone-900 border border-stone-800 rounded-full text-[10px] text-stone-400 flex items-center gap-1">
                <Bot className="w-3 h-3 text-[#ecc246]" /> {p.trim()}
              </span>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="📋 Custom System Prompt (Advanced)">
          <div>
            <label className="text-stone-400 text-xs block mb-1.5">
              Override AI behavior with a custom system prompt (leave blank to use auto-generated context from your product catalog and company info)
            </label>
            <textarea
              value={data.system_prompt}
              onChange={e => s("system_prompt")(e.target.value)}
              rows={10}
              placeholder="e.g. You are a friendly assistant for Songtai Life, a premium wellness company in Cameroon. Help customers with product questions, distributor registration, and wellness advice. Always respond warmly and in the user's language (English or French). Direct complex queries to +237 655 000 000 via WhatsApp."
              className={cls}
            />
            <p className="text-stone-600 text-[11px] mt-1.5">
              When a custom prompt is provided, it replaces the auto-generated context. The AI will still see conversation history. Include key info: company name, WhatsApp number, office addresses, product highlights.
            </p>
          </div>
        </SectionCard>

        <Btn variant="primary" loading={saving} onClick={save}>{saved ? "✓ AI Settings Saved!" : <><Save className="w-3.5 h-3.5" /> Save AI Settings</>}</Btn>
      </div>
    </PageShell>
  );
}
