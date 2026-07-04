import React from "react";
import { useState, useEffect } from "react";
import { BookOpen, Plus, Edit, Trash2 } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import PageShell, { Card, TableWrapper, Th, Td, Btn, SearchInput, Select } from "../shared/PageShell";
import SlideOver from "../shared/SlideOver";
import { SkeletonTable } from "../shared/Skeleton";
import EmptyState from "../shared/EmptyState";
import StatusBadge from "../shared/StatusBadge";
import MediaUploader from "../../MediaUploader";

interface BlogPost {
  id: string; slug: string; title: string; titleFr: string; excerpt: string;
  body: string; category: string; author: string; image: string;
  status: string; publishedAt: string;
}

const BLANK: Partial<BlogPost> = {
  title: "", titleFr: "", slug: "", excerpt: "", body: "", category: "Wellness",
  author: "Corporate Admin", image: "", status: "draft",
};

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [slideOpen, setSlideOpen] = useState(false);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [form, setForm] = useState<Partial<BlogPost>>(BLANK);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("blog_posts").select("*").order("created_at", { ascending: false });
    setPosts((data ?? []).map(b => ({
      id: b.id, slug: b.slug ?? "", title: b.title ?? "", titleFr: b.title_fr ?? "",
      excerpt: b.excerpt ?? "", body: b.body ?? "", category: b.category ?? "",
      author: b.author ?? "", image: b.image ?? "", status: b.status ?? "draft",
      publishedAt: b.published_at ?? "",
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = posts.filter(p => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    const q = search.toLowerCase();
    return !q || p.title.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
  });

  const openAdd = () => { setEditing(null); setForm(BLANK); setSlideOpen(true); };
  const openEdit = (p: BlogPost) => { setEditing(p); setForm(p); setSlideOpen(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const payload = {
      slug: form.slug || `blog-${Date.now()}`, title: form.title, title_fr: form.titleFr || null,
      excerpt: form.excerpt, body: form.body, category: form.category,
      author: form.author, image: form.image, status: form.status,
      published_at: form.status === "published" ? new Date().toISOString().slice(0,10) : null,
    };
    if (editing) await supabase.from("blog_posts").update(payload).eq("id", editing.id);
    else await supabase.from("blog_posts").insert(payload);
    await supabase.from("audit_logs").insert({ action: editing ? "Blog Updated" : "Blog Created", details: form.title });
    setSaving(false); setSlideOpen(false); load();
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return;
    await supabase.from("blog_posts").delete().eq("id", id);
    load();
  };

  const handlePublish = async (id: string) => {
    await supabase.from("blog_posts").update({ status: "published", published_at: new Date().toISOString().slice(0,10) }).eq("id", id);
    load();
  };

  const f = (k: keyof BlogPost, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <PageShell title="Blog" subtitle={`${posts.length} posts`} actions={<Btn variant="primary" onClick={openAdd}><Plus className="w-3.5 h-3.5" /> New Post</Btn>}>
      <Card>
        <div className="flex flex-wrap gap-3 p-4 border-b border-stone-800">
          <SearchInput value={search} onChange={setSearch} placeholder="Search posts…" />
          <Select value={statusFilter} onChange={setStatusFilter}>
            <option value="all">All</option>
            {["draft","published","archived"].map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
        <TableWrapper>
          <thead><tr><Th>Title</Th><Th>Category</Th><Th>Author</Th><Th>Status</Th><Th>Published</Th><Th>Actions</Th></tr></thead>
          {loading ? <SkeletonTable cols={6} /> : (
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6}><EmptyState icon={BookOpen} title="No posts yet" action={{ label: "Write first post", onClick: openAdd }} /></td></tr>
              ) : filtered.map(p => (
                <tr key={p.id} className="border-b border-stone-800/50 hover:bg-stone-800/20">
                  <Td>
                    <div className="flex items-center gap-3">
                      {p.image && <img src={p.image} className="w-9 h-9 rounded-lg object-cover flex-shrink-0 bg-stone-800" />}
                      <div>
                        <p className="text-white font-medium text-xs">{p.title}</p>
                        {p.titleFr && <p className="text-stone-500 text-[10px]">{p.titleFr}</p>}
                      </div>
                    </div>
                  </Td>
                  <Td><span className="text-stone-400 text-[11px]">{p.category}</span></Td>
                  <Td><span className="text-stone-400 text-[11px]">{p.author}</span></Td>
                  <Td><StatusBadge status={p.status} /></Td>
                  <Td><span className="text-stone-500 text-[10px]">{p.publishedAt || "—"}</span></Td>
                  <Td>
                    <div className="flex gap-1.5">
                      {p.status === "draft" && <Btn variant="primary" size="xs" onClick={() => handlePublish(p.id)}>Publish</Btn>}
                      <Btn variant="ghost" size="xs" onClick={() => openEdit(p)}><Edit className="w-3 h-3" /></Btn>
                      <Btn variant="danger" size="xs" onClick={() => handleDelete(p.id, p.title)}><Trash2 className="w-3 h-3" /></Btn>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          )}
        </TableWrapper>
      </Card>

      <SlideOver open={slideOpen} onClose={() => setSlideOpen(false)} title={editing ? "Edit Post" : "New Post"} width="w-full max-w-2xl">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-stone-400 text-xs block mb-1.5">Title (EN) *</label>
              <input value={form.title ?? ""} onChange={e => f("title", e.target.value)} required
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32]" />
            </div>
            <div>
              <label className="text-stone-400 text-xs block mb-1.5">Title (FR)</label>
              <input value={form.titleFr ?? ""} onChange={e => f("titleFr", e.target.value)}
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32]" />
            </div>
          </div>
          <div>
            <label className="text-stone-400 text-xs block mb-1.5">Slug</label>
            <input value={form.slug ?? ""} onChange={e => f("slug", e.target.value)} placeholder="auto-generated"
              className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32]" />
          </div>
          <div>
            <label className="text-stone-400 text-xs block mb-1.5">Excerpt</label>
            <textarea value={form.excerpt ?? ""} onChange={e => f("excerpt", e.target.value)} rows={2}
              className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32] resize-none" />
          </div>
          <div>
            <label className="text-stone-400 text-xs block mb-1.5">Body</label>
            <textarea value={form.body ?? ""} onChange={e => f("body", e.target.value)} rows={8}
              className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32] resize-none font-mono" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-stone-400 text-xs block mb-1.5">Category</label>
              <input value={form.category ?? ""} onChange={e => f("category", e.target.value)}
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32]" />
            </div>
            <div>
              <label className="text-stone-400 text-xs block mb-1.5">Author</label>
              <input value={form.author ?? ""} onChange={e => f("author", e.target.value)}
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32]" />
            </div>
            <div>
              <label className="text-stone-400 text-xs block mb-1.5">Status</label>
              <select value={form.status ?? "draft"} onChange={e => f("status", e.target.value)}
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#0A7D32] cursor-pointer">
                {["draft","published","archived"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-stone-400 text-xs block mb-2">Featured Image</label>
            <MediaUploader bucket="media" folder="blog" onUploaded={url => f("image", url)} />
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
