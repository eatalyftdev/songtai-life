import React from "react";
import { useState, useEffect } from "react";
import { Calendar, Plus, Edit, Trash2 } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import PageShell, { Card, TableWrapper, Th, Td, Btn, SearchInput } from "../shared/PageShell";
import SlideOver from "../shared/SlideOver";
import { SkeletonTable } from "../shared/Skeleton";
import EmptyState from "../shared/EmptyState";
import MediaUploader from "../../MediaUploader";

interface Event {
  id: string; slug: string; title: string; startAt: string; endAt: string;
  location: string; capacity: number; registrants: string[];
  description: string; image: string;
}

const BLANK: Partial<Event> = {
  title: "", slug: "", startAt: new Date().toISOString().slice(0,16),
  endAt: new Date().toISOString().slice(0,16), location: "",
  capacity: 100, description: "", image: "",
};

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [slideOpen, setSlideOpen] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);
  const [form, setForm] = useState<Partial<Event>>(BLANK);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("events").select("*").order("start_at", { ascending: false });
    setEvents((data ?? []).map(e => ({
      id: e.id, slug: e.slug ?? "", title: e.title ?? "", startAt: e.start_at ?? "",
      endAt: e.end_at ?? "", location: e.location ?? "", capacity: e.capacity ?? 0,
      registrants: e.registrants ?? [], description: e.description ?? "", image: e.image ?? "",
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = events.filter(e => !search || e.title.toLowerCase().includes(search.toLowerCase()) || e.location.toLowerCase().includes(search.toLowerCase()));

  const openAdd = () => { setEditing(null); setForm(BLANK); setSlideOpen(true); };
  const openEdit = (e: Event) => { setEditing(e); setForm(e); setSlideOpen(true); };

  const handleSave = async (ev: React.FormEvent) => {
    ev.preventDefault(); setSaving(true);
    const payload = {
      slug: form.slug || `event-${Date.now()}`, title: form.title,
      start_at: form.startAt, end_at: form.endAt, location: form.location,
      capacity: Number(form.capacity), description: form.description, image: form.image, registrants: [],
    };
    if (editing) await supabase.from("events").update(payload).eq("id", editing.id);
    else await supabase.from("events").insert(payload);
    await supabase.from("audit_logs").insert({ action: editing ? "Event Updated" : "Event Created", details: form.title });
    setSaving(false); setSlideOpen(false); load();
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return;
    await supabase.from("events").delete().eq("id", id);
    load();
  };

  const f = (k: keyof Event, v: any) => setForm(prev => ({ ...prev, [k]: v }));
  const regPct = (e: Event) => e.capacity > 0 ? Math.min(100, Math.round((e.registrants.length / e.capacity) * 100)) : 0;

  return (
    <PageShell title="Events" subtitle={`${events.length} events`} actions={<Btn variant="primary" onClick={openAdd}><Plus className="w-3.5 h-3.5" /> New Event</Btn>}>
      <Card>
        <div className="flex gap-3 p-4 border-b border-stone-800">
          <SearchInput value={search} onChange={setSearch} placeholder="Search events…" />
        </div>
        <TableWrapper>
          <thead><tr><Th>Event</Th><Th>Date</Th><Th>Location</Th><Th>Registrations</Th><Th>Actions</Th></tr></thead>
          {loading ? <SkeletonTable cols={5} /> : (
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5}><EmptyState icon={Calendar} title="No events yet" action={{ label: "Create first event", onClick: openAdd }} /></td></tr>
              ) : filtered.map(e => (
                <tr key={e.id} className="border-b border-stone-800/50 hover:bg-stone-800/20">
                  <Td>
                    <div className="flex items-center gap-3">
                      {e.image && <img src={e.image} className="w-9 h-9 rounded-lg object-cover flex-shrink-0 bg-stone-800" />}
                      <p className="text-white font-medium text-xs">{e.title}</p>
                    </div>
                  </Td>
                  <Td><span className="text-stone-400 text-[11px]">{new Date(e.startAt).toLocaleDateString()}</span></Td>
                  <Td><span className="text-stone-400 text-[11px]">{e.location}</span></Td>
                  <Td>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-stone-400">{e.registrants.length} / {e.capacity}</span>
                        <span className="text-[#C9A227]">{regPct(e)}%</span>
                      </div>
                      <div className="w-24 h-1.5 bg-stone-700 rounded-full">
                        <div className="h-1.5 rounded-full bg-[#0A7D32]" style={{ width: `${regPct(e)}%` }} />
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <div className="flex gap-1.5">
                      <Btn variant="ghost" size="xs" onClick={() => openEdit(e)}><Edit className="w-3 h-3" /></Btn>
                      <Btn variant="danger" size="xs" onClick={() => handleDelete(e.id, e.title)}><Trash2 className="w-3 h-3" /></Btn>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          )}
        </TableWrapper>
      </Card>

      <SlideOver open={slideOpen} onClose={() => setSlideOpen(false)} title={editing ? "Edit Event" : "New Event"}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-stone-400 text-xs block mb-1.5">Title *</label>
            <input value={form.title ?? ""} onChange={e => f("title", e.target.value)} required
              className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-stone-400 text-xs block mb-1.5">Start Date/Time</label>
              <input type="datetime-local" value={form.startAt ?? ""} onChange={e => f("startAt", e.target.value)}
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32]" />
            </div>
            <div>
              <label className="text-stone-400 text-xs block mb-1.5">End Date/Time</label>
              <input type="datetime-local" value={form.endAt ?? ""} onChange={e => f("endAt", e.target.value)}
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32]" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-stone-400 text-xs block mb-1.5">Location</label>
              <input value={form.location ?? ""} onChange={e => f("location", e.target.value)}
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32]" />
            </div>
            <div>
              <label className="text-stone-400 text-xs block mb-1.5">Capacity</label>
              <input type="number" value={form.capacity ?? 100} onChange={e => f("capacity", Number(e.target.value))}
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32]" />
            </div>
          </div>
          <div>
            <label className="text-stone-400 text-xs block mb-1.5">Description</label>
            <textarea value={form.description ?? ""} onChange={e => f("description", e.target.value)} rows={4}
              className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32] resize-none" />
          </div>
          <div>
            <label className="text-stone-400 text-xs block mb-2">Event Image</label>
            <MediaUploader bucket="media" onUploaded={url => f("image", url)} /* no currentUrl */ />
          </div>
          <div className="flex gap-3 pt-2">
            <Btn variant="secondary" onClick={() => setSlideOpen(false)} className="flex-1">Cancel</Btn>
            <Btn variant="primary" loading={saving} className="flex-1">{editing ? "Save" : "Create"}</Btn>
          </div>
        </form>
      </SlideOver>
    </PageShell>
  );
}
