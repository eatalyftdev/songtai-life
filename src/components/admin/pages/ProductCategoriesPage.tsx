import React, { useState, useEffect, useCallback } from "react";
import { Layers, Plus, Edit, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import PageShell, { Card, TableWrapper, Th, Td, Btn, SearchInput } from "../shared/PageShell";
import SlideOver from "../shared/SlideOver";
import { SkeletonTable } from "../shared/Skeleton";
import EmptyState from "../shared/EmptyState";
import MediaUploader from "../../MediaUploader";

interface Category {
  id: string; nameEn: string; nameFr: string; slug: string;
  displayOrder: number; imageUrl: string | null; isActive: boolean;
  productCount: number;
}

const BLANK: Partial<Category> = {
  nameEn: "", nameFr: "", slug: "", displayOrder: 0, imageUrl: null, isActive: true,
};

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function log(action: string, details: string) {
  await supabase.from("audit_logs").insert({ action, details });
}

export default function ProductCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [slideOpen, setSlideOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<Partial<Category>>(BLANK);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: cats }, { data: prods }] = await Promise.all([
      supabase.from("product_categories").select("*").order("display_order", { ascending: true }),
      supabase.from("products").select("category_id").not("category_id", "is", null),
    ]);

    const countMap: Record<string, number> = {};
    (prods ?? []).forEach((p: any) => {
      countMap[p.category_id] = (countMap[p.category_id] ?? 0) + 1;
    });

    setCategories((cats ?? []).map((c: any) => ({
      id: c.id,
      nameEn: c.name ?? c.name_en ?? "",
      nameFr: c.name_fr ?? "",
      slug: c.slug ?? "",
      displayOrder: c.display_order ?? 0,
      imageUrl: c.image_url ?? null,
      isActive: c.is_active ?? true,
      productCount: countMap[c.id] ?? 0,
    })));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase.channel("admin_cat_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "product_categories" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const openAdd = () => { setEditing(null); setForm(BLANK); setSlideOpen(true); };
  const openEdit = (c: Category) => { setEditing(c); setForm(c); setSlideOpen(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const payload = {
      name: form.nameEn,
      name_fr: form.nameFr || null,
      slug: form.slug || slugify(form.nameEn ?? ""),
      display_order: Number(form.displayOrder ?? 0),
      image_url: form.imageUrl || null,
      is_active: form.isActive ?? true,
    };
    const { error } = editing
      ? await supabase.from("product_categories").update(payload).eq("id", editing.id)
      : await supabase.from("product_categories").insert(payload);
    if (error) { alert(`Error saving category: ${error.message}`); setSaving(false); return; }
    await log(editing ? "Category Updated" : "Category Created", form.nameEn ?? "");
    setSaving(false); setSlideOpen(false); load();
  };

  const handleDelete = async (c: Category) => {
    if (c.productCount > 0) {
      alert(`"${c.nameEn}" has ${c.productCount} product${c.productCount === 1 ? "" : "s"} assigned — reassign or remove them first.`);
      return;
    }
    if (!confirm(`Delete category "${c.nameEn}"? This cannot be undone.`)) return;
    await supabase.from("product_categories").delete().eq("id", c.id);
    await log("Category Deleted", c.nameEn);
    load();
  };

  const handleToggleActive = async (c: Category) => {
    await supabase.from("product_categories").update({ is_active: !c.isActive }).eq("id", c.id);
    setCategories(prev => prev.map(x => x.id === c.id ? { ...x, isActive: !x.isActive } : x));
  };

  const f = (k: keyof Category, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  const filtered = categories.filter(c => {
    const q = search.toLowerCase();
    return !q || c.nameEn.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q);
  });

  return (
    <PageShell
      title="Product Categories"
      subtitle={`${categories.length} categories`}
      actions={<Btn variant="primary" onClick={openAdd}><Plus className="w-3.5 h-3.5" /> Add Category</Btn>}
    >
      <Card>
        <div className="flex gap-3 p-4 border-b border-stone-800">
          <SearchInput value={search} onChange={setSearch} placeholder="Search categories…" />
        </div>

        <TableWrapper>
          <thead>
            <tr>
              <Th>Category</Th>
              <Th>Slug</Th>
              <Th>Products</Th>
              <Th>Order</Th>
              <Th>Active</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          {loading ? <SkeletonTable cols={6} /> : (
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6}>
                  <EmptyState icon={Layers} title="No categories yet" action={{ label: "Add Category", onClick: openAdd }} />
                </td></tr>
              ) : filtered.map(c => (
                <tr key={c.id} className="border-b border-stone-800/50 hover:bg-stone-800/20 transition-colors">
                  <Td>
                    <div className="flex items-center gap-3">
                      {c.imageUrl
                        ? <img src={c.imageUrl} className="w-9 h-9 rounded-lg object-cover flex-shrink-0 bg-stone-800" alt="" />
                        : <div className="w-9 h-9 rounded-lg bg-stone-800 flex items-center justify-center flex-shrink-0">
                            <Layers className="w-4 h-4 text-stone-600" />
                          </div>
                      }
                      <div>
                        <p className="text-white font-medium">{c.nameEn}</p>
                        {c.nameFr && <p className="text-stone-500 text-[10px]">{c.nameFr}</p>}
                      </div>
                    </div>
                  </Td>
                  <Td><span className="font-mono text-stone-400 text-[11px]">{c.slug}</span></Td>
                  <Td>
                    <span className={`font-mono font-semibold ${c.productCount > 0 ? "text-[#C9A227]" : "text-stone-500"}`}>
                      {c.productCount}
                    </span>
                  </Td>
                  <Td><span className="font-mono text-stone-400">{c.displayOrder}</span></Td>
                  <Td>
                    <button onClick={() => handleToggleActive(c)} className="cursor-pointer text-stone-400 hover:text-white transition-colors">
                      {c.isActive ? <ToggleRight className="w-5 h-5 text-[#0A7D32]" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1.5">
                      <Btn variant="ghost" size="xs" onClick={() => openEdit(c)}><Edit className="w-3 h-3" /></Btn>
                      <Btn variant="danger" size="xs" onClick={() => handleDelete(c)}><Trash2 className="w-3 h-3" /></Btn>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          )}
        </TableWrapper>
        <div className="px-4 py-3 border-t border-stone-800 text-stone-500 text-xs">
          Showing {filtered.length} of {categories.length} categories
        </div>
      </Card>

      <SlideOver open={slideOpen} onClose={() => setSlideOpen(false)} title={editing ? "Edit Category" : "New Category"}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-stone-400 text-xs block mb-1.5">Name (English) *</label>
              <input
                required
                value={form.nameEn ?? ""}
                onChange={e => {
                  f("nameEn", e.target.value);
                  if (!editing) f("slug", slugify(e.target.value));
                }}
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32]"
              />
            </div>
            <div>
              <label className="text-stone-400 text-xs block mb-1.5">Name (Français)</label>
              <input value={form.nameFr ?? ""} onChange={e => f("nameFr", e.target.value)}
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32]" />
            </div>
          </div>
          <div>
            <label className="text-stone-400 text-xs block mb-1.5">Slug</label>
            <input value={form.slug ?? ""} onChange={e => f("slug", e.target.value)}
              placeholder="auto-generated from name"
              className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-[#0A7D32]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-stone-400 text-xs block mb-1.5">Display Order</label>
              <input type="number" value={form.displayOrder ?? 0} onChange={e => f("displayOrder", Number(e.target.value))}
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32]" />
            </div>
            <div className="flex flex-col justify-end pb-1">
              <label className="text-stone-400 text-xs mb-1.5">Active</label>
              <button type="button" onClick={() => f("isActive", !form.isActive)} className="cursor-pointer self-start">
                {form.isActive ? <ToggleRight className="w-6 h-6 text-[#0A7D32]" /> : <ToggleLeft className="w-6 h-6 text-stone-500" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-stone-400 text-xs block mb-2">Category Image</label>
            {form.imageUrl && (
              <img src={form.imageUrl} className="w-full h-32 object-cover rounded-xl mb-2" alt="" />
            )}
            <MediaUploader bucket="media" onUploaded={url => f("imageUrl", url)} />
          </div>
          <div className="flex gap-3 pt-2">
            <Btn variant="secondary" onClick={() => setSlideOpen(false)} className="flex-1">Cancel</Btn>
            <Btn variant="primary" loading={saving} className="flex-1">{editing ? "Save Changes" : "Create Category"}</Btn>
          </div>
        </form>
      </SlideOver>
    </PageShell>
  );
}
