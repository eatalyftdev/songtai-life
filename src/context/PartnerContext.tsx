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

// ── State machine for the loader ─────────────────────────────────────────────
type LoadState = "idle" | "loading" | "active" | "not_found";

interface PartnerProviderProps {
  children: ReactNode;
  /** Rendered when the slug exists but partner is inactive/not found. */
  notAvailableSlot: (slug: string) => ReactNode;
  /** Rendered while fetching partner data. */
  loadingSlot: ReactNode;
}

/**
 * Must be placed inside <BrowserRouter>.
 * When the URL matches /p/:slug, it fetches the partner row and either:
 *   • provides context to children (status = active)
 *   • renders notAvailableSlot (status ≠ active or not found)
 *   • renders loadingSlot (in-flight)
 * On non-partner routes it simply provides null context and renders children.
 */
export function PartnerProvider({ children, notAvailableSlot, loadingSlot }: PartnerProviderProps) {
  const location = useLocation();
  const [state, setState] = useState<LoadState>("idle");
  const [partner, setPartner] = useState<PartnerData | null>(null);
  const [currentSlug, setCurrentSlug] = useState<string | null>(null);

  // Extract slug from /p/:slug (any deeper path is fine: /p/johndoe/products etc.)
  const slugMatch = location.pathname.match(/^\/p\/([^/]+)/);
  const slug = slugMatch?.[1] ?? null;

  useEffect(() => {
    if (!slug) {
      // Not a partner route – clear partner state
      setState("idle");
      setPartner(null);
      setCurrentSlug(null);
      return;
    }
    if (slug === currentSlug) return; // already loaded for this slug

    setState("loading");
    setCurrentSlug(slug);

    supabase
      .from("partners")
      .select(
        "id, slug, distributor_id, whatsapp_number, contact_email, " +
        "hero_title_en, hero_title_fr, hero_subtitle_en, hero_subtitle_fr, " +
        "hero_image_url, status"
      )
      .eq("slug", slug)
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
  }, [slug, currentSlug]);

  if (slug && state === "loading") return <>{loadingSlot}</>;
  if (slug && state === "not_found") return <>{notAvailableSlot(slug)}</>;

  return (
    <PartnerContext.Provider value={partner}>
      {children}
    </PartnerContext.Provider>
  );
}
