import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "article" | "product";
  /** Extra JSON-LD structured data object */
  jsonLd?: Record<string, any>;
}

const DEFAULT_TITLE = "Songtai Life — Premium Wellness & MLM Platform, Cameroon";
const DEFAULT_DESC  =
  "Health. Opportunity. Prosperity. Premium natural products formulated with West African botanical heritage, unlocking sovereign economic independence for families across Cameroon.";
const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&q=80&w=1200";
const SITE_URL      = typeof window !== "undefined" ? window.location.origin : "https://songtailife.cm";

const ORG_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Songtai Life",
  url: SITE_URL,
  logo: `${SITE_URL}/favicon.ico`,
  description: DEFAULT_DESC,
  address: {
    "@type": "PostalAddress",
    addressLocality: "Yaoundé",
    addressCountry: "CM",
  },
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer service",
    availableLanguage: ["English", "French"],
  },
};

export default function SEO({
  title,
  description = DEFAULT_DESC,
  image = DEFAULT_IMAGE,
  url,
  type = "website",
  jsonLd,
}: SEOProps) {
  const { i18n } = useTranslation();
  const lang = i18n.language?.startsWith("fr") ? "fr" : "en";
  const pageTitle = title ? `${title} | Songtai Life` : DEFAULT_TITLE;
  const canonical = url ? `${SITE_URL}${url}` : SITE_URL;

  const structuredData = jsonLd ?? ORG_JSON_LD;

  return (
    <Helmet>
      <html lang={lang} />
      <title>{pageTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />

      {/* Open Graph */}
      <meta property="og:type"        content={type} />
      <meta property="og:title"       content={pageTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image"       content={image} />
      <meta property="og:url"         content={canonical} />
      <meta property="og:locale"      content={lang === "fr" ? "fr_CM" : "en_CM"} />
      <meta property="og:site_name"   content="Songtai Life" />

      {/* Twitter Card */}
      <meta name="twitter:card"        content="summary_large_image" />
      <meta name="twitter:title"       content={pageTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image"       content={image} />

      {/* JSON-LD */}
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  );
}
