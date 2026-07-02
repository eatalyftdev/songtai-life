import { useState, FormEvent } from "react";
import { MessageCircle, BarChart3, Share2, Globe, Save, Eye, EyeOff, ExternalLink } from "lucide-react";
import { useSiteSettings, saveSiteSetting } from "../../hooks/useSiteSettings";
import WhatsAppWidget from "../WhatsAppWidget";

interface SettingsTabProps {
  addNotification: (msg: string, type: "success" | "info" | "gold") => void;
}

export default function SettingsTab({ addNotification }: SettingsTabProps) {
  const settings = useSiteSettings();

  // ── WhatsApp state ────────────────────────────────────────────
  const [waEnabled,  setWaEnabled]  = useState(settings.whatsapp.enabled);
  const [waNumber,   setWaNumber]   = useState(settings.whatsapp.number);
  const [waMessage,  setWaMessage]  = useState(settings.whatsapp.default_message);
  const [waLoading,  setWaLoading]  = useState(false);
  const [showWaPreview, setShowWaPreview] = useState(false);

  // ── Analytics state ───────────────────────────────────────────
  const [gaEnabled,  setGaEnabled]  = useState(settings.analytics.enabled);
  const [gtmId,      setGtmId]      = useState(settings.analytics.gtm_id);
  const [ga4Id,      setGa4Id]      = useState(settings.analytics.ga4_id);
  const [gaLoading,  setGaLoading]  = useState(false);

  // ── Socials state ─────────────────────────────────────────────
  const [socials, setSocials] = useState({ ...settings.socials });
  const [socLoading, setSocLoading] = useState(false);

  // ── SEO defaults state ─────────────────────────────────────────
  const [seoTitle, setSeoTitle]   = useState(settings.seoDefaults.site_title);
  const [seoDesc,  setSeoDesc]    = useState(settings.seoDefaults.meta_description);
  const [seoImg,   setSeoImg]     = useState(settings.seoDefaults.og_image_url);
  const [seoLoading, setSeoLoading] = useState(false);

  // ── Helpers ────────────────────────────────────────────────────
  const saveSection = async (
    key: string, value: object,
    setLoading: (b: boolean) => void
  ) => {
    setLoading(true);
    const err = await saveSiteSetting(key, value);
    setLoading(false);
    if (err) addNotification("Failed to save: " + err.message, "info");
    else     addNotification("Settings saved.", "success");
  };

  const handleSaveWhatsApp = async (e: FormEvent) => {
    e.preventDefault();
    await saveSection("whatsapp", { enabled: waEnabled, number: waNumber, default_message: waMessage }, setWaLoading);
  };

  const handleSaveAnalytics = async (e: FormEvent) => {
    e.preventDefault();
    await saveSection("analytics", { enabled: gaEnabled, gtm_id: gtmId, ga4_id: ga4Id }, setGaLoading);
  };

  const handleSaveSocials = async (e: FormEvent) => {
    e.preventDefault();
    await saveSection("socials", socials, setSocLoading);
  };

  const handleSaveSeo = async (e: FormEvent) => {
    e.preventDefault();
    await saveSection("seo_defaults", { site_title: seoTitle, meta_description: seoDesc, og_image_url: seoImg }, setSeoLoading);
  };

  const card = "bg-stone-900 border border-stone-800 rounded-xl p-6 space-y-5";
  const inputCls = "w-full px-3 py-2 bg-stone-950 border border-stone-800 focus:border-[#ecc246] rounded-lg text-sm text-white outline-none";
  const labelCls = "text-stone-400 text-[10px] uppercase font-black block mb-1.5";
  const SaveBtn = ({ loading }: { loading: boolean }) => (
    <button type="submit" disabled={loading}
      className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg cursor-pointer disabled:opacity-60 transition-all">
      {loading
        ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        : <Save className="w-3.5 h-3.5" />}
      Save
    </button>
  );

  const SOCIAL_FIELDS: { key: keyof typeof socials; label: string; placeholder: string }[] = [
    { key: "facebook",  label: "Facebook URL",  placeholder: "https://facebook.com/songtailife" },
    { key: "instagram", label: "Instagram URL", placeholder: "https://instagram.com/songtailife" },
    { key: "tiktok",    label: "TikTok URL",    placeholder: "https://tiktok.com/@songtailife" },
    { key: "youtube",   label: "YouTube URL",   placeholder: "https://youtube.com/@songtailife" },
    { key: "linkedin",  label: "LinkedIn URL",  placeholder: "https://linkedin.com/company/songtailife" },
    { key: "whatsapp",  label: "WhatsApp URL",  placeholder: "https://wa.me/237655000000" },
  ];

  return (
    <div className="space-y-8 text-left animate-fade-in">
      <div>
        <h3 className="font-extrabold text-lg text-stone-100">Site Settings</h3>
        <p className="text-xs text-stone-500">Changes take effect site-wide in real time — no redeploy needed.</p>
      </div>

      {/* ── WhatsApp ───────────────────────────────────────────── */}
      <form onSubmit={handleSaveWhatsApp} className={card}>
        <div className="flex items-center gap-2 pb-3 border-b border-stone-800">
          <MessageCircle className="w-4 h-4 text-green-400" />
          <h4 className="font-bold text-sm text-stone-100">WhatsApp Floating Button</h4>
        </div>
        <label className="flex items-center gap-3 cursor-pointer">
          <div className={`w-10 h-5 rounded-full relative transition-colors ${waEnabled ? "bg-green-500" : "bg-stone-700"}`}
            onClick={() => setWaEnabled(v => !v)}>
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${waEnabled ? "left-5" : "left-0.5"}`} />
          </div>
          <span className="text-sm text-stone-300">{waEnabled ? "Enabled — visible to visitors" : "Disabled — hidden from visitors"}</span>
        </label>
        <div>
          <label className={labelCls}>Phone Number (E.164 format)</label>
          <input type="text" value={waNumber} onChange={e => setWaNumber(e.target.value)}
            placeholder="+237655000000" className={inputCls} />
          <p className="text-[10px] text-stone-600 mt-1">Include country code. No spaces or dashes.</p>
        </div>
        <div>
          <label className={labelCls}>Default Message</label>
          <textarea rows={2} value={waMessage} onChange={e => setWaMessage(e.target.value)} className={`${inputCls} resize-none`} />
        </div>
        {/* Live preview */}
        <div>
          <button type="button" onClick={() => setShowWaPreview(v => !v)}
            className="flex items-center gap-1.5 text-[11px] text-[#ecc246] hover:text-[#dbb13b] font-bold cursor-pointer">
            {showWaPreview ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {showWaPreview ? "Hide preview" : "Show button preview"}
          </button>
          {showWaPreview && (
            <div className="mt-3 p-4 bg-stone-950/60 border border-stone-800 rounded-xl relative h-24 flex items-end justify-end">
              <span className="text-[10px] text-stone-600 absolute top-3 left-3">Preview</span>
              {/* Inline preview — doesn't open WhatsApp */}
              <div className="flex items-center justify-center w-14 h-14 rounded-full shadow-xl cursor-default"
                style={{ background: "#25D366" }}>
                <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.886 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end"><SaveBtn loading={waLoading} /></div>
      </form>

      {/* ── Analytics ─────────────────────────────────────────── */}
      <form onSubmit={handleSaveAnalytics} className={card}>
        <div className="flex items-center gap-2 pb-3 border-b border-stone-800">
          <BarChart3 className="w-4 h-4 text-blue-400" />
          <h4 className="font-bold text-sm text-stone-100">Google Tag Manager / GA4</h4>
        </div>
        <label className="flex items-center gap-3 cursor-pointer">
          <div className={`w-10 h-5 rounded-full relative transition-colors ${gaEnabled ? "bg-emerald-600" : "bg-stone-700"}`}
            onClick={() => setGaEnabled(v => !v)}>
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${gaEnabled ? "left-5" : "left-0.5"}`} />
          </div>
          <span className="text-sm text-stone-300">{gaEnabled ? "Analytics enabled" : "Analytics disabled"}</span>
        </label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>GTM Container ID</label>
            <input type="text" value={gtmId} onChange={e => setGtmId(e.target.value)}
              placeholder="GTM-XXXXXXX" className={inputCls} />
            <p className="text-[10px] text-stone-600 mt-1">Preferred — GTM can manage GA4 internally.</p>
          </div>
          <div>
            <label className={labelCls}>GA4 Measurement ID</label>
            <input type="text" value={ga4Id} onChange={e => setGa4Id(e.target.value)}
              placeholder="G-XXXXXXXXXX" className={inputCls} />
            <p className="text-[10px] text-stone-600 mt-1">Used only if GTM ID is empty.</p>
          </div>
        </div>
        <div className="flex justify-end"><SaveBtn loading={gaLoading} /></div>
      </form>

      {/* ── Socials ───────────────────────────────────────────── */}
      <form onSubmit={handleSaveSocials} className={card}>
        <div className="flex items-center gap-2 pb-3 border-b border-stone-800">
          <Share2 className="w-4 h-4 text-pink-400" />
          <h4 className="font-bold text-sm text-stone-100">Social Links</h4>
        </div>
        <p className="text-[11px] text-stone-500">Leave a field blank to hide that platform's icon from the site.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SOCIAL_FIELDS.map(f => (
            <div key={f.key}>
              <label className={labelCls}>{f.label}</label>
              <div className="relative">
                <ExternalLink className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-stone-600" />
                <input type="url" value={socials[f.key]}
                  onChange={e => setSocials(s => ({ ...s, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className={`${inputCls} pl-8`} />
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end"><SaveBtn loading={socLoading} /></div>
      </form>

      {/* ── SEO Defaults ──────────────────────────────────────── */}
      <form onSubmit={handleSaveSeo} className={card}>
        <div className="flex items-center gap-2 pb-3 border-b border-stone-800">
          <Globe className="w-4 h-4 text-[#ecc246]" />
          <h4 className="font-bold text-sm text-stone-100">SEO Defaults</h4>
        </div>
        <p className="text-[11px] text-stone-500">Used as fallback on pages that don't set their own title/description.</p>
        <div>
          <label className={labelCls}>Site Title</label>
          <input type="text" value={seoTitle} onChange={e => setSeoTitle(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Default Meta Description</label>
          <textarea rows={2} value={seoDesc} onChange={e => setSeoDesc(e.target.value)} className={`${inputCls} resize-none`} />
        </div>
        <div>
          <label className={labelCls}>Default OG Image URL</label>
          <input type="url" value={seoImg} onChange={e => setSeoImg(e.target.value)}
            placeholder="https://..." className={inputCls} />
        </div>
        <div className="flex justify-end"><SaveBtn loading={seoLoading} /></div>
      </form>
    </div>
  );
}
