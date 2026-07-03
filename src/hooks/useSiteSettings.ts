import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

// ─── Typed setting shapes ────────────────────────────────────────────────────
export interface WhatsAppSettings {
  number: string;
  default_message: string;
  enabled: boolean;
}
export interface AnalyticsSettings {
  gtm_id: string;
  ga4_id: string;
  enabled: boolean;
}
export interface SocialSettings {
  facebook: string;
  instagram: string;
  tiktok: string;
  whatsapp: string;
  youtube: string;
  linkedin: string;
}
export interface SeoDefaults {
  site_title: string;
  meta_description: string;
  og_image_url: string;
}
export interface ContactSettings {
  phone: string;
  email: string;
  address_en: string;
  address_fr: string;
  map_url: string;
}
export interface BrandingSettings {
  logo_url: string;
  logo_dark_url: string;
  favicon_url: string;
}

export interface SiteSettings {
  whatsapp: WhatsAppSettings;
  analytics: AnalyticsSettings;
  socials: SocialSettings;
  seoDefaults: SeoDefaults;
  contact: ContactSettings;
  branding: BrandingSettings;
}

const DEFAULTS: SiteSettings = {
  whatsapp: { number: "", default_message: "", enabled: false },
  analytics: { gtm_id: "", ga4_id: "", enabled: false },
  socials: { facebook: "", instagram: "", tiktok: "", whatsapp: "", youtube: "", linkedin: "" },
  seoDefaults: {
    site_title: "Songtai Life",
    meta_description: "Health. Opportunity. Prosperity. Premium natural products from West African botanical heritage.",
    og_image_url: "",
  },
  contact: { phone: "", email: "", address_en: "", address_fr: "", map_url: "" },
  branding: { logo_url: "", logo_dark_url: "", favicon_url: "" },
};

function parseSettings(rows: { key: string; value: any }[]): SiteSettings {
  const map: Record<string, any> = {};
  rows.forEach(r => { map[r.key] = r.value; });
  return {
    whatsapp:    { ...DEFAULTS.whatsapp,    ...(map.whatsapp    ?? {}) },
    analytics:   { ...DEFAULTS.analytics,   ...(map.analytics   ?? {}) },
    socials:     { ...DEFAULTS.socials,     ...(map.socials     ?? {}) },
    seoDefaults: { ...DEFAULTS.seoDefaults, ...(map.seo_defaults ?? {}) },
    contact:     { ...DEFAULTS.contact,     ...(map.contact     ?? {}) },
    branding:    { ...DEFAULTS.branding,    ...(map.branding    ?? {}) },
  };
}

// Module-level cache so multiple hook callers share one subscription
let cached: SiteSettings = DEFAULTS;
let listeners: Array<(s: SiteSettings) => void> = [];
let initialized = false;
let channel: ReturnType<typeof supabase.channel> | null = null;

function notify(s: SiteSettings) {
  cached = s;
  listeners.forEach(fn => fn(s));
}

async function init() {
  if (initialized) return;
  initialized = true;
  try {
    const { data } = await supabase.from("site_settings").select("key, value");
    if (data) notify(parseSettings(data));
  } catch { /* table may not exist yet — use defaults */ }

  channel = supabase
    .channel("site_settings_realtime")
    .on("postgres_changes", { event: "*", schema: "public", table: "site_settings" }, async () => {
      try {
        const { data } = await supabase.from("site_settings").select("key, value");
        if (data) notify(parseSettings(data));
      } catch { /* ignore */ }
    })
    .subscribe();
}

export function useSiteSettings(): SiteSettings {
  const [settings, setSettings] = useState<SiteSettings>(cached);

  useEffect(() => {
    listeners.push(setSettings);
    init();
    return () => {
      listeners = listeners.filter(fn => fn !== setSettings);
    };
  }, []);

  return settings;
}

/** Persist a single key to site_settings. Returns any Supabase error. */
export async function saveSiteSetting(key: string, value: object) {
  const { error } = await supabase
    .from("site_settings")
    .upsert({ key, value }, { onConflict: "key" });
  return error;
}
