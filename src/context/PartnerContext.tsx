import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";

// ── Partner shape (mirrors the `partners` table) ────────────────────────────
export interface PartnerData {
  id: string;
  slug: string;
  distributor_id: string | null;
  whatsapp_number: string | null;
  contact_email: string | null;
  hero_title_en: string | null;
  hero_title_fr: string | null;
  hero_subtitle_en: string | null;
  hero_subtitle_fr: string | null;
  hero_image_url: string | null;
  status: string;
}

export const PartnerContext = createContext<PartnerData | null>(null);

/** Read the current partner (null on the main site). */
export function usePartner(): PartnerData | null {
  return useContext(PartnerContext);
}

// ── Tenant resolution mode ───────────────────────────────────────────────────
// Two modes:
//  "path"   – we're on the main site; use /p/:slug path-based resolution
//  "domain" – we're on a custom domain; look up partner by hostname

/**
 * Returns true when the current hostname belongs to the main site deployment
 * (localhost, Replit dev previews, or the configured VITE_SITE_URL domain).
 * Any other hostname is treated as a potential custom partner domain.
 */
function isMainSiteHostname(): boolean {
  if (typeof window === "undefined") return true;
  const h = window.location.hostname;
  if (h === "localhost" || h === "127.0.0.1") return true;
  // Replit preview domains
  if (h.endsWith(".replit.dev") || h.endsWith(".replit.app") || h.endsWith(".riker.replit.dev")) return true;
  // Configured production domain (e.g. "songtailife.cm")
  const siteUrl = (import.meta.env.VITE_SITE_URL ?? "") as string;
  if (siteUrl) {
    try {
      if (new URL(siteUrl).hostname === h) return true;
    } catch {}
  }
  return false;
}

// ── State machine for the loader ─────────────────────────────────────────────
type LoadState = "idle" | "loading" | "active" | "not_found";

interface PartnerProviderProps {
  children: ReactNode;
  /** Rendered when the slug/domain exists but partner is inactive/not found. */
  notAvailableSlot: (slug: string) => ReactNode;
  /** Rendered while fetching partner data. */
  loadingSlot: ReactNode;
}

const SELECT_FIELDS =
  "id, slug, distributor_id, whatsapp_number, contact_email, " +
  "hero_title_en, hero_title_fr, hero_subtitle_en, hero_subtitle_fr, " +
  "hero_image_url, status";

/**
 * Must be placed inside <BrowserRouter>.
 *
 * Resolution logic (in priority order):
 *  1. Custom domain  – if window.location.hostname is NOT the main site domain,
 *     look up a partner whose `custom_domain` matches the hostname exactly and
 *     whose `status = 'active'` and `domain_status = 'verified'`.
 *     The entire app then renders as that partner's site (rooted at `/`).
 *     An unmatched custom domain shows `notAvailableSlot` — it must NEVER
 *     silently fall through to the main company homepage.
 *
 *  2. Path slug  – if the URL matches /p/:slug, fetch and inject that partner
 *     row (original behaviour, unchanged).
 *
 *  3. Main site  – no partner context; children receive null.
 */
export function PartnerProvider({ children, notAvailableSlot, loadingSlot }: PartnerProviderProps) {
  const location = useLocation();

  // ── Determine resolution mode once (hostname doesn't change during a session)
  const [mode] = useState<"path" | "domain">(() =>
    isMainSiteHostname() ? "path" : "domain"
  );
  const [hostname] = useState<string>(() =>
    typeof window !== "undefined" ? window.location.hostname : ""
  );

  // ── Path-mode state ──────────────────────────────────────────────────────
  const slugMatch = mode === "path" ? location.pathname.match(/^\/p\/([^/]+)/) : null;
  const pathSlug = slugMatch?.[1] ?? null;

  // ── Shared state ─────────────────────────────────────────────────────────
  const [state, setState] = useState<LoadState>("idle");
  const [partner, setPartner] = useState<PartnerData | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  useEffect(() => {
    // ── Domain mode: resolve by hostname ──────────────────────────────────
    if (mode === "domain") {
      if (loadedKey === hostname) return; // already resolved for this hostname

      setState("loading");
      setLoadedKey(hostname);

      supabase
        .from("partners")
        .select(SELECT_FIELDS)
        .eq("custom_domain", hostname)
        .eq("status", "active")
        .eq("domain_status", "verified")
        .single()
        .then(({ data, error }) => {
          const row = data as unknown as PartnerData | null;
          if (error || !row) {
            setPartner(null);
            setState("not_found");
          } else {
            setPartner(row);
            setState("active");
          }
        });

      return;
    }

    // ── Path mode: resolve by /p/:slug ────────────────────────────────────
    if (!pathSlug) {
      // Not a /p/ route – clear partner state (main site)
      setState("idle");
      setPartner(null);
      setLoadedKey(null);
      return;
    }
    if (pathSlug === loadedKey) return; // already loaded for this slug

    setState("loading");
    setLoadedKey(pathSlug);

    supabase
      .from("partners")
      .select(SELECT_FIELDS)
      .eq("slug", pathSlug)
      .eq("status", "active")
      .single()
      .then(({ data, error }) => {
        const row = data as unknown as PartnerData | null;
        if (error || !row || row.status !== "active") {
          setPartner(null);
          setState("not_found");
        } else {
          setPartner(row);
          setState("active");
        }
      });
  }, [mode, hostname, pathSlug, loadedKey]);

  // ── Loading / not-found gates ─────────────────────────────────────────────
  // Domain mode: always gate — a custom domain must resolve or show an error,
  // never silently render the main company site.
  if (mode === "domain") {
    if (state === "loading" || state === "idle") return <>{loadingSlot}</>;
    if (state === "not_found") return <>{notAvailableSlot(hostname)}</>;
  }

  // Path mode: only gate when we're on a /p/ route
  if (mode === "path") {
    if (pathSlug && state === "loading") return <>{loadingSlot}</>;
    if (pathSlug && state === "not_found") return <>{notAvailableSlot(pathSlug)}</>;
  }

  return (
    <PartnerContext.Provider value={partner}>
      {children}
    </PartnerContext.Provider>
  );
}
