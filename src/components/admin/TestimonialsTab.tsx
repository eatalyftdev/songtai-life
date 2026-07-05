import { useState, type FormEvent } from "react";
import { Plus, Pencil, Trash2, Star, X } from "lucide-react";
import { useAdminResource } from "../../hooks/useAdminResource";

interface Testimonial {
  id: string;
  name: string;
  rank: string;
  region: string;
  quote: string;
  quoteFr: string;
  image?: string;
  isFeatured: boolean;
  displayOrder: number;
}

interface TestimonialsTabProps {
  addNotification: (msg: string, type: "success" | "info" | "gold") => void;
}

const blank = (): Omit<Testimonial, "id"> => ({
  name: "", rank: "", region: "", quote: "", quoteFr: "", image: "", isFeatured: false, displayOrder: 0,
});

export default function TestimonialsTab({ addNotification }: TestimonialsTabProps) {
  const { data: testimonials, loading, insert, update, remove } = useAdminResource<Testimonial>({
    tableName: "testimonials",
    orderBy: { column: "display_order", ascending: true },
    map: r => ({
      id: r.id,
      name: r.name ?? "",
      rank: r.rank ?? "",
      region: r.region ?? "",
      quote: r.quote ?? "",
      quoteFr: r.quote_fr ?? "",
      image: r.image ?? "",
      isFeatured: r.is_featured ?? false,
      displayOrder: r.display_order ?? 0,
    }),
  });

  const [isAdding, setIsAdding] = useState(false);
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [form, setForm] = useState(blank());
  const [saving, setSaving] = useState(false);

  const payload = (f: Omit<Testimonial, "id">) => ({
    name: f.name,
    rank: f.rank,
    region: f.region,
    quote: f.quote,
    quote_fr: f.quoteFr || null,
    image: f.image || null,
    is_featured: f.isFeatured,
    display_order: Number(f.displayOrder),
  });

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await insert(payload(form));
    setSaving(false);
    if (error) { addNotification("Error saving testimonial: " + error.message, "info"); return; }
    addNotification("Testimonial added.", "success");
    setIsAdding(false);
    setForm(blank());
  };

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    const { error } = await update(editing.id, payload(editing));
    setSaving(false);
    if (error) { addNotification("Error updating testimonial.", "info"); return; }
    addNotification("Testimonial updated.", "success");
    setEditing(null);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete testimonial from ${name}?`)) return;
    const { error } = await remove(id);
    if (error) addNotification("Error deleting testimonial.", "info");
    else addNotification("Testimonial deleted.", "success");
  };

  const inputCls = "w-full px-3 py-2 bg-stone-950 border border-stone-800 focus:border-[#ecc246] rounded-lg text-sm text-white outline-none";
  const labelCls = "text-stone-400 text-[10px] uppercase font-black block mb-1.5";

  const TestimonialForm = ({ data, onChange, onSubmit, onCancel }: {
    data: Omit<Testimonial, "id">;
    onChange: (v: Omit<Testimonial, "id">) => void;
    onSubmit: (e: FormEvent) => void;
    onCancel: () => void;
  }) => (
    <form onSubmit={onSubmit} className="bg-stone-900 border border-stone-800 rounded-xl p-6 space-y-4 max-w-3xl">
      <div className="flex justify-between items-center pb-2 border-b border-stone-800">
        <h4 className="font-bold text-sm text-stone-100">{editing ? "Edit Testimonial" : "Add Testimonial"}</h4>
        <button type="button" onClick={onCancel} className="text-stone-500 hover:text-stone-200 cursor-pointer"><X className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div><label className={labelCls}>Full Name *</label><input required value={data.name} onChange={e => onChange({ ...data, name: e.target.value })} className={inputCls} /></div>
        <div><label className={labelCls}>Rank / Title</label><input value={data.rank} onChange={e => onChange({ ...data, rank: e.target.value })} placeholder="Silver Distributor" className={inputCls} /></div>
        <div><label className={labelCls}>Region</label><input value={data.region} onChange={e => onChange({ ...data, region: e.target.value })} placeholder="Douala, CM" className={inputCls} /></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label className={labelCls}>Quote (EN) *</label><textarea required rows={3} value={data.quote} onChange={e => onChange({ ...data, quote: e.target.value })} className={`${inputCls} resize-none`} /></div>
        <div><label className={labelCls}>Quote (FR)</label><textarea rows={3} value={data.quoteFr} onChange={e => onChange({ ...data, quoteFr: e.target.value })} className={`${inputCls} resize-none`} /></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2"><label className={labelCls}>Photo URL</label><input type="url" value={data.image} onChange={e => onChange({ ...data, image: e.target.value })} placeholder="https://..." className={inputCls} /></div>
        <div><label className={labelCls}>Display Order</label><input type="number" value={data.displayOrder} onChange={e => onChange({ ...data, displayOrder: Number(e.target.value) })} className={inputCls} /></div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer text-sm text-stone-300">
        <input type="checkbox" checked={data.isFeatured} onChange={e => onChange({ ...data, isFeatured: e.target.checked })} className="accent-[#ecc246]" />
        Featured (shown prominently on homepage)
      </label>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-stone-800 text-stone-400 text-xs rounded-lg cursor-pointer hover:bg-stone-700">Cancel</button>
        <button type="submit" disabled={saving} className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg cursor-pointer disabled:opacity-60">
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6 text-left animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-extrabold text-lg text-stone-100">Testimonials</h3>
          <p className="text-xs text-stone-500">Customer and distributor success stories.</p>
        </div>
        <button onClick={() => { setIsAdding(true); setEditing(null); setForm(blank()); }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg cursor-pointer">
          <Plus className="w-3.5 h-3.5" />Add Testimonial
        </button>
      </div>

      {isAdding && <TestimonialForm data={form} onChange={setForm} onSubmit={handleAdd} onCancel={() => setIsAdding(false)} />}

      {editing && (
        <TestimonialForm
          data={editing}
          onChange={v => setEditing({ ...editing, ...v })}
          onSubmit={handleUpdate}
          onCancel={() => setEditing(null)}
        />
      )}

      {loading ? (
        <div className="flex justify-center py-12"><span className="w-6 h-6 border-2 border-stone-700 border-t-[#ecc246] rounded-full animate-spin" /></div>
      ) : testimonials.length === 0 ? (
        <p className="text-stone-500 text-sm py-12 text-center">No testimonials yet. Add the first one!</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {testimonials.map(t => (
            <div key={t.id} className="bg-stone-900 border border-stone-800 rounded-xl p-5 flex gap-4">
              {t.image && <img src={t.image} alt={t.name} className="w-12 h-12 rounded-full object-cover flex-shrink-0 border border-stone-700" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-stone-100">{t.name}</span>
                  {t.isFeatured && <Star className="w-3 h-3 text-[#ecc246] fill-[#ecc246]" />}
                </div>
                <span className="text-[10px] text-stone-500">{t.rank} {t.region && `· ${t.region}`}</span>
                <p className="text-xs text-stone-400 mt-2 line-clamp-3">"{t.quote}"</p>
              </div>
              <div className="flex flex-col gap-1.5 flex-shrink-0">
                <button onClick={() => { setEditing(t); setIsAdding(false); }}
                  className="p-1.5 bg-stone-800 hover:bg-stone-700 rounded-lg text-[#ecc246] cursor-pointer">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(t.id, t.name)}
                  className="p-1.5 bg-stone-800 hover:bg-red-950/30 rounded-lg text-red-400 cursor-pointer">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
