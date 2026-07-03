import { useState, useEffect } from "react";
import { Send, Download } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import PageShell, { Card, TableWrapper, Th, Td, Btn, SearchInput } from "../shared/PageShell";
import { SkeletonTable } from "../shared/Skeleton";
import EmptyState from "../shared/EmptyState";

interface Subscriber { id: string; email: string; locale: string; createdAt: string; }

export default function NewsletterPage() {
  const [subs, setSubs] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("newsletter_subscribers").select("*").order("created_at", { ascending: false });
      setSubs((data ?? []).map(s => ({ id: s.id, email: s.email, locale: s.locale ?? "fr", createdAt: s.created_at })));
      setLoading(false);
    })();
  }, []);

  const filtered = subs.filter(s => !search || s.email.toLowerCase().includes(search.toLowerCase()));

  const handleExport = () => {
    if (!subs.length) return;
    const csv = "Email,Locale,SubscribedAt\n" + subs.map(s => `${s.email},${s.locale},${s.createdAt}`).join("\n");
    const link = document.createElement("a");
    link.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    link.download = `songtai_subscribers_${Date.now()}.csv`;
    link.click();
  };

  return (
    <PageShell
      title="Newsletter"
      subtitle={`${subs.length} subscribers`}
      actions={<Btn variant="secondary" onClick={handleExport}><Download className="w-3.5 h-3.5" /> Export CSV</Btn>}
    >
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Subscribers", value: subs.length },
          { label: "French (FR)", value: subs.filter(s => s.locale === "fr").length },
          { label: "English (EN)", value: subs.filter(s => s.locale === "en").length },
        ].map((stat, i) => (
          <div key={i}>
            <Card className="p-5">
              <p className="text-stone-500 text-xs uppercase font-semibold">{stat.label}</p>
              <p className="text-white text-2xl font-bold font-mono mt-1">{stat.value}</p>
            </Card>
          </div>
        ))}
      </div>

      <Card>
        <div className="flex gap-3 p-4 border-b border-stone-800">
          <SearchInput value={search} onChange={setSearch} placeholder="Search emails…" />
        </div>
        <TableWrapper>
          <thead><tr><Th>Email</Th><Th>Locale</Th><Th>Subscribed</Th></tr></thead>
          {loading ? <SkeletonTable cols={3} /> : (
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={3}><EmptyState icon={Send} title="No subscribers yet" /></td></tr>
              ) : filtered.map(s => (
                <tr key={s.id} className="border-b border-stone-800/50 hover:bg-stone-800/20">
                  <Td><span className="text-white text-xs">{s.email}</span></Td>
                  <Td><span className="text-stone-400 text-xs uppercase">{s.locale}</span></Td>
                  <Td><span className="text-stone-500 text-[10px]">{new Date(s.createdAt).toLocaleDateString()}</span></Td>
                </tr>
              ))}
            </tbody>
          )}
        </TableWrapper>
        <div className="px-4 py-3 border-t border-stone-800 text-stone-500 text-xs">Showing {filtered.length} of {subs.length}</div>
      </Card>
    </PageShell>
  );
}
