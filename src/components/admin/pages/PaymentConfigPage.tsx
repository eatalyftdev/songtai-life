import { useState, useEffect } from "react";
import { CreditCard, Save, Eye, EyeOff, ShieldCheck, Info, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import PageShell, { Card, Btn } from "../shared/PageShell";

function InputField({ label, value, onChange, type = "text", placeholder = "" }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="text-stone-400 text-xs block mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32] transition-colors font-mono"
      />
    </div>
  );
}

function SecretField({ label, value, onChange, placeholder = "" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="text-stone-400 text-xs block mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 pr-10 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32] transition-colors font-mono"
        />
        <button type="button" onClick={() => setShow(v => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 cursor-pointer">
          {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      </div>
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

interface PaymentSettings {
  mesomb_api_key: string;
  mesomb_application_key: string;
  mesomb_webhook_secret: string;
  mesomb_currency: string;
  mesomb_country: string;
  mesomb_service: string;
  payment_mode: string;
  webhook_url_override: string;
}

const DEFAULTS: PaymentSettings = {
  mesomb_api_key: "",
  mesomb_application_key: "",
  mesomb_webhook_secret: "",
  mesomb_currency: "XAF",
  mesomb_country: "CM",
  mesomb_service: "MTN,ORANGE",
  payment_mode: "live",
  webhook_url_override: "",
};

async function loadSettings(): Promise<Partial<PaymentSettings>> {
  const keys = Object.keys(DEFAULTS);
  const { data } = await supabase.from("site_settings").select("key,value").in("key", keys);
  if (!data) return {};
  const map: Record<string, string> = {};
  data.forEach((r: { key: string; value: string }) => { map[r.key] = r.value; });
  return map as Partial<PaymentSettings>;
}

async function saveSettings(settings: PaymentSettings) {
  const rows = Object.entries(settings).map(([key, value]) => ({ key, value: String(value) }));
  const { error } = await supabase.from("site_settings").upsert(rows, { onConflict: "key" });
  return error;
}

export default function PaymentConfigPage() {
  const [data, setData] = useState<PaymentSettings>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings().then(loaded => setData(d => ({ ...d, ...loaded })));
  }, []);

  const s = (k: keyof PaymentSettings) => (v: string) => setData(d => ({ ...d, [k]: v }));

  const save = async () => {
    setSaving(true);
    const err = await saveSettings(data);
    setSaving(false);
    if (!err) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
  };

  const devDomain = typeof window !== "undefined" ? window.location.origin : "https://your-app.replit.app";
  const webhookUrl = data.webhook_url_override || `${devDomain}/api/payment/webhook`;

  return (
    <PageShell
      title="Payment Configuration"
      subtitle="Manage MeSomb Mobile Money payment gateway settings — MTN MoMo & Orange Money"
      actions={<div className="flex items-center gap-2 text-stone-500 text-xs"><ShieldCheck className="w-4 h-4 text-[#0A7D32]" /><span>Settings stored securely in Supabase</span></div>}
    >
      <div className="space-y-4">
        <Card>
          <div className="p-5 flex items-start gap-3">
            <Info className="w-4 h-4 text-[#C9A227] flex-shrink-0 mt-0.5" />
            <p className="text-stone-400 text-xs leading-relaxed">
              These settings configure the <span className="text-white font-semibold">MeSomb payment gateway</span> used for all Mobile Money transactions (product purchases and distributor registration fees). 
              Changes take effect on the next payment request. Ensure your MeSomb account is active and the webhook URL is registered in your MeSomb dashboard.
            </p>
          </div>
        </Card>

        <SectionCard title="🔑 MeSomb API Credentials">
          <div className="p-4 bg-amber-950/20 border border-amber-900/30 rounded-xl text-amber-400/80 text-[11px] leading-relaxed">
            <strong>Security note:</strong> API keys are stored in your Supabase database and are only read server-side. Never share these keys publicly. For production, consider also setting them as environment variables (<code className="font-mono text-[10px] bg-stone-900 px-1.5 py-0.5 rounded">MESOMB_API_KEY</code>, <code className="font-mono text-[10px] bg-stone-900 px-1.5 py-0.5 rounded">MESOMB_APPLICATION_KEY</code>).
          </div>
          <SecretField label="MeSomb API Key" value={data.mesomb_api_key} onChange={s("mesomb_api_key")} placeholder="your-mesomb-api-key" />
          <SecretField label="MeSomb Application Key" value={data.mesomb_application_key} onChange={s("mesomb_application_key")} placeholder="your-application-key" />
          <SecretField label="Webhook Secret (HMAC-SHA256 signing key)" value={data.mesomb_webhook_secret} onChange={s("mesomb_webhook_secret")} placeholder="your-webhook-secret" />
        </SectionCard>

        <SectionCard title="⚙️ Gateway Settings">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <InputField label="Currency" value={data.mesomb_currency} onChange={s("mesomb_currency")} placeholder="XAF" />
            <InputField label="Country code" value={data.mesomb_country} onChange={s("mesomb_country")} placeholder="CM" />
            <div>
              <label className="text-stone-400 text-xs block mb-1.5">Payment mode</label>
              <select
                value={data.payment_mode}
                onChange={e => s("payment_mode")(e.target.value)}
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32] cursor-pointer"
              >
                <option value="live">Live (Real transactions)</option>
                <option value="sandbox">Sandbox (Test mode)</option>
              </select>
            </div>
          </div>
          <InputField label="Enabled services (comma-separated: MTN,ORANGE)" value={data.mesomb_service} onChange={s("mesomb_service")} placeholder="MTN,ORANGE" />
        </SectionCard>

        <SectionCard title="🔗 Webhook Configuration">
          <div className="space-y-3">
            <div>
              <label className="text-stone-400 text-xs block mb-1.5">Current Webhook Endpoint (auto-detected)</label>
              <div className="px-3 py-2 bg-stone-950 border border-stone-700 rounded-xl text-emerald-400 text-xs font-mono break-all">
                {webhookUrl}
              </div>
            </div>
            <p className="text-stone-500 text-[11px]">
              Register the webhook URL above in your <a href="https://mesomb.hachther.com" target="_blank" rel="noopener noreferrer" className="text-[#C9A227] underline">MeSomb Dashboard → Application Settings → Webhook URL</a>. 
              The server validates webhook signatures using HMAC-SHA256 with your Webhook Secret above.
            </p>
            <InputField
              label="Override webhook URL (optional, if using a custom domain)"
              value={data.webhook_url_override}
              onChange={s("webhook_url_override")}
              placeholder="https://yourdomain.com/api/payment/webhook"
            />
          </div>
        </SectionCard>

        <SectionCard title="📊 Payment Flow Overview">
          <div className="space-y-2 text-xs text-stone-400 leading-relaxed">
            {[
              "1. Customer selects items → clicks Checkout → enters phone number",
              "2. Server calls MeSomb API to initiate a USSD payment push to customer's phone",
              "3. Customer enters their Mobile Money PIN on their handset",
              "4. MeSomb sends a webhook callback to /api/payment/webhook with transaction status",
              "5. Server validates HMAC-SHA256 signature → marks order as paid in Supabase",
              "6. Customer sees success confirmation; distributors receive commission credits",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[#C9A227] font-mono text-[10px] flex-shrink-0 w-4">{i + 1}.</span>
                <span>{step.replace(/^\d+\.\s/, "")}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <Btn variant="primary" loading={saving} onClick={save}>{saved ? "✓ Payment Config Saved!" : <><Save className="w-3.5 h-3.5" /> Save Payment Configuration</>}</Btn>
      </div>
    </PageShell>
  );
}
