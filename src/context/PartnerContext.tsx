import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";

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
  pending_contact_name: string | null;
  pending_contact_phone: string | null;
  status: "pending" | "active" | "suspended";
}

type PartnerState = "loading" | "active" | "not_found" | "main_site";

interface PartnerProviderProps {
  children: ReactNode;
  loadingSlot: ReactNode;
  notAvailableSlot: (slug: string) => ReactNode;
}

const PartnerContext = createContext<PartnerData | null>(null);

export function usePartner(): PartnerData | null {
  return useContext(PartnerContext);
}

export function PartnerProvider({ children, loadingSlot, notAvailableSlot }: PartnerProviderProps) {
  const location = useLocation();
  const [partner, setPartner] = useState<PartnerData | null>(null);
  const [state, setState] = useState<PartnerState>("main_site");
  const [currentSlug, setCurrentSlug] = useState("");

  useEffect(() => {
    const match = location.pathname.match(/^\/p\/([^/]+)/);
    if (!match) {
      setPartner(null);
      setState("main_site");
      setCurrentSlug("");
      return;
    }

    const partnerSlug = match[1];
    setCurrentSlug(partnerSlug);
    setState("loading");

    supabase
      .from("partners")
      .select(
        "id, slug, distributor_id, whatsapp_number, contact_email, " +
        "hero_title_en, hero_title_fr, hero_subtitle_en, hero_subtitle_fr, " +
        "hero_image_url, pending_contact_name, pending_contact_phone, status"
      )
      .eq("slug", partnerSlug)
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
  }, [location.pathname]);

  if (state === "loading") return <>{loadingSlot}</>;
  if (state === "not_found") return <>{notAvailableSlot(currentSlug)}</>;

  return (
    <PartnerContext.Provider value={partner}>
      {children}
    </PartnerContext.Provider>
  );
}
