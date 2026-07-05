import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

/**
 * Fetches a single homepage_sections row by key and subscribes to Realtime
 * so admin edits propagate live. Returns the JSONB content and a setter used
 * by the admin panel to optimistically update the UI after a save.
 */
export function useHomepageSection<T extends Record<string, unknown>>(
  sectionKey: string,
  defaults: T
): { content: T; loading: boolean; reload: () => void } {
  const [content, setContent] = useState<T>(defaults);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("homepage_sections")
      .select("content")
      .eq("section_key", sectionKey)
      .maybeSingle();

    if (!error && data?.content) {
      // Merge DB content over defaults so missing DB keys still get the fallback value
      setContent({ ...defaults, ...(data.content as Partial<T>) });
    }
    setLoading(false);
  }, [sectionKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`homepage_section_${sectionKey}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "homepage_sections" },
        (payload) => {
          const row = payload.new as { section_key?: string; content?: Partial<T> };
          if (row.section_key === sectionKey && row.content) {
            setContent({ ...defaults, ...row.content });
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [sectionKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return { content, loading, reload: load };
}
