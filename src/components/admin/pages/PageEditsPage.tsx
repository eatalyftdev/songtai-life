import { useState, useEffect, useCallback, type ReactNode } from "react";
import { ChevronDown, ChevronUp, Save, CheckCircle2, AlertCircle, ExternalLink, FileEdit, Info } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { pageRegistry, type FieldDef, type SectionDef } from "../../../lib/pageRegistry";
import PageShell from "../shared/PageShell";

// ── Helpers ───────────────────────────────────────────────────────────────────

function Btn({ onClick, disabled, children, variant = "primary" }: {
  onClick?: () => void; disabled?: boolean; children: ReactNode; variant?: "primary" | "ghost";
}) {
  return (
    <button
      type="button" onClick={onClick} disabled={disabled}
      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2 ${
        variant === "primary"
          ? "bg-emerald-700 hover:bg-emerald-600 text-white"
          : "bg-stone-800 hover:bg-stone-700 text-stone-300"
      }`}
    >
      {children}
    </button>
  );
}

// ── Field renderers ───────────────────────────────────────────────────────────

function TextField({ field, value, onChange }: { field: FieldDef; value: any; onChange: (v: any) => void }) {
  if (field.bilingual) {
    return (
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-stone-500 uppercase">{field.key.replace(/_/g, " ")}</label>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <span className="text-[10px] text-emerald-500 font-bold">EN</span>
            <input
              type="text"
              value={value?.[`${field.key}_en`] ?? ""}
              onChange={e => onChange({ ...value, [`${field.key}_en`]: e.target.value })}
              className="w-full px-3 py-2 bg-stone-950 border border-stone-800 focus:border-emerald-700 rounded-lg text-xs text-white outline-none"
              placeholder={`English ${field.key.replace(/_/g, " ")}`}
            />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-blue-400 font-bold">FR</span>
            <input
              type="text"
              value={value?.[`${field.key}_fr`] ?? ""}
              onChange={e => onChange({ ...value, [`${field.key}_fr`]: e.target.value })}
              className="w-full px-3 py-2 bg-stone-950 border border-stone-800 focus:border-emerald-700 rounded-lg text-xs text-white outline-none"
              placeholder={`French ${field.key.replace(/_/g, " ")}`}
            />
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-stone-500 uppercase">{field.key.replace(/_/g, " ")}</label>
      <input
        type="text"
        value={value?.[field.key] ?? ""}
        onChange={e => onChange({ ...value, [field.key]: e.target.value })}
        className="w-full px-3 py-2 bg-stone-950 border border-stone-800 focus:border-emerald-700 rounded-lg text-xs text-white outline-none"
        placeholder={field.key.replace(/_/g, " ")}
      />
    </div>
  );
}

function RichTextField({ field, value, onChange }: { field: FieldDef; value: any; onChange: (v: any) => void }) {
  if (field.bilingual) {
    return (
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-stone-500 uppercase">{field.key.replace(/_/g, " ")}</label>
        <div className="space-y-2">
          <div className="space-y-1">
            <span className="text-[10px] text-emerald-500 font-bold">EN</span>
            <textarea
              rows={4}
              value={value?.[`${field.key}_en`] ?? ""}
              onChange={e => onChange({ ...value, [`${field.key}_en`]: e.target.value })}
              className="w-full px-3 py-2 bg-stone-950 border border-stone-800 focus:border-emerald-700 rounded-lg text-xs text-white outline-none resize-y"
              placeholder={`English ${field.key.replace(/_/g, " ")}`}
            />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-blue-400 font-bold">FR</span>
            <textarea
              rows={4}
              value={value?.[`${field.key}_fr`] ?? ""}
              onChange={e => onChange({ ...value, [`${field.key}_fr`]: e.target.value })}
              className="w-full px-3 py-2 bg-stone-950 border border-stone-800 focus:border-emerald-700 rounded-lg text-xs text-white outline-none resize-y"
              placeholder={`French ${field.key.replace(/_/g, " ")}`}
            />
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-stone-500 uppercase">{field.key.replace(/_/g, " ")}</label>
      <textarea
        rows={4}
        value={value?.[field.key] ?? ""}
        onChange={e => onChange({ ...value, [field.key]: e.target.value })}
        className="w-full px-3 py-2 bg-stone-950 border border-stone-800 focus:border-emerald-700 rounded-lg text-xs text-white outline-none resize-y"
      />
    </div>
  );
}

function NumberField({ field, value, onChange }: { field: FieldDef; value: any; onChange: (v: any) => void }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-stone-500 uppercase">{field.key.replace(/_/g, " ")}</label>
      <input
        type="number"
        value={value?.[field.key] ?? ""}
        onChange={e => onChange({ ...value, [field.key]: Number(e.target.value) })}
        className="w-full px-3 py-2 bg-stone-950 border border-stone-800 focus:border-emerald-700 rounded-lg text-xs text-white outline-none"
      />
    </div>
  );
}

function ImageField({ field, value, onChange }: { field: FieldDef; value: any; onChange: (v: any) => void }) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-bold text-stone-500 uppercase">{field.key.replace(/_/g, " ")}</label>
      <input
        type="url"
        value={value?.[field.key] ?? ""}
        onChange={e => onChange({ ...value, [field.key]: e.target.value })}
        className="w-full px-3 py-2 bg-stone-950 border border-stone-800 focus:border-emerald-700 rounded-lg text-xs text-white outline-none font-mono"
        placeholder="https://..."
      />
      {value?.[field.key] && (
        <img src={value[field.key]} alt="preview" className="h-20 rounded-lg object-cover border border-stone-800 opacity-80" />
      )}
    </div>
  );
}

function RepeaterField({ field, value, onChange }: { field: FieldDef; value: any; onChange: (v: any) => void }) {
  const items: any[] = value?.[field.key] ?? [];
  const itemFields = field.itemFields ?? [];

  const addItem = () => {
    const blank: any = {};
    itemFields.forEach(f => {
      if (f.bilingual) { blank[`${f.key}_en`] = ""; blank[`${f.key}_fr`] = ""; }
      else blank[f.key] = "";
    });
    onChange({ ...value, [field.key]: [...items, blank] });
  };

  const removeItem = (idx: number) => {
    onChange({ ...value, [field.key]: items.filter((_, i) => i !== idx) });
  };

  const updateItem = (idx: number, updated: any) => {
    const next = [...items];
    next[idx] = updated;
    onChange({ ...value, [field.key]: next });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold text-stone-500 uppercase">{field.key.replace(/_/g, " ")} (list)</label>
        <button type="button" onClick={addItem} className="text-[10px] text-emerald-400 font-bold hover:text-emerald-300 cursor-pointer">+ Add item</button>
      </div>
      {items.map((item, idx) => (
        <div key={idx} className="bg-stone-950 border border-stone-800 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-stone-500 font-bold">Item {idx + 1}</span>
            <button type="button" onClick={() => removeItem(idx)} className="text-[10px] text-red-400 hover:text-red-300 cursor-pointer">Remove</button>
          </div>
          {itemFields.map(subField => (
            <FieldRenderer key={subField.key} field={subField} value={item} onChange={updated => updateItem(idx, updated)} />
          ))}
        </div>
      ))}
      {items.length === 0 && (
        <p className="text-stone-600 text-[10px] italic">No items yet — click "Add item" to start.</p>
      )}
    </div>
  );
}

function FieldRenderer({ field, value, onChange }: { field: FieldDef; value: any; onChange: (v: any) => void }) {
  switch (field.type) {
    case "text":       return <TextField field={field} value={value} onChange={onChange} />;
    case "richtext":   return <RichTextField field={field} value={value} onChange={onChange} />;
    case "number":     return <NumberField field={field} value={value} onChange={onChange} />;
    case "image":      return <ImageField field={field} value={value} onChange={onChange} />;
    case "repeater":   return <RepeaterField field={field} value={value} onChange={onChange} />;
    case "icon_select": return <TextField field={{ ...field, type: "text" }} value={value} onChange={onChange} />;
    default:           return null;
  }
}

// ── Section card ──────────────────────────────────────────────────────────────

function SectionCard({
  pageKey, sectionKey, section,
}: { pageKey: string; sectionKey: string; section: SectionDef }) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState<any>({});
  const [isNew, setIsNew] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  useEffect(() => {
    supabase.from("page_sections")
      .select("content")
      .eq("page_key", pageKey)
      .eq("section_key", sectionKey)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.content) { setContent(data.content); setIsNew(false); }
        else setIsNew(true);
      });
  }, [pageKey, sectionKey]);

  const save = useCallback(async () => {
    setSaving(true);
    setStatus("idle");
    const { error } = await supabase.from("page_sections").upsert({
      page_key: pageKey,
      section_key: sectionKey,
      content,
    }, { onConflict: "page_key,section_key" });

    if (error) {
      console.error("[PageEdits] save error:", error.message);
      setStatus("error");
    } else {
      setIsNew(false);
      setStatus("saved");
      // Log audit
      await supabase.from("audit_logs").insert({
        action: "page_section_update",
        table_name: "page_sections",
        record_id: `${pageKey}/${sectionKey}`,
        details: JSON.stringify(content).slice(0, 300),
      }).then(() => {});
      setTimeout(() => setStatus("idle"), 3000);
    }
    setSaving(false);
  }, [pageKey, sectionKey, content]);

  return (
    <div className="bg-stone-900/30 border border-stone-800 rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-stone-900/50 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <span className="text-white font-bold text-sm">{section.label}</span>
          {isNew && (
            <span className="text-[10px] font-bold text-amber-400 bg-amber-950/50 border border-amber-900/50 px-2 py-0.5 rounded-full">
              Not customized
            </span>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-stone-500" /> : <ChevronDown className="w-4 h-4 text-stone-500" />}
      </button>

      {open && (
        <div className="border-t border-stone-800 px-5 py-5 space-y-5">
          {isNew && (
            <div className="flex items-start gap-2 p-3 bg-amber-950/20 border border-amber-900/30 rounded-xl">
              <Info className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-amber-300">Not yet customized — the public page shows its default placeholder text until you save content here.</p>
            </div>
          )}

          {section.fields.map(field => (
            <FieldRenderer key={field.key} field={field} value={content} onChange={setContent} />
          ))}

          <div className="flex items-center gap-3 pt-2">
            <Btn onClick={save} disabled={saving}>
              {saving ? "Saving..." : <><Save className="w-3.5 h-3.5" /> Save section</>}
            </Btn>
            {status === "saved" && (
              <span className="flex items-center gap-1 text-emerald-400 text-xs font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Saved
              </span>
            )}
            {status === "error" && (
              <span className="flex items-center gap-1 text-red-400 text-xs font-bold">
                <AlertCircle className="w-3.5 h-3.5" /> Save failed
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PageEditsPage() {
  const pages = Object.entries(pageRegistry);
  const [selectedPageKey, setSelectedPageKey] = useState(pages[0]?.[0] ?? "");
  const selectedPage = pageRegistry[selectedPageKey];

  return (
    <PageShell title="Page Content Editor" subtitle="Edit static content for every public page. Changes go live instantly via Realtime.">
      <div className="grid grid-cols-12 gap-6 min-h-[600px]">

        {/* Left — page list */}
        <div className="col-span-12 md:col-span-3">
          <div className="bg-stone-900/30 border border-stone-800 rounded-2xl p-2 space-y-0.5 sticky top-6">
            <p className="text-[10px] font-bold text-stone-600 uppercase px-3 py-2">Pages</p>
            {pages.map(([key, page]) => (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedPageKey(key)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                  selectedPageKey === key
                    ? "bg-emerald-900/40 text-emerald-300 border border-emerald-800/40"
                    : "text-stone-400 hover:text-white hover:bg-stone-800/50"
                }`}
              >
                <span>{page.label}</span>
                <span className="text-[10px] text-stone-600">{Object.keys(page.sections).length}s</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right — section editor */}
        <div className="col-span-12 md:col-span-9 space-y-4">
          {selectedPage ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-white font-bold text-base">{selectedPage.label}</h2>
                  <p className="text-stone-500 text-xs mt-0.5">{Object.keys(selectedPage.sections).length} editable section{Object.keys(selectedPage.sections).length !== 1 ? "s" : ""}</p>
                </div>
                <a
                  href={selectedPage.publicPath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-white transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Preview page
                </a>
              </div>

              {Object.entries(selectedPage.sections).map(([sectionKey, section]) => (
                <SectionCard
                  key={`${selectedPageKey}/${sectionKey}`}
                  pageKey={selectedPageKey}
                  sectionKey={sectionKey}
                  section={section}
                />
              ))}
            </>
          ) : (
            <div className="flex items-center justify-center h-64 text-stone-600 text-sm">
              <div className="text-center space-y-2">
                <FileEdit className="w-10 h-10 mx-auto opacity-30" />
                <p>Select a page from the left to edit its content.</p>
              </div>
            </div>
          )}
        </div>

      </div>
    </PageShell>
  );
}
