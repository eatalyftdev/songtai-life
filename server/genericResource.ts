import type { Express, RequestHandler } from "express";
import { and, asc, desc, eq, gt, gte, ilike, inArray, isNull, isNotNull, lt, lte, ne, type SQL } from "drizzle-orm";
import { db } from "./db";
import { auditLogs } from "../shared/models/app";

function toCamelCase(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
}

function normalizeBody(table: any, body: any): any {
  if (!body || typeof body !== "object" || Array.isArray(body)) return body;
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(body)) {
    const camel = toCamelCase(key);
    if (table[camel] !== undefined) {
      out[camel] = value;
    } else if (table[key] !== undefined) {
      out[key] = value;
    }
  }
  return out;
}

export async function logAdminAction(actorEmail: string | undefined, action: string, details: string) {
  try {
    await db.insert(auditLogs).values({
      adminEmail: actorEmail ?? "unknown",
      action,
      details: details.slice(0, 500),
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}

interface ResourceOptions {
  /** Public GET (list/single) with no auth required */
  publicRead?: boolean;
  /** Require auth (any logged in user) for read */
  authRead?: boolean;
  /** Middleware(s) required for write operations (insert/update/delete). Defaults to admin-only. */
  writeGuard?: RequestHandler[];
  /** Middleware(s) required for read operations if not public. */
  readGuard?: RequestHandler[];
  /** Columns allowed to be set on insert/update (defaults to all table columns except id). */
  allowInsert?: boolean;
  allowUpdate?: boolean;
  allowDelete?: boolean;
}

/**
 * Registers a generic REST CRUD surface for a Drizzle table at /api/<basePath>.
 * GET    /api/<basePath>        -> list (optional ?col=value filters, ?order=col.asc|desc, ?limit=n)
 * GET    /api/<basePath>/:id    -> single row
 * POST   /api/<basePath>        -> insert
 * PATCH  /api/<basePath>/:id    -> update
 * DELETE /api/<basePath>/:id    -> delete
 */
export function registerResource(
  app: Express,
  basePath: string,
  table: any,
  opts: ResourceOptions = {}
) {
  const route = `/api/${basePath}`;
  const idCol = table.id;

  const readMw: RequestHandler[] = opts.publicRead ? [] : opts.readGuard ?? [];
  const writeMw: RequestHandler[] = opts.writeGuard ?? [];

  app.get(route, ...readMw, async (req: any, res) => {
    try {
      const conditions: SQL[] = [];
      for (const [key, value] of Object.entries(req.query)) {
        if (key === "order" || key === "limit") continue;
        const col = table[key] !== undefined ? key : toCamelCase(key);
        if (table[col] !== undefined) {
          const raw = value as string;
          const opMatch = typeof raw === "string" ? raw.match(/^(gte|lte|gt|lt|neq|ilike|is|not)\.(.*)$/s) : null;
          if (opMatch) {
            const [, op, opVal] = opMatch;
            const colType = table[col]?.dataType;
            const isDateVal = colType === "date" && /^\d{4}-\d{2}-\d{2}T.*Z?$/.test(opVal);
            const castVal: any = isDateVal ? new Date(opVal) : opVal;
            switch (op) {
              case "gte": conditions.push(gte(table[col], castVal)); break;
              case "lte": conditions.push(lte(table[col], castVal)); break;
              case "gt": conditions.push(gt(table[col], castVal)); break;
              case "lt": conditions.push(lt(table[col], castVal)); break;
              case "neq": conditions.push(ne(table[col], castVal)); break;
              case "ilike": conditions.push(ilike(table[col], opVal.replace(/^%|%$/g, "%")));  break;
              case "is": conditions.push(opVal === "null" ? isNull(table[col]) : isNotNull(table[col])); break;
              case "not": conditions.push(isNotNull(table[col])); break;
            }
          } else if (typeof raw === "string" && raw.includes(",")) {
            conditions.push(inArray(table[col], raw.split(",")));
          } else {
            conditions.push(eq(table[col], value as any));
          }
        }
      }
      let query: any = db.select().from(table);
      if (conditions.length) query = query.where(and(...conditions));
      if (typeof req.query.order === "string") {
        const [col, dir] = req.query.order.split(".");
        if (table[col] !== undefined) {
          query = query.orderBy(dir === "desc" ? desc(table[col]) : asc(table[col]));
        }
      }
      if (req.query.limit) {
        query = query.limit(Number(req.query.limit));
      }
      const rows = await query;
      res.json(rows);
    } catch (err: any) {
      console.error(`GET ${route} failed:`, err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get(`${route}/:id`, ...readMw, async (req: any, res) => {
    try {
      const [row] = await db.select().from(table).where(eq(idCol, req.params.id));
      if (!row) return res.status(404).json({ error: "Not found" });
      res.json(row);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  if (opts.allowInsert !== false) {
    app.post(route, ...writeMw, async (req: any, res) => {
      try {
        const body = normalizeBody(table, req.body);
        const [row] = await db.insert(table).values(body).returning();
        await logAdminAction(req.user?.claims?.email, `${basePath} insert`, JSON.stringify(body).slice(0, 200));
        res.status(201).json(row);
      } catch (err: any) {
        console.error(`POST ${route} failed:`, err);
        res.status(400).json({ error: err.message });
      }
    });
  }

  if (opts.allowUpdate !== false) {
    app.patch(`${route}/:id`, ...writeMw, async (req: any, res) => {
      try {
        const body = normalizeBody(table, req.body);
        const [row] = await db.update(table).set(body).where(eq(idCol, req.params.id)).returning();
        if (!row) return res.status(404).json({ error: "Not found" });
        await logAdminAction(req.user?.claims?.email, `${basePath} update`, `id=${req.params.id}`);
        res.json(row);
      } catch (err: any) {
        console.error(`PATCH ${route} failed:`, err);
        res.status(400).json({ error: err.message });
      }
    });
    // Also support supabase-style upsert via PUT for convenience
    app.put(route, ...writeMw, async (req: any, res) => {
      try {
        const rawRows = Array.isArray(req.body) ? req.body : [req.body];
        const rows = rawRows.map((r: any) => normalizeBody(table, r));
        const results = [];
        for (const row of rows) {
          const [result] = await db
            .insert(table)
            .values(row)
            .onConflictDoUpdate({ target: idCol, set: row })
            .returning();
          results.push(result);
        }
        await logAdminAction(req.user?.claims?.email, `${basePath} upsert`, JSON.stringify(rows).slice(0, 200));
        res.json(Array.isArray(req.body) ? results : results[0]);
      } catch (err: any) {
        console.error(`PUT ${route} failed:`, err);
        res.status(400).json({ error: err.message });
      }
    });
  }

  if (opts.allowDelete !== false) {
    app.delete(`${route}/:id`, ...writeMw, async (req: any, res) => {
      try {
        await db.delete(table).where(eq(idCol, req.params.id));
        await logAdminAction(req.user?.claims?.email, `${basePath} delete`, `id=${req.params.id}`);
        res.status(204).end();
      } catch (err: any) {
        res.status(400).json({ error: err.message });
      }
    });
  }
}
