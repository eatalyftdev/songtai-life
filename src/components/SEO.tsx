import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { useSiteSettings } from "../hooks/useSiteSettings";

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "article" | "product";
  /** Render noindex + nofollow — use on all auth-gated pages */
  noindex?: boolean;
  /** Extra JSON-LD structured data object or array */
  jsonLd?: Record<string, any> | Record<string, any>[];
  /** Breadcrumb items for BreadcrumbList structured data */
  breadcrumbs?: { name: string; url: string }[];
  /** Product-specific structured data fields */
  product?: { price: number; currency?: string; availability?: string; sku?: string };
  /** Article-specific structured data fields */
  article?: { publishedAt?: string; modifiedAt?: string; author?: string };
}

const DEFAULT_TITLE  = "Songtai Life — Premium Wellness & MLM Platform, Cameroon";
const DEFAULT_DESC   = "Health. Opportunity. Prosperity. Premium natural products formulated with West African botanical heritage, unlocking sovereign economic independence for families across Cameroon.";
const DEFAULT_IMAGE  = "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&q=80&w=1200";
const DEFAULT_KEYWORDS = "Songtai Life, MLM Cameroon, natural products Cameroon, wellness Cameroon, botanical products, organic health products, West African herbal, Yaoundé business opportunity, Douala MLM, distributeur santé Cameroun";
const SITE_URL       = typeof window !== "undefined" ? window.location.origin : "https://songtailife.cm";

export default function SEO({
  title,
  description,
  image,
  url,
  type = "website",
  noindex = false,
  jsonLd,
  breadcrumbs,
  product,
  article,
}: SEOProps) {
  const { i18n } = useTranslation();
  const { seoDefaults, socials, contact } = useSiteSettings();

  const lang           = i18n.language?.startsWith("fr") ? "fr" : "en";
  const resolvedDesc   = (description ?? seoDefaults.meta_description) || DEFAULT_DESC;
  const resolvedImage  = (image ?? seoDefaults.og_image_url) || DEFAULT_IMAGE;
  const resolvedKw     = seoDefaults.keywords || DEFAULT_KEYWORDS;
  const resolvedAuthor = seoDefaults.author || "Songtai Life";
  const resolvedColor  = seoDefaults.theme_color || "#016934";
  const pageTitle      = title ? `${title} | ${seoDefaults.site_title || "Songtai Life"}` : DEFAULT_TITLE;
  const canonical      = url ? `${SITE_URL}${url}` : SITE_URL;

  // Social URLs for Organization / LocalBusiness sameAs
  const socialUrls = [
    ...Object.values(socials).filter(Boolean),
    ...(seoDefaults.google_business_url ? [seoDefaults.google_business_url] : []),
  ];

  // ── LocalBusiness (more specific than Organization; works for MLM/retail) ──
  const orgJsonLd: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": ["Organization", "LocalBusiness"],
    name: seoDefaults.site_title || "Songtai Life",
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: resolvedImage !== DEFAULT_IMAGE ? resolvedImage : `${SITE_URL}/favicon.ico`,
    },
    image: resolvedImage,
    description: resolvedDesc,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Yaoundé",
      addressRegion: "Centre",
      addressCountry: "CM",
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      availableLanguage: ["English", "French"],
      ...(contact.phone ? { telephone: contact.phone } : {}),
      ...(contact.email ? { email: contact.email } : {}),
    },
    areaServed: { "@type": "Country", name: "Cameroon" },
    ...(seoDefaults.google_business_url ? { hasMap: seoDefaults.google_business_url } : {}),
    ...(socialUrls.length > 0 ? { sameAs: socialUrls } : {}),
  };

  // ── Product structured data ───────────────────────────────────────────────
  const productJsonLd: Record<string, any> | null = product ? {
    "@context": "https://schema.org",
    "@type": "Product",
    name: title,
    description: resolvedDesc,
    image: resolvedImage,
    brand: { "@type": "Brand", name: seoDefaults.site_title || "Songtai Life" },
    offers: {
      "@type": "Offer",
      priceCurrency: product.currency ?? "XAF",
      price: product.price,
      availability: product.availability ?? "https://schema.org/InStock",
      url: canonical,
      ...(product.sku ? { sku: product.sku } : {}),
    },
  } : null;

  // ── Article structured data ───────────────────────────────────────────────
  const articleJsonLd: Record<string, any> | null = (type === "article" && article) ? {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: resolvedDesc,
    image: resolvedImage,
    url: canonical,
    author: { "@type": "Person", name: article.author || resolvedAuthor },
    publisher: {
      "@type": "Organization",
      name: seoDefaults.site_title || "Songtai Life",
      logo: { "@type": "ImageObject", url: `${SITE_URL}/favicon.ico` },
    },
    ...(article.publishedAt ? { datePublished: article.publishedAt } : {}),
    ...(article.modifiedAt  ? { dateModified:  article.modifiedAt  } : {}),
  } : null;

  // ── BreadcrumbList structured data ────────────────────────────────────────
  const breadcrumbJsonLd = breadcrumbs && breadcrumbs.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      ...breadcrumbs.map((b, i) => ({ "@type": "ListItem", position: i + 2, name: b.name, item: `${SITE_URL}${b.url}` })),
    ],
  } : null;

  // Compose final structured data array
  const structuredDataArray = [
    jsonLd ?? (productJsonLd ?? (articleJsonLd ?? orgJsonLd)),
    // Always include org on homepage; product/article pages get org as second schema
    ...(productJsonLd || articleJsonLd ? [orgJsonLd] : []),
    ...(breadcrumbJsonLd ? [breadcrumbJsonLd] : []),
  ].flat().filter(Boolean);

  return (
    <Helmet>
      <html lang={lang} />
      <title>{pageTitle}</title>

      {/* Core meta */}
      <meta name="description"  content={resolvedDesc} />
      <meta name="keywords"     content={resolvedKw} />
      <meta name="author"       content={resolvedAuthor} />
      <meta name="theme-color"  content={resolvedColor} />
      <meta name="robots"       content={noindex ? "noindex, nofollow" : "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"} />

      {/* Geo / local SEO */}
      <meta name="geo.region"    content="CM" />
      <meta name="geo.placename" content="Cameroon" />
      <meta name="language"      content={lang === "fr" ? "French" : "English"} />

      {/* Canonical + hrefLang */}
      <link rel="canonical" href={canonical} />
      <link rel="alternate" hrefLang="en"        href={`${SITE_URL}?lang=en`} />
      <link rel="alternate" hrefLang="fr"        href={`${SITE_URL}?lang=fr`} />
      <link rel="alternate" hrefLang="x-default" href={SITE_URL} />

      {/* Open Graph */}
      <meta property="og:type"             content={type} />
      <meta property="og:title"            content={pageTitle} />
      <meta property="og:description"      content={resolvedDesc} />
      <meta property="og:image"            content={resolvedImage} />
      <meta property="og:image:width"      content="1200" />
      <meta property="og:image:height"     content="630" />
      <meta property="og:url"              content={canonical} />
      <meta property="og:locale"           content={lang === "fr" ? "fr_CM" : "en_CM"} />
      <meta property="og:locale:alternate" content={lang === "fr" ? "en_CM" : "fr_CM"} />
      <meta property="og:site_name"        content={seoDefaults.site_title || "Songtai Life"} />

      {/* Twitter / X Card */}
      <meta name="twitter:card"        content="summary_large_image" />
      <meta name="twitter:title"       content={pageTitle} />
      <meta name="twitter:description" content={resolvedDesc} />
      <meta name="twitter:image"       content={resolvedImage} />
      {socials.whatsapp && <meta name="twitter:site" content={socials.whatsapp} />}

      {/* JSON-LD — one <script> per schema */}
      {structuredDataArray.map((ld, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(ld)}
        </script>
      ))}
    </Helmet>
  );
}
