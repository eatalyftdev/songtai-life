import { useState, useEffect } from "react";
import { Search, HelpCircle, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useTranslation } from "react-i18next";
import SEO from "../SEO";

interface FaqCategory {
  id: string; nameEn: string; nameFr: string;
}

interface FaqItem {
  id: string; categoryId: string | null; categoryNameEn: string; categoryNameFr: string;
  questionEn: string; questionFr: string;
  answerEn: string; answerFr: string;
  displayOrder: number;
}

export default function FAQ() {
  const { i18n } = useTranslation();
  const locale = i18n.language?.startsWith("fr") ? "fr" : "en";

  const [categories, setCategories] = useState<FaqCategory[]>([]);
  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchFaq = async () => {
      setLoading(true);
      const [{ data: cats }, { data: faqs }] = await Promise.all([
        supabase.from("faq_categories").select("*").order("display_order"),
        supabase
          .from("faqs")
          .select("*, faq_categories(name_en, name_fr)")
          .eq("is_published", true)
          .order("display_order"),
      ]);

      if (cats && cats.length > 0) {
        setCategories(cats.map((c: any) => ({
          id: c.id, nameEn: c.name_en ?? "", nameFr: c.name_fr ?? c.name_en ?? "",
        })));
      }

      if (faqs && faqs.length > 0) {
        setItems(faqs.map((f: any) => ({
          id: f.id,
          categoryId: f.category_id,
          categoryNameEn: f.faq_categories?.name_en ?? "General",
          categoryNameFr: f.faq_categories?.name_fr ?? f.faq_categories?.name_en ?? "Général",
          questionEn: f.question_en ?? "",
          questionFr: f.question_fr ?? f.question_en ?? "",
          answerEn: f.answer_en ?? "",
          answerFr: f.answer_fr ?? f.answer_en ?? "",
          displayOrder: f.display_order ?? 0,
        })));
      }
      setLoading(false);
    };

    fetchFaq();
  }, []);

  const localize = (en: string, fr: string) => locale === "fr" && fr ? fr : en;

  // Category pills: derive from fetched categories, or fall back to unique values from items
  const categoryLabels: { id: string; label: string }[] =
    categories.length > 0
      ? categories.map(c => ({ id: c.id, label: localize(c.nameEn, c.nameFr) }))
      : Array.from(new Set(items.map(i => i.categoryId ?? ""))).map(id => {
          const found = items.find(i => i.categoryId === id);
          return { id, label: found ? localize(found.categoryNameEn, found.categoryNameFr) : id };
        });

  const filtered = items.filter(item => {
    const q = searchQuery.toLowerCase();
    const question = localize(item.questionEn, item.questionFr);
    const answer = localize(item.answerEn, item.answerFr);
    const matchesSearch = !q || question.toLowerCase().includes(q) || answer.toLowerCase().includes(q);
    const matchesCategory = activeCategory === "All" || item.categoryId === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const faqPageJsonLd = items.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map(item => ({
      "@type": "Question",
      name: locale === "fr" && item.questionFr ? item.questionFr : item.questionEn,
      acceptedAnswer: {
        "@type": "Answer",
        text: locale === "fr" && item.answerFr ? item.answerFr : item.answerEn,
      },
    })),
  } : undefined;

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 py-16 font-sans text-left relative overflow-hidden">
      {faqPageJsonLd && <SEO jsonLd={faqPageJsonLd} />}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 relative z-10">

        {/* Header & Search */}
        <div className="space-y-6">
          <div className="space-y-1.5">
            <span className="text-xs uppercase tracking-widest text-[color:var(--color-gold)] font-bold">Self Service</span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Frequently Asked Questions</h1>
            <p className="text-stone-400 text-xs">Instantly resolve questions regarding our products, rewards, or shipping nodes.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Input */}
            <div className="relative flex-grow">
              <Search className="w-4 h-4 text-stone-500 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="Search our knowledge base..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setExpandedId(null); }}
                className="w-full pl-10 pr-4 py-2.5 bg-stone-900 border border-stone-850 rounded-xl text-xs text-white outline-none focus:border-emerald-700"
              />
            </div>

            {/* Category pills */}
            {categoryLabels.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-1 bg-stone-950 rounded-xl border border-stone-900 w-fit self-start sm:self-auto">
                <button
                  onClick={() => { setActiveCategory("All"); setExpandedId(null); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeCategory === "All" ? "bg-emerald-700 text-white" : "text-stone-500 hover:text-stone-300"
                  }`}
                >
                  {locale === "fr" ? "Tout" : "All"}
                </button>
                {categoryLabels.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => { setActiveCategory(cat.id); setExpandedId(null); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeCategory === cat.id ? "bg-emerald-700 text-white" : "text-stone-500 hover:text-stone-300"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-stone-900/25 border border-stone-850/60 rounded-2xl h-16 animate-pulse" />
            ))}
          </div>
        )}

        {/* Accordion List */}
        {!loading && filtered.length === 0 && (
          <div className="py-16 text-center text-stone-500 text-xs">
            {searchQuery
              ? "No matching questions found in our knowledge base. Please contact our offices directly."
              : "No FAQs published yet."}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="space-y-4">
            {filtered.map(item => {
              const isOpen = expandedId === item.id;
              const question = localize(item.questionEn, item.questionFr);
              const answer = localize(item.answerEn, item.answerFr);
              const catLabel = localize(item.categoryNameEn, item.categoryNameFr);
              return (
                <div
                  key={item.id}
                  className="bg-stone-900/25 border border-stone-850/60 rounded-2xl overflow-hidden transition-all duration-200"
                >
                  <button
                    onClick={() => setExpandedId(isOpen ? null : item.id)}
                    className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-stone-900/40 cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5 pr-4">
                      <HelpCircle className="w-5 h-5 text-[color:var(--color-gold)] flex-shrink-0" />
                      <span className="font-extrabold text-white text-sm sm:text-base leading-snug">{question}</span>
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
                  </button>

                  {isOpen && (
                    <div className="px-6 pb-6 pt-2 text-stone-300 text-xs sm:text-sm leading-relaxed border-t border-stone-900/60 bg-stone-950/20">
                      <p className="max-w-2xl">{answer}</p>
                      <span className="inline-block mt-4 text-[9px] uppercase font-bold text-stone-500 bg-stone-900 px-2 py-0.5 rounded-md">
                        {catLabel}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
