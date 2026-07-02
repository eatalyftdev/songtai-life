import { useTranslation } from "react-i18next";

/**
 * Returns the localized value for a bilingual DB row field.
 * e.g. useLocalizedField(product, 'name') returns product.name_fr
 * when the active locale is 'fr', falling back to product.name_en.
 */
export function useLocalizedField() {
  const { i18n } = useTranslation();
  const locale = i18n.language?.startsWith("fr") ? "fr" : "en";

  function localize(row: Record<string, any>, field: string): string {
    const localeKey = `${field}_${locale}`;
    const fallbackKey = `${field}_en`;
    return row[localeKey] || row[fallbackKey] || row[field] || "";
  }

  return { localize, locale };
}
