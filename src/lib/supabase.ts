/// <reference types="vite/client" />
// Thin REST client shim that mimics the subset of the supabase-js query builder
// API used throughout this codebase, backed by our own Express endpoints
// (Replit PostgreSQL via Drizzle) instead of Supabase.

const TABLE_TO_PATH: Record<string, string> = {
  product_categories: "product-categories",
  products: "products",
  blog_categories: "blog-categories",
  blog_posts: "blog-posts",
  events: "events",
  event_registrations: "event-registrations",
  gallery_albums: "gallery-albums",
  gallery_images: "gallery-images",
  testimonials: "testimonials",
  contact_messages: "contact-messages",
  newsletter_subscribers: "newsletter-subscribers",
  profiles: "profiles",
  distributors: "distributors",
  wallets: "wallets",
  wallet_transactions: "wallet-transactions",
  commissions: "commissions",
  withdrawals: "withdrawals",
  orders: "orders",
  kyc_documents: "kyc-documents",
  audit_logs: "audit-logs",
  site_settings: "site-settings",
  homepage_sections: "homepage-sections",
  page_sections: "page-sections",
  faq_categories: "faq-categories",
  faqs: "faqs",
  hero_carousel: "hero-carousel",
  appointment_types: "appointment-types",
  appointments: "appointments",
  media_files: "media",
};

function pathFor(table: string): string {
  return TABLE_TO_PATH[table] ?? table.replace(/_/g, "-");
}

async function request(method: string, url: string, body?: any) {
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
  if (res.status === 204) return { data: null, error: null };
  let json: any = null;
  try { json = await res.json(); } catch { /* no body */ }
  if (!res.ok) {
    return { data: null, error: { message: json?.error ?? `Request failed with status ${res.status}`, status: res.status } };
  }
  return { data: json, error: null };
}

class QueryBuilder {
  private table: string;
  private filters: Array<{ col: string; op: string; val: any }> = [];
  private orderCol: string | null = null;
  private orderAsc = true;
  private limitN: number | null = null;
  private wantSingle = false;
  private selectCols: string | null = null;

  constructor(table: string) {
    this.table = table;
  }

  select(cols?: string) {
    this.selectCols = cols ?? null;
    return this;
  }

  eq(col: string, val: any) {
    this.filters.push({ col, op: "eq", val });
    return this;
  }

  in(col: string, vals: any[]) {
    this.filters.push({ col, op: "in", val: vals.join(",") });
    return this;
  }

  gte(col: string, val: any) {
    this.filters.push({ col, op: "gte", val });
    return this;
  }

  lte(col: string, val: any) {
    this.filters.push({ col, op: "lte", val });
    return this;
  }

  gt(col: string, val: any) {
    this.filters.push({ col, op: "gt", val });
    return this;
  }

  lt(col: string, val: any) {
    this.filters.push({ col, op: "lt", val });
    return this;
  }

  neq(col: string, val: any) {
    this.filters.push({ col, op: "neq", val });
    return this;
  }

  like(col: string, val: any) {
    this.filters.push({ col, op: "ilike", val });
    return this;
  }

  ilike(col: string, val: any) {
    this.filters.push({ col, op: "ilike", val });
    return this;
  }

  is(col: string, val: any) {
    this.filters.push({ col, op: "is", val });
    return this;
  }

  not(col: string, _op: string, val: any) {
    this.filters.push({ col, op: "not", val });
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this.orderCol = col;
    this.orderAsc = opts?.ascending !== false;
    return this;
  }

  limit(n: number) {
    this.limitN = n;
    return this;
  }

  maybeSingle() {
    this.wantSingle = true;
    return this.exec("maybe");
  }

  single() {
    this.wantSingle = true;
    return this.exec("single");
  }

  // Awaiting the builder itself performs a list fetch (thenable, like supabase-js)
  then(resolve: any, reject: any) {
    return this.exec("list").then(resolve, reject);
  }

  private buildQuery(): string {
    const params = new URLSearchParams();
    for (const f of this.filters) {
      if (f.op === "eq") params.append(f.col, String(f.val));
      else if (f.op === "in") params.append(f.col, String(f.val));
      else params.append(f.col, `${f.op}.${f.val}`);
    }
    if (this.orderCol) params.append("order", `${this.orderCol}.${this.orderAsc ? "asc" : "desc"}`);
    if (this.limitN != null) params.append("limit", String(this.limitN));
    const qs = params.toString();
    return `/api/${pathFor(this.table)}${qs ? `?${qs}` : ""}`;
  }

  private async exec(mode: "list" | "single" | "maybe") {
    const { data, error } = await request("GET", this.buildQuery());
    if (error) return { data: null, error };
    const rows: any[] = Array.isArray(data) ? data : data ? [data] : [];
    if (mode === "list") return { data: rows, error: null };
    if (mode === "single") {
      if (rows.length === 0) return { data: null, error: { message: "No rows found" } };
      return { data: rows[0], error: null };
    }
    return { data: rows[0] ?? null, error: null };
  }

  async insert(values: any) {
    const { data, error } = await request("POST", `/api/${pathFor(this.table)}`, values);
    return { data, error };
  }

  async upsert(values: any) {
    const { data, error } = await request("PUT", `/api/${pathFor(this.table)}`, values);
    return { data, error };
  }

  update(values: any) {
    const table = this.table;
    const filters = this.filters;
    return {
      eq: async (col: string, val: any) => {
        const id = filters.find((f) => f.col === "id")?.val ?? val;
        void col;
        const { data, error } = await request("PATCH", `/api/${pathFor(table)}/${id}`, values);
        return { data, error };
      },
    };
  }

  delete() {
    const table = this.table;
    return {
      eq: async (_col: string, val: any) => {
        const { data, error } = await request("DELETE", `/api/${pathFor(table)}/${val}`);
        return { data, error };
      },
    };
  }
}

function noopChannel() {
  const channel = {
    on() { return channel; },
    subscribe() { return channel; },
  };
  return channel;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// name -> media id lookup, populated by list() so getPublicUrl/remove can resolve
// the underlying record from the human-readable filename.
const nameToId = new Map<string, string>();

function storageBucket(bucket: string) {
  return {
    async upload(path: string, file: File, _opts?: any) {
      const slashIdx = path.lastIndexOf("/");
      const folder = slashIdx >= 0 ? path.slice(0, slashIdx) : "";
      const filename = slashIdx >= 0 ? path.slice(slashIdx + 1) : path;
      const dataBase64 = await fileToBase64(file);
      const { data, error } = await request("POST", "/api/media/upload", {
        bucket, folder, filename, mimeType: file.type, dataBase64,
      });
      if (error) return { data: null, error };
      nameToId.set(`${bucket}/${filename}`, data.id);
      return { data: { path: filename, id: data.id }, error: null };
    },
    getPublicUrl(path: string) {
      const id = nameToId.get(`${bucket}/${path}`) ?? path;
      return { data: { publicUrl: `/api/media/${id}` } };
    },
    async list(_prefix?: string, _opts?: any) {
      const { data, error } = await request("GET", "/api/media");
      if (error) return { data: null, error };
      const items = (data ?? []).filter((f: any) => f.bucket === bucket);
      const mapped = items.map((f: any) => {
        nameToId.set(`${bucket}/${f.filename}`, f.id);
        return {
          name: f.filename,
          id: f.id,
          created_at: f.createdAt,
          metadata: { size: f.sizeBytes, mimetype: f.mimeType },
        };
      });
      return { data: mapped, error: null };
    },
    async remove(paths: string[]) {
      for (const p of paths) {
        const id = nameToId.get(`${bucket}/${p}`) ?? p;
        const { error } = await request("DELETE", `/api/media/${id}`);
        if (error) return { data: null, error };
      }
      return { data: null, error: null };
    },
  };
}

export const supabase = {
  from(table: string) {
    return new QueryBuilder(table);
  },
  channel(_name: string) {
    return noopChannel();
  },
  removeChannel(_channel: any) {
    // no realtime backend — no-op
  },
  rpc(_fn: string, _args?: any) {
    return Promise.resolve({ data: null, error: null });
  },
  storage: {
    from(bucket: string) {
      return storageBucket(bucket);
    },
  },
};
