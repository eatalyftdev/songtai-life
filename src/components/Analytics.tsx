/**
 * Analytics — admin-configurable GTM / GA4 injection.
 * Reads from useSiteSettings and injects script tags at runtime,
 * so admins can change IDs from the admin panel without a redeploy.
 *
 * Also exports `trackEvent(name, params?)` for custom dataLayer events.
 */
import { useEffect, useRef } from "react";
import { useSiteSettings } from "../hooks/useSiteSettings";

// ── Extend window for dataLayer / gtag ─────────────────────────────────────
declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
  }
}

/** Push a custom event to the dataLayer (safe to call before GTM loads). */
export function trackEvent(eventName: string, params?: Record<string, any>) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({ event: eventName, ...params });
}

function injectGTM(gtmId: string) {
  if (document.getElementById("gtm-script")) return;
  // dataLayer initializer
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
  // Script tag
  const s = document.createElement("script");
  s.id = "gtm-script";
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtm.js?id=${gtmId}`;
  document.head.appendChild(s);
  // noscript iframe (append to body when ready)
  const noscript = document.createElement("noscript");
  noscript.id = "gtm-noscript";
  const iframe = document.createElement("iframe");
  iframe.src = `https://www.googletagmanager.com/ns.html?id=${gtmId}`;
  iframe.height = "0";
  iframe.width = "0";
  iframe.style.display = "none";
  iframe.style.visibility = "hidden";
  noscript.appendChild(iframe);
  document.body.prepend(noscript);
}

function injectGA4(ga4Id: string) {
  if (document.getElementById("ga4-script")) return;
  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function() { window.dataLayer.push(arguments); };
  window.dataLayer.push(["js", new Date()]);
  window.dataLayer.push(["config", ga4Id]);
  const s = document.createElement("script");
  s.id = "ga4-script";
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${ga4Id}`;
  document.head.appendChild(s);
}

export default function Analytics() {
  const { analytics } = useSiteSettings();
  const injectedGtm = useRef<string>("");
  const injectedGa4 = useRef<string>("");

  useEffect(() => {
    if (!analytics.enabled) return;
    if (analytics.gtm_id && analytics.gtm_id !== injectedGtm.current) {
      injectGTM(analytics.gtm_id);
      injectedGtm.current = analytics.gtm_id;
    }
    if (analytics.ga4_id && analytics.ga4_id !== injectedGa4.current && !analytics.gtm_id) {
      // Only inject GA4 directly if no GTM is configured (GTM would handle GA4)
      injectGA4(analytics.ga4_id);
      injectedGa4.current = analytics.ga4_id;
    }
  }, [analytics]);

  return null; // renders nothing — side-effects only
}
