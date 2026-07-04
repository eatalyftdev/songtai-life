import React from "react";
import { useState, useEffect } from "react";
import { ShoppingBag, Plus, Edit, Trash2, ToggleLeft, ToggleRight, Copy } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import PageShell, { Card, TableWrapper, Th, Td, Btn, SearchInput, Select } from "../shared/PageShell";
import SlideOver from "../shared/SlideOver";
import { SkeletonTable } from "../shared/Skeleton";
import EmptyState from "../shared/EmptyState";
import MediaUploader from "../../MediaUploader";

interface Product {
  id: string; slug: string; nameEn: string; nameFr: string;
  descriptionEn: string; descriptionFr: string; priceXaf: number;
  strikePriceXaf: number | null; pvPoints: number; isActive: boolean;
  isFeatured: boolean; featuredOrder: number;
  images: string[]; categoryId: string | null; stock: number;
}

const BLANK: Partial<Product> = {
  nameEn: "", nameFr: "", slug: "", descriptionEn: "", descriptionFr: "",
  priceXaf: 0, strikePriceXaf: null, pvPoints: 0, isActive: true,
  isFeatured: false, featuredOrder: 0, images: [], stock: 100,
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [slideOpen, setSlideOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<Partial<Product>>(BLANK);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("products").select("*").order("created_at", { ascending: false });
    setProducts((data ?? []).map(p => ({
      id: p.id, slug: p.slug ?? "", nameEn: p.name_en ?? "", nameFr: p.name_fr ?? "",
      descriptionEn: p.description_en ?? "", descriptionFr: p.description_fr ?? "",
      priceXaf: p.price_xaf ?? 0, strikePriceXaf: p.strike_price_xaf ?? null,
      pvPoints: p.pv_points ?? 0, isActive: p.is_active ?? true,
      isFeatured: p.is_featured ?? false, featuredOrder: p.featured_order ?? 0,
      images: p.images ?? [], categoryId: p.category_id ?? null, stock: p.stock ?? 0,
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = products.filter(p => {
    const q = search.toLowerCase();
    if (filter === "active" && !p.isActive) return false;
    if (filter === "inactive" && p.isActive) return false;
    if (filter === "featured" && !p.isFeatured) return false;
    return !q || p.nameEn.toLowerCase().includes(q) || p.nameFr.toLowerCase().includes(q);
  });

  const openAdd = () => { setEditing(null); setForm(BLANK); setSlideOpen(true); };
  const openEdit = (p: Product) => { setEditing(p); setForm(p); setSlideOpen(true); };
  const openDuplicate = (p: Product) => {
    setEditing(null);
    setForm({ ...p, id: undefined, slug: `${p.slug}-copy`, nameEn: `${p.nameEn} (Copy)` });
    setSlideOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const payload = {
      slug: (form.slug || `prod-${Date.now()}`),
      name_en: form.nameEn, name_fr: form.nameFr || null,
      description_en: form.descriptionEn, description_fr: form.descriptionFr || null,
      price_xaf: Number(form.priceXaf || 0),
      strike_price_xaf: form.strikePriceXaf ? Number(form.strikePriceXaf) : null,
      pv_points: Number(form.pvPoints || 0), stock: Number(form.stock || 0),
      images: form.images ?? [], is_active: form.isActive ?? true,
      is_featured: form.isFeatured ?? false, featured_order: Number(form.featuredOrder ?? 0),
    };
    if (editing) {
      await supabase.from("products").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("products").insert(payload);
    }
    await supabase.from("audit_logs").insert({ action: editing ? "Product Updated" : "Product Created", details: form.nameEn });
    setSaving(false); setSlideOpen(false); load();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    await supabase.from("products").delete().eq("id", id);
    await supabase.from("audit_logs").insert({ action: "Product Deleted", details: name });
    load();
  };

  const handleToggleActive = async (p: Product) => {
    await supabase.from("products").update({ is_active: !p.isActive }).eq("id", p.id);
    setProducts(prev => prev.map(x => x.id === p.id ? { ...x, isActive: !x.isActive } : x));
  };

  const handleBulkAction = async (action: "activate" | "deactivate" | "delete") => {
    if (action === "delete" && !confirm(`Delete ${selected.size} products?`)) return;
    for (const id of selected) {
      if (action === "activate") await supabase.from("products").update({ is_active: true }).eq("id", id);
      else if (action === "deactivate") await supabase.from("products").update({ is_active: false }).eq("id", id);
      else await supabase.from("products").delete().eq("id", id);
    }
    setSelected(new Set()); load();
  };

  const allSelected = filtered.length > 0 && filtered.every(p => selected.has(p.id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(filtered.map(p => p.id)));
  const f = (k: keyof Product, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <PageShell
      title="Products"
      subtitle={`${products.length} products in catalog`}
      actions={<>
        {selected.size > 0 && (
          <>
            <Btn variant="secondary" onClick={() => handleBulkAction("activate")}>Activate ({selected.size})</Btn>
            <Btn variant="secondary" onClick={() => handleBulkAction("deactivate")}>Deactivate</Btn>
            <Btn variant="danger" onClick={() => handleBulkAction("delete")}>Delete</Btn>
          </>
        )}
        <Btn variant="primary" onClick={openAdd}><Plus className="w-3.5 h-3.5" /> Add Product</Btn>
      </>}
    >
      <Card>
        <div className="flex flex-wrap gap-3 p-4 border-b border-stone-800">
          <SearchInput value={search} onChange={setSearch} placeholder="Search products…" />
          <Select value={filter} onChange={setFilter}>
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="featured">Featured on Homepage</option>
          </Select>
        </div>

        <TableWrapper>
          <thead>
            <tr>
              <Th><input type="checkbox" checked={allSelected} onChange={toggleAll} className="cursor-pointer" /></Th>
              <Th>Product</Th>
              <Th>Price</Th>
              <Th>PV</Th>
              <Th>Stock</Th>
              <Th>Active</Th>
              <Th>Featured</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          {loading ? <SkeletonTable cols={7} /> : (
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7}><EmptyState icon={ShoppingBag} title="No products yet" description="Add your first product to the catalog." action={{ label: "Add Product", onClick: openAdd }} /></td></tr>
              ) : filtered.map(p => (
                <tr key={p.id} className="border-b border-stone-800/50 hover:bg-stone-800/20 transition-colors">
                  <Td><input type="checkbox" checked={selected.has(p.id)} onChange={() => setSelected(prev => { const s = new Set(prev); s.has(p.id) ? s.delete(p.id) : s.add(p.id); return s; })} className="cursor-pointer" /></Td>
                  <Td>
                    <div className="flex items-center gap-3">
                      {p.images[0] && <img src={p.images[0]} className="w-9 h-9 rounded-lg object-cover flex-shrink-0 bg-stone-800" />}
                      <div>
                        <p className="text-white font-medium">{p.nameEn}</p>
                        {p.nameFr && <p className="text-stone-500 text-[10px]">{p.nameFr}</p>}
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <div>
                      <span className="text-white font-mono">{p.priceXaf.toLocaleString()} XAF</span>
                      {p.strikePriceXaf && <span className="line-through text-stone-500 ml-2 text-[10px]">{p.strikePriceXaf.toLocaleString()}</span>}
                    </div>
                  </Td>
                  <Td><span className="text-[#C9A227] font-mono font-semibold">{p.pvPoints} PV</span></Td>
                  <Td><span className="font-mono">{p.stock}</span></Td>
                  <Td>
                    <button onClick={() => handleToggleActive(p)} className="cursor-pointer text-stone-400 hover:text-white transition-colors">
                      {p.isActive ? <ToggleRight className="w-5 h-5 text-[#0A7D32]" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>
                  </Td>
                  <Td>
                    <button
                      onClick={async () => {
                        await supabase.from("products").update({ is_featured: !p.isFeatured }).eq("id", p.id);
                        setProducts(prev => prev.map(x => x.id === p.id ? { ...x, isFeatured: !x.isFeatured } : x));
                      }}
                      className="cursor-pointer text-stone-400 hover:text-white transition-colors"
                      title={p.isFeatured ? "Remove from homepage" : "Feature on homepage"}
                    >
                      {p.isFeatured ? <ToggleRight className="w-5 h-5 text-[#C9A227]" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1.5">
                      <Btn variant="ghost" size="xs" onClick={() => openEdit(p)}><Edit className="w-3 h-3" /></Btn>
                      <Btn variant="ghost" size="xs" onClick={() => openDuplicate(p)}><Copy className="w-3 h-3" /></Btn>
                      <Btn variant="danger" size="xs" onClick={() => handleDelete(p.id, p.nameEn)}><Trash2 className="w-3 h-3" /></Btn>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          )}
        </TableWrapper>
        <div className="px-4 py-3 border-t border-stone-800 text-stone-500 text-xs">
          Showing {filtered.length} of {products.length} products
        </div>
      </Card>

      <SlideOver open={slideOpen} onClose={() => setSlideOpen(false)} title={editing ? "Edit Product" : "New Product"} subtitle="Bilingual catalog entry">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-stone-400 text-xs block mb-1.5">Name (English) *</label>
              <input value={form.nameEn ?? ""} onChange={e => f("nameEn", e.target.value)} required
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32]" />
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
              placeholder="auto-generated if empty"
              className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32]" />
          </div>
          <div>
            <label className="text-stone-400 text-xs block mb-1.5">Description (EN)</label>
            <textarea value={form.descriptionEn ?? ""} onChange={e => f("descriptionEn", e.target.value)} rows={3}
              className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32] resize-none" />
          </div>
          <div>
            <label className="text-stone-400 text-xs block mb-1.5">Description (FR)</label>
            <textarea value={form.descriptionFr ?? ""} onChange={e => f("descriptionFr", e.target.value)} rows={2}
              className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32] resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-stone-400 text-xs block mb-1.5">Price (XAF) *</label>
              <input type="number" value={form.priceXaf ?? 0} onChange={e => f("priceXaf", Number(e.target.value))} required
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32]" />
            </div>
            <div>
              <label className="text-stone-400 text-xs block mb-1.5">Strike Price (XAF)</label>
              <input type="number" value={form.strikePriceXaf ?? ""} onChange={e => f("strikePriceXaf", e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32]" />
            </div>
            <div>
              <label className="text-stone-400 text-xs block mb-1.5">PV Points</label>
              <input type="number" value={form.pvPoints ?? 0} onChange={e => f("pvPoints", Number(e.target.value))}
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32]" />
            </div>
            <div>
              <label className="text-stone-400 text-xs block mb-1.5">Stock</label>
              <input type="number" value={form.stock ?? 0} onChange={e => f("stock", Number(e.target.value))}
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32]" />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <label className="text-stone-400 text-xs">Active</label>
              <button type="button" onClick={() => f("isActive", !form.isActive)} className="cursor-pointer">
                {form.isActive ? <ToggleRight className="w-6 h-6 text-[#0A7D32]" /> : <ToggleLeft className="w-6 h-6 text-stone-500" />}
              </button>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-stone-400 text-xs">Featured on Homepage</label>
              <button type="button" onClick={() => f("isFeatured", !form.isFeatured)} className="cursor-pointer">
                {form.isFeatured ? <ToggleRight className="w-6 h-6 text-[#C9A227]" /> : <ToggleLeft className="w-6 h-6 text-stone-500" />}
              </button>
            </div>
          </div>
          {form.isFeatured && (
            <div>
              <label className="text-stone-400 text-xs block mb-1.5">Featured Order</label>
              <input type="number" value={form.featuredOrder ?? 0} onChange={e => f("featuredOrder", Number(e.target.value))}
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32]" />
            </div>
          )}
          <div>
            <label className="text-stone-400 text-xs block mb-2">Product Image</label>
            <MediaUploader
              bucket="media"
              onUploaded={url => f("images", [url])}
              // no currentUrl
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Btn variant="secondary" onClick={() => setSlideOpen(false)} className="flex-1">Cancel</Btn>
            <Btn variant="primary" loading={saving} className="flex-1">{editing ? "Save Changes" : "Create Product"}</Btn>
          </div>
        </form>
      </SlideOver>
    </PageShell>
  );
}
