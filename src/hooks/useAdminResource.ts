import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

interface UseAdminResourceOptions<T> {
  tableName: string;
  select?: string;
  orderBy?: { column: string; ascending?: boolean };
  map: (row: any) => T;
  /** Optional extra filter applied to every select query */
  filter?: (q: any) => any;
}

interface UseAdminResourceResult<T> {
  data: T[];
  loading: boolean;
  refresh: () => Promise<void>;
  insert: (payload: object) => Promise<{ error: any }>;
  update: (id: string, payload: object) => Promise<{ error: any }>;
  remove: (id: string) => Promise<{ error: any }>;
}

export function useAdminResource<T extends { id: string }>(
  opts: UseAdminResourceOptions<T>
): UseAdminResourceResult<T> {
  const { userProfile } = useAuth();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const adminEmail = userProfile?.email ?? "admin";

  const logAdminAction = useCallback(async (action: string, details: string) => {
    await supabase.from("audit_logs").insert({
      admin_email: adminEmail,
      action,
      details,
    });
  }, [adminEmail]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase.from(opts.tableName).select(opts.select ?? "*");
      if (opts.filter) q = opts.filter(q);
      if (opts.orderBy) q = q.order(opts.orderBy.column, { ascending: opts.orderBy.ascending ?? false });
      const { data: rows } = await q;
      if (rows) setData(rows.map(opts.map));
    } catch { /* ignore */ }
    setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchAll();
    const channel = supabase
      .channel(`admin_resource_${opts.tableName}`)
      .on("postgres_changes", { event: "*", schema: "public", table: opts.tableName }, fetchAll)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const insert = useCallback(async (payload: object) => {
    const { error } = await supabase.from(opts.tableName).insert(payload);
    if (!error) {
      await logAdminAction(`${opts.tableName} insert`, JSON.stringify(payload).slice(0, 200));
    }
    return { error };
  }, [opts.tableName, logAdminAction]);

  const update = useCallback(async (id: string, payload: object) => {
    const { error } = await supabase.from(opts.tableName).update(payload).eq("id", id);
    if (!error) {
      await logAdminAction(`${opts.tableName} update`, `id=${id}`);
    }
    return { error };
  }, [opts.tableName, logAdminAction]);

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase.from(opts.tableName).delete().eq("id", id);
    if (!error) {
      await logAdminAction(`${opts.tableName} delete`, `id=${id}`);
    }
    return { error };
  }, [opts.tableName, logAdminAction]);

  return { data, loading, refresh: fetchAll, insert, update, remove };
}
