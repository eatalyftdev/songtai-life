import React, { useState, useEffect, useCallback } from "react";
import { HelpCircle, Plus, Edit, Trash2, ToggleLeft, ToggleRight, ChevronRight, Tag } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import PageShell, { Card, TableWrapper, Th, Td, Btn, SearchInput } from "../shared/PageShell";
import SlideOver from "../shared/SlideOver";
import { SkeletonTable } from "../shared/Skeleton";
import EmptyState from "../shared/EmptyState";

// ── Types ────────────────────────────────────────────────────────

interface FaqCategory {
  id: string; nameEn: string; nameFr: string; displayOrder: number;
}

interface Faq {
  id: string; categoryId: string | null; categoryName: string;
  questionEn: string; questionFr: string;
  answerEn: string; answerFr: string;
  displayOrder: number; isPublished: boolean; createdAt: string;
}

const BLANK_CAT: Partial<FaqCategory> = { nameEn: "", nameFr: "", displayOrder: 0 };
const BLANK_FAQ: Partial<Faq> = {
  categoryId: null, questionEn: "", questionFr: "",
  answerEn: "", answerFr: "", displayOrder: 0, isPublished: true,
};

async function log(action: string, details: string) {
  await supabase.from("audit_logs").insert({ action, details });
}

// ── Component ────────────────────────────────────────────────────

export default function FAQPage() {
  const [tab, setTab] = useState<"faqs" | "categories">("faqs");

  // categories
  const [categories, setCategories] = useState<FaqCategory[]>([]);
  const [catSlideOpen, setCatSlideOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<FaqCategory | null>(null);
  const [catForm, setCatForm] = useState<Partial<FaqCategory>>(BLANK_CAT);
  const [catSaving, setCatSaving] = useState(false);

  // faqs
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [faqsLoading, setFaqsLoading] = useState(true);
  const [faqSearch, setFaqSearch] = useState("");
  const [faqCatFilter, setFaqCatFilter] = useState("all");
  const [faqSlideOpen, setFaqSlideOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<Faq | null>(null);
  const [faqForm, setFaqForm] = useState<Partial<Faq>>(BLANK_FAQ);
  const [faqSaving, setFaqSaving] = useState(false);

  // ── Loaders ──────────────────────────────────────────────────

  const loadCategories = useCallback(async () => {
    const { data } = await supabase.from("faq_categories").select("*").order("display_order");
    setCategories((data ?? []).map(c => ({
      id: c.id, nameEn: c.name_en ?? "", nameFr: c.name_fr ?? "", displayOrder: c.display_order ?? 0,
    })));
  }, []);

  const loadFaqs = useCallback(async () => {
    setFaqsLoading(true);
    const { data } = await supabase
      .from("faqs")
      .select("*, faq_categories(name_en)")
      .order("display_order", { ascending: true });
    setFaqs((data ?? []).map(f => ({
      id: f.id,
      categoryId: f.category_id,
      categoryName: f.faq_categories?.name_en ?? "Uncategorised",
      questionEn: f.question_en ?? "",
      questionFr: f.question_fr ?? "",
      answerEn: f.answer_en ?? "",
      answerFr: f.answer_fr ?? "",
      displayOrder: f.display_order ?? 0,
      isPublished: f.is_published ?? true,
      createdAt: f.created_at ?? "",
    })));
    setFaqsLoading(false);
  }, []);

  useEffect(() => {
    loadCategories();
    loadFaqs();

    const ch = supabase.channel("admin_faq_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "faqs" }, loadFaqs)
      .on("postgres_changes", { event: "*", schema: "public", table: "faq_categories" }, loadCategories)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadCategories, loadFaqs]);

  // ── Category handlers ────────────────────────────────────────

  const openAddCat = () => { setEditingCat(null); setCatForm(BLANK_CAT); setCatSlideOpen(true); };
  const openEditCat = (c: FaqCategory) => { setEditingCat(c); setCatForm(c); setCatSlideOpen(true); };

  const handleSaveCat = async (e: React.FormEvent) => {
    e.preventDefault(); setCatSaving(true);
    const payload = { name_en: catForm.nameEn!, name_fr: catForm.nameFr || null, display_order: Number(catForm.displayOrder ?? 0) };
    const { error } = editingCat
      ? await supabase.from("faq_categories").update(payload).eq("id", editingCat.id)
      : await supabase.from("faq_categories").insert(payload);
    if (error) { alert(`Error saving category: ${error.message}`); setCatSaving(false); return; }
    await log(editingCat ? "FAQ Category Updated" : "FAQ Category Created", catForm.nameEn ?? "");
    setCatSaving(false); setCatSlideOpen(false); loadCategories();
  };

  const handleDeleteCat = async (c: FaqCategory) => {
    const count = faqs.filter(f => f.categoryId === c.id).length;
    if (count > 0) {
      alert(`"${c.nameEn}" has ${count} FAQ${count === 1 ? "" : "s"} — reassign or delete them first.`);
      return;
    }
    if (!confirm(`Delete category "${c.nameEn}"?`)) return;
    await supabase.from("faq_categories").delete().eq("id", c.id);
    await log("FAQ Category Deleted", c.nameEn);
    loadCategories();
  };

  // ── FAQ handlers ─────────────────────────────────────────────

  const openAddFaq = () => { setEditingFaq(null); setFaqForm(BLANK_FAQ); setFaqSlideOpen(true); };
  const openEditFaq = (f: Faq) => { setEditingFaq(f); setFaqForm(f); setFaqSlideOpen(true); };

  const handleSaveFaq = async (e: React.FormEvent) => {
    e.preventDefault(); setFaqSaving(true);
    const payload = {
      category_id: faqForm.categoryId || null,
      question_en: faqForm.questionEn!, question_fr: faqForm.questionFr || null,
      answer_en: faqForm.answerEn!, answer_fr: faqForm.answerFr || null,
      display_order: Number(faqForm.displayOrder ?? 0),
      is_published: faqForm.isPublished ?? true,
    };
    const { error } = editingFaq
      ? await supabase.from("faqs").update(payload).eq("id", editingFaq.id)
      : await supabase.from("faqs").insert(payload);
    if (error) { alert(`Error saving FAQ: ${error.message}`); setFaqSaving(false); return; }
    await log(editingFaq ? "FAQ Updated" : "FAQ Created", faqForm.questionEn ?? "");
    setFaqSaving(false); setFaqSlideOpen(false); loadFaqs();
  };

  const handleDeleteFaq = async (f: Faq) => {
    if (!confirm(`Delete this FAQ?\n\n"${f.questionEn}"\n\nThis cannot be undone.`)) return;
    await supabase.from("faqs").delete().eq("id", f.id);
    await log("FAQ Deleted", f.questionEn);
    loadFaqs();
  };

  const handleTogglePublished = async (f: Faq) => {
    await supabase.from("faqs").update({ is_published: !f.isPublished }).eq("id", f.id);
    setFaqs(prev => prev.map(x => x.id === f.id ? { ...x, isPublished: !x.isPublished } : x));
  };

  const fc = (k: keyof Faq, v: any) => setFaqForm(prev => ({ ...prev, [k]: v }));
  const cc = (k: keyof FaqCategory, v: any) => setCatForm(prev => ({ ...prev, [k]: v }));

  // ── Filtered FAQ list ────────────────────────────────────────

  const filteredFaqs = faqs.filter(f => {
    const q = faqSearch.toLowerCase();
    const matchesSearch = !q || f.questionEn.toLowerCase().includes(q) || f.answerEn.toLowerCase().includes(q);
    const matchesCat = faqCatFilter === "all" || f.categoryId === faqCatFilter;
    return matchesSearch && matchesCat;
  });

  // ── Render ───────────────────────────────────────────────────

  return (
    <PageShell
      title="FAQ"
      subtitle={`${faqs.length} questions · ${categories.length} categories`}
      actions={
        tab === "faqs"
          ? <Btn variant="primary" onClick={openAddFaq}><Plus className="w-3.5 h-3.5" /> Add FAQ</Btn>
          : <Btn variant="primary" onClick={openAddCat}><Plus className="w-3.5 h-3.5" /> Add Category</Btn>
      }
    >
      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-stone-900 border border-stone-800 rounded-xl w-fit">
        {([["faqs", "FAQs"], ["categories", "Categories"]] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              tab === key ? "bg-[#0A7D32] text-white" : "text-stone-400 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── FAQS TAB ── */}
      {tab === "faqs" && (
        <Card>
          <div className="flex flex-wrap gap-3 p-4 border-b border-stone-800">
            <SearchInput value={faqSearch} onChange={setFaqSearch} placeholder="Search questions…" />
            <select
              value={faqCatFilter}
              onChange={e => setFaqCatFilter(e.target.value)}
              className="px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32]"
            >
              <option value="all">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.nameEn}</option>)}
            </select>
          </div>

          <TableWrapper>
            <thead>
              <tr>
                <Th>Question</Th>
                <Th>Category</Th>
                <Th>Order</Th>
                <Th>Published</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            {faqsLoading ? <SkeletonTable cols={5} /> : (
              <tbody>
                {filteredFaqs.length === 0 ? (
                  <tr><td colSpan={5}>
                    <EmptyState
                      icon={HelpCircle}
                      title="No FAQs yet — add your first question"
                      action={{ label: "Add FAQ", onClick: openAddFaq }}
                    />
                  </td></tr>
                ) : filteredFaqs.map(f => (
                  <tr key={f.id} className="border-b border-stone-800/50 hover:bg-stone-800/20 transition-colors">
                    <Td>
                      <div className="max-w-sm">
                        <p className="text-white font-medium line-clamp-2">{f.questionEn}</p>
                        {f.questionFr && <p className="text-stone-500 text-[10px] mt-0.5 line-clamp-1">{f.questionFr}</p>}
                      </div>
                    </Td>
                    <Td>
                      <span className="px-2 py-0.5 bg-stone-800 rounded-md text-[10px] font-semibold text-stone-300">
                        {f.categoryName}
                      </span>
                    </Td>
                    <Td><span className="font-mono text-stone-400">{f.displayOrder}</span></Td>
                    <Td>
                      <button onClick={() => handleTogglePublished(f)} className="cursor-pointer text-stone-400 hover:text-white transition-colors">
                        {f.isPublished
                          ? <ToggleRight className="w-5 h-5 text-[#0A7D32]" />
                          : <ToggleLeft className="w-5 h-5" />}
                      </button>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1.5">
                        <Btn variant="ghost" size="xs" onClick={() => openEditFaq(f)}><Edit className="w-3 h-3" /></Btn>
                        <Btn variant="danger" size="xs" onClick={() => handleDeleteFaq(f)}><Trash2 className="w-3 h-3" /></Btn>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            )}
          </TableWrapper>
          <div className="px-4 py-3 border-t border-stone-800 text-stone-500 text-xs">
            Showing {filteredFaqs.length} of {faqs.length} questions
          </div>
        </Card>
      )}

      {/* ── CATEGORIES TAB ── */}
      {tab === "categories" && (
        <Card>
          <TableWrapper>
            <thead>
              <tr>
                <Th>Name (EN)</Th>
                <Th>Name (FR)</Th>
                <Th>FAQs</Th>
                <Th>Order</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr><td colSpan={5}>
                  <EmptyState
                    icon={Tag}
                    title="No categories yet"
                    action={{ label: "Add Category", onClick: openAddCat }}
                  />
                </td></tr>
              ) : categories.map(c => (
                <tr key={c.id} className="border-b border-stone-800/50 hover:bg-stone-800/20 transition-colors">
                  <Td><span className="text-white font-medium">{c.nameEn}</span></Td>
                  <Td><span className="text-stone-400">{c.nameFr || <span className="text-stone-600 italic">—</span>}</span></Td>
                  <Td>
                    <div className="flex items-center gap-1 text-stone-400">
                      <span className="font-mono">{faqs.filter(f => f.categoryId === c.id).length}</span>
                      <ChevronRight className="w-3 h-3" />
                    </div>
                  </Td>
                  <Td><span className="font-mono text-stone-400">{c.displayOrder}</span></Td>
                  <Td>
                    <div className="flex items-center gap-1.5">
                      <Btn variant="ghost" size="xs" onClick={() => openEditCat(c)}><Edit className="w-3 h-3" /></Btn>
                      <Btn variant="danger" size="xs" onClick={() => handleDeleteCat(c)}><Trash2 className="w-3 h-3" /></Btn>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrapper>
        </Card>
      )}

      {/* ── Add / Edit FAQ slide-over ── */}
      <SlideOver open={faqSlideOpen} onClose={() => setFaqSlideOpen(false)} title={editingFaq ? "Edit FAQ" : "New FAQ"}>
        <form onSubmit={handleSaveFaq} className="space-y-4">
          <div>
            <label className="text-stone-400 text-xs block mb-1.5">Category</label>
            <select
              value={faqForm.categoryId ?? ""}
              onChange={e => fc("categoryId", e.target.value || null)}
              className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32]"
            >
              <option value="">— Uncategorised —</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.nameEn}</option>)}
            </select>
          </div>
          <div>
            <label className="text-stone-400 text-xs block mb-1.5">Question (EN) *</label>
            <input required value={faqForm.questionEn ?? ""} onChange={e => fc("questionEn", e.target.value)}
              className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32]" />
          </div>
          <div>
            <label className="text-stone-400 text-xs block mb-1.5">Question (FR)</label>
            <input value={faqForm.questionFr ?? ""} onChange={e => fc("questionFr", e.target.value)}
              className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32]" />
          </div>
          <div>
            <label className="text-stone-400 text-xs block mb-1.5">Answer (EN) *</label>
            <textarea required rows={4} value={faqForm.answerEn ?? ""} onChange={e => fc("answerEn", e.target.value)}
              className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32] resize-none" />
          </div>
          <div>
            <label className="text-stone-400 text-xs block mb-1.5">Answer (FR)</label>
            <textarea rows={3} value={faqForm.answerFr ?? ""} onChange={e => fc("answerFr", e.target.value)}
              className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32] resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-stone-400 text-xs block mb-1.5">Display Order</label>
              <input type="number" value={faqForm.displayOrder ?? 0} onChange={e => fc("displayOrder", Number(e.target.value))}
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32]" />
            </div>
            <div className="flex flex-col justify-end pb-1">
              <label className="text-stone-400 text-xs mb-1.5">Published</label>
              <button type="button" onClick={() => fc("isPublished", !faqForm.isPublished)} className="cursor-pointer self-start">
                {faqForm.isPublished
                  ? <ToggleRight className="w-6 h-6 text-[#0A7D32]" />
                  : <ToggleLeft className="w-6 h-6 text-stone-500" />}
              </button>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Btn variant="secondary" onClick={() => setFaqSlideOpen(false)} className="flex-1">Cancel</Btn>
            <Btn variant="primary" loading={faqSaving} className="flex-1">{editingFaq ? "Save Changes" : "Create FAQ"}</Btn>
          </div>
        </form>
      </SlideOver>

      {/* ── Add / Edit Category slide-over ── */}
      <SlideOver open={catSlideOpen} onClose={() => setCatSlideOpen(false)} title={editingCat ? "Edit Category" : "New Category"}>
        <form onSubmit={handleSaveCat} className="space-y-4">
          <div>
            <label className="text-stone-400 text-xs block mb-1.5">Name (English) *</label>
            <input required value={catForm.nameEn ?? ""} onChange={e => cc("nameEn", e.target.value)}
              className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32]" />
          </div>
          <div>
            <label className="text-stone-400 text-xs block mb-1.5">Name (Français)</label>
            <input value={catForm.nameFr ?? ""} onChange={e => cc("nameFr", e.target.value)}
              className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32]" />
          </div>
          <div>
            <label className="text-stone-400 text-xs block mb-1.5">Display Order</label>
            <input type="number" value={catForm.displayOrder ?? 0} onChange={e => cc("displayOrder", Number(e.target.value))}
              className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32]" />
          </div>
          <div className="flex gap-3 pt-2">
            <Btn variant="secondary" onClick={() => setCatSlideOpen(false)} className="flex-1">Cancel</Btn>
            <Btn variant="primary" loading={catSaving} className="flex-1">{editingCat ? "Save Changes" : "Create Category"}</Btn>
          </div>
        </form>
      </SlideOver>
    </PageShell>
  );
}
