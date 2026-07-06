import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

/**
 * Fetches a single page_sections row by (pageKey, sectionKey) and subscribes
 * to Realtime so admin edits propagate live to the public page.
 */
export function usePageSection<T extends Record<string, unknown>>(
  pageKey: string,
  sectionKey: string,
  defaults: T
): { content: T; loading: boolean; reload: () => void } {
  const [content, setContent] = useState<T>(defaults);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("page_sections")
      .select("content")
      .eq("page_key", pageKey)
      .eq("section_key", sectionKey)
      .maybeSingle();

    if (!error && data?.content) {
      setContent({ ...defaults, ...(data.content as Partial<T>) });
    }
    setLoading(false);
  }, [pageKey, sectionKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();

    const ch = supabase
      .channel(`page_section_${pageKey}_${sectionKey}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "page_sections",
          filter: `page_key=eq.${pageKey}`,
        },
        (payload) => {
          const row = payload.new as { section_key?: string; content?: Partial<T> };
          if (row.section_key === sectionKey && row.content) {
            setContent({ ...defaults, ...row.content });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [pageKey, sectionKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return { content, loading, reload: load };
}
