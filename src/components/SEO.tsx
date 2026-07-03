import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { useSiteSettings } from "../hooks/useSiteSettings";

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "article" | "product";
  /** Extra JSON-LD structured data object or array */
  jsonLd?: Record<string, any> | Record<string, any>[];
  /** Breadcrumb items for BreadcrumbList structured data */
  breadcrumbs?: { name: string; url: string }[];
}

const DEFAULT_TITLE = "Songtai Life — Premium Wellness & MLM Platform, Cameroon";
const DEFAULT_DESC  =
  "Health. Opportunity. Prosperity. Premium natural products formulated with West African botanical heritage, unlocking sovereign economic independence for families across Cameroon.";
const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&q=80&w=1200";
const SITE_URL      = typeof window !== "undefined" ? window.location.origin : "https://songtailife.cm";

export default function SEO({
  title,
  description,
  image,
  url,
  type = "website",
  jsonLd,
  breadcrumbs,
}: SEOProps) {
  const { i18n } = useTranslation();
  const { seoDefaults, socials } = useSiteSettings();

  const lang = i18n.language?.startsWith("fr") ? "fr" : "en";
  const resolvedDesc  = (description ?? seoDefaults.meta_description) || DEFAULT_DESC;
  const resolvedImage = (image       ?? seoDefaults.og_image_url)     || DEFAULT_IMAGE;
  const pageTitle     = title ? `${title} | ${seoDefaults.site_title || "Songtai Life"}` : DEFAULT_TITLE;
  const canonical     = url ? `${SITE_URL}${url}` : SITE_URL;

  // Build social URLs array for Organization JSON-LD
  const socialUrls = Object.values(socials).filter(Boolean);

  const orgJsonLd: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: seoDefaults.site_title || "Songtai Life",
    url: SITE_URL,
    logo: resolvedImage !== DEFAULT_IMAGE ? resolvedImage : `${SITE_URL}/favicon.ico`,
    description: resolvedDesc,
    address: { "@type": "PostalAddress", addressLocality: "Yaoundé", addressCountry: "CM" },
    contactPoint: { "@type": "ContactPoint", contactType: "customer service", availableLanguage: ["English", "French"] },
    ...(socialUrls.length > 0 ? { sameAs: socialUrls } : {}),
  };

  // BreadcrumbList structured data
  const breadcrumbJsonLd = breadcrumbs && breadcrumbs.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      ...breadcrumbs.map((b, i) => ({ "@type": "ListItem", position: i + 2, name: b.name, item: `${SITE_URL}${b.url}` })),
    ],
  } : null;

  const structuredDataArray = [
    jsonLd ?? orgJsonLd,
    ...(breadcrumbJsonLd ? [breadcrumbJsonLd] : []),
  ].flat();

  return (
    <Helmet>
      <html lang={lang} />
      <title>{pageTitle}</title>
      <meta name="description" content={resolvedDesc} />
      <link rel="canonical" href={canonical} />

      {/* hrefLang — helps search engines understand bilingual structure */}
      <link rel="alternate" hrefLang="en" href={`${SITE_URL}?lang=en`} />
      <link rel="alternate" hrefLang="fr" href={`${SITE_URL}?lang=fr`} />
      <link rel="alternate" hrefLang="x-default" href={SITE_URL} />

      {/* Open Graph */}
      <meta property="og:type"        content={type} />
      <meta property="og:title"       content={pageTitle} />
      <meta property="og:description" content={resolvedDesc} />
      <meta property="og:image"       content={resolvedImage} />
      <meta property="og:url"         content={canonical} />
      <meta property="og:locale"      content={lang === "fr" ? "fr_CM" : "en_CM"} />
      <meta property="og:locale:alternate" content={lang === "fr" ? "en_CM" : "fr_CM"} />
      <meta property="og:site_name"   content={seoDefaults.site_title || "Songtai Life"} />

      {/* Twitter Card */}
      <meta name="twitter:card"        content="summary_large_image" />
      <meta name="twitter:title"       content={pageTitle} />
      <meta name="twitter:description" content={resolvedDesc} />
      <meta name="twitter:image"       content={resolvedImage} />

      {/* JSON-LD — one <script> per item */}
      {structuredDataArray.map((ld, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(ld)}
        </script>
      ))}
    </Helmet>
  );
}
