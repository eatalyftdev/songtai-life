import type { Express } from "express";
import crypto from "crypto";
import { eq, desc } from "drizzle-orm";
import { db } from "./db";
import { isAuthenticated } from "./replit_integrations/auth/replitAuth";
import { registerResource, logAdminAction } from "./genericResource";
import { getMeSombClient } from "./mesomb";
import {
  productCategories, products, blogCategories, blogPosts, events, eventRegistrations,
  galleryAlbums, galleryImages, testimonials, contactMessages, newsletterSubscribers,
  profiles, distributors, wallets, walletTransactions, commissions, withdrawals,
  orders, kycDocuments, processedPayments, mesombWebhookEvents, auditLogs, rateLimitEvents,
  siteSettings, homepageSections, pageSections, faqCategories, faqs, heroCarousel,
  appointmentTypes, appointments, mediaFiles,
} from "../shared/models/app";

// ── Admin authorization middleware ──────────────────────────────────────────
async function requireAdmin(req: any, res: any, next: any) {
  const uid = req.user?.claims?.sub;
  if (!uid) return res.status(401).json({ error: "Authentication required." });
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, uid));
  if (!profile || !["admin", "superadmin"].includes(profile.role)) {
    return res.status(403).json({ error: "Forbidden." });
  }
  req.profile = profile;
  next();
}

async function requireSuperadmin(req: any, res: any, next: any) {
  const uid = req.user?.claims?.sub;
  if (!uid) return res.status(401).json({ error: "Authentication required." });
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, uid));
  if (!profile || profile.role !== "superadmin") {
    return res.status(403).json({ error: "Forbidden." });
  }
  next();
}

// Simple in-memory rate limiter helper
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
function rateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const b = rateBuckets.get(key);
  if (!b || now >= b.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  if (b.count >= max) return true;
  b.count++;
  return false;
}

// ── MLM commission engine (unilevel, ported from server.ts) ────────────────
async function awardCommission(uid: string, orderId: string, type: string, level: number, amountXaf: number, description: string) {
  if (amountXaf <= 0) return;
  const [wallet] = await db.select().from(wallets).where(eq(wallets.id, uid));
  if (wallet) {
    await db.update(wallets).set({ balanceXaf: (wallet.balanceXaf ?? 0) + amountXaf, updatedAt: new Date() }).where(eq(wallets.id, uid));
  } else {
    await db.insert(wallets).values({ id: uid, balanceXaf: amountXaf });
  }
  await db.insert(commissions).values({ distributorId: uid, orderId, type, level, amountXaf, status: "completed" });
  await db.insert(walletTransactions).values({ walletId: uid, type: "commission", amountXaf, referenceId: orderId, description, status: "completed" });
  console.log(`[MLM-Engine] Credited ${amountXaf} XAF to ${uid} (Level ${level} ${type})`);
}

async function calculateUnilevelCommissions(orderId: string, purchaserUid: string, amountXaf: number, pvPoints: number) {
  try {
    const [purchaser] = await db.select().from(distributors).where(eq(distributors.id, purchaserUid));
    if (!purchaser) {
      console.log(`[MLM-Engine] ${purchaserUid} is not a distributor. Skipping commissions.`);
      return;
    }

    const newPv = (purchaser.pv ?? 0) + pvPoints;
    let nextRank = purchaser.rank ?? "bronze";
    if (newPv >= 10000) nextRank = "diamond";
    else if (newPv >= 5000) nextRank = "platinum";
    else if (newPv >= 2000) nextRank = "gold";
    else if (newPv >= 500) nextRank = "silver";
    await db.update(distributors).set({ pv: newPv, rank: nextRank }).where(eq(distributors.id, purchaserUid));

    const rates = [0.10, 0.05, 0.03, 0.02, 0.01];
    let currentUid = purchaserUid;

    for (let level = 0; level < rates.length; level++) {
      if (level === 0) {
        const payout = Math.floor(amountXaf * rates[level]);
        await awardCommission(purchaserUid, orderId, "direct_bonus", level, payout, `Direct Purchase Volume Bonus (${rates[level] * 100}%)`);
      } else {
        const [currentDist] = await db.select().from(distributors).where(eq(distributors.id, currentUid));
        if (!currentDist?.sponsorId || currentDist.sponsorId === "Root") break;
        const [sponsorDoc] = await db.select().from(distributors).where(eq(distributors.distributorCode, currentDist.sponsorId));
        if (!sponsorDoc) break;
        const payout = Math.floor(amountXaf * rates[level]);
        await awardCommission(sponsorDoc.id, orderId, "unilevel_override", level, payout, `Generation ${level} Unilevel Override (${rates[level] * 100}%)`);
        currentUid = sponsorDoc.id;
      }
    }
  } catch (err: any) {
    console.error("[MLM-Engine-Error]", err.message);
  }
}

// ── Twilio WhatsApp order notification ──────────────────────────────────────
async function sendOrderWhatsApp(toNumber: string, order: { orderId: string; amountXaf: number; customerName?: string | null; customerPhone?: string | null; deliveryAddress?: string | null; deliveryNotes?: string | null; cart: any[] }) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_WHATSAPP_FROM;
  if (!accountSid || !authToken || !fromNumber) {
    return { success: false, error: "Twilio credentials not configured." };
  }
  const to = toNumber.startsWith("whatsapp:") ? toNumber : `whatsapp:${toNumber}`;
  const items = (order.cart ?? []).map((i: any) => `  • ${i.name ?? i.id} ×${i.qty ?? 1}`).join("\n");
  const body = [
    `🛒 *New Songtai Life Order*`, ``,
    `*Order ID:* ${order.orderId}`, `*Amount:* ${order.amountXaf.toLocaleString()} XAF`, ``,
    `*Customer:* ${order.customerName || "—"}`, `*Phone:* ${order.customerPhone || "—"}`, ``,
    `*Delivery Address:*`, order.deliveryAddress || "Not provided",
    ...(order.deliveryNotes ? [``, `*Notes:* ${order.deliveryNotes}`] : []),
    ``, `*Items:*`, items || "  (no items)",
  ].join("\n");
  try {
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: "POST",
      headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ From: fromNumber, To: to, Body: body }).toString(),
    });
    if (!response.ok) {
      const text = await response.text();
      return { success: false, error: `Twilio error ${response.status}: ${text.slice(0, 200)}` };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// SSRF guard for image rehost
function isSsrfSafeUrl(rawUrl: string): boolean {
  let parsed: URL;
  try { parsed = new URL(rawUrl); } catch { return false; }
  if (!["http:", "https:"].includes(parsed.protocol)) return false;
  const h = parsed.hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return false;
  const ipv4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [, a, b] = ipv4.map(Number);
    if (a === 10 || a === 127 || a === 0) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 169 && b === 254) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
  }
  if (h === "::1" || h === "[::1]") return false;
  return true;
}

export function registerAppRoutes(app: Express) {
  // ═══════════════════════════════════════════════════════════════════════
  // PROFILE / DISTRIBUTOR / WALLET — session-bound endpoints
  // ═══════════════════════════════════════════════════════════════════════

  // Fetch (or lazily create) the current user's app profile
  app.get("/api/profile", isAuthenticated, async (req: any, res) => {
    const uid = req.user.claims.sub;
    let [profile] = await db.select().from(profiles).where(eq(profiles.id, uid));
    if (!profile) {
      [profile] = await db.insert(profiles).values({
        id: uid,
        email: req.user.claims.email ?? "",
        role: "customer",
        locale: "fr",
      }).returning();
    }
    const [distributor] = await db.select().from(distributors).where(eq(distributors.id, uid));
    const [wallet] = await db.select().from(wallets).where(eq(wallets.id, uid));
    res.json({ profile, distributor: distributor ?? null, wallet: wallet ?? null });
  });

  app.patch("/api/profile", isAuthenticated, async (req: any, res) => {
    const uid = req.user.claims.sub;
    const { phone, locale, privacyAcceptedAt, privacyAcceptedVersion } = req.body;
    const updates: any = {};
    if (phone !== undefined) updates.phone = phone;
    if (locale !== undefined) updates.locale = locale;
    if (privacyAcceptedAt !== undefined) updates.privacyAcceptedAt = privacyAcceptedAt;
    if (privacyAcceptedVersion !== undefined) updates.privacyAcceptedVersion = privacyAcceptedVersion;
    const [profile] = await db.update(profiles).set(updates).where(eq(profiles.id, uid)).returning();
    res.json(profile);
  });

  // Become a distributor
  app.post("/api/become-distributor", isAuthenticated, async (req: any, res) => {
    const uid = req.user.claims.sub;
    const { sponsorCode } = req.body;

    const [existing] = await db.select().from(distributors).where(eq(distributors.id, uid));
    if (existing) return res.json({ distributor: existing });

    const distributorCode = `ST-${Math.floor(100000 + Math.random() * 900000)}`;
    const [distributor] = await db.insert(distributors).values({
      id: uid,
      distributorCode,
      sponsorId: sponsorCode || null,
      placementId: sponsorCode || null,
      rank: "bronze",
      kycStatus: "none",
    }).returning();

    await db.update(profiles).set({ role: "distributor" }).where(eq(profiles.id, uid));
    await db.insert(wallets).values({ id: uid, balanceXaf: 0 }).onConflictDoNothing();

    res.json({ distributor });
  });

  app.get("/api/wallet-transactions", isAuthenticated, async (req: any, res) => {
    const uid = req.user.claims.sub;
    const rows = await db.select().from(walletTransactions).where(eq(walletTransactions.walletId, uid)).orderBy(desc(walletTransactions.createdAt));
    res.json(rows);
  });

  app.get("/api/commissions", isAuthenticated, async (req: any, res) => {
    const uid = req.user.claims.sub;
    const rows = await db.select().from(commissions).where(eq(commissions.distributorId, uid)).orderBy(desc(commissions.createdAt));
    res.json(rows);
  });

  app.post("/api/kyc-documents", isAuthenticated, async (req: any, res) => {
    const uid = req.user.claims.sub;
    const { documentType, fileUrl } = req.body;
    const id = `kyc-${crypto.randomBytes(6).toString("hex")}`;
    const [doc] = await db.insert(kycDocuments).values({ id, distributorId: uid, documentType, fileUrl, status: "pending" }).returning();
    await db.update(distributors).set({ kycStatus: "pending" }).where(eq(distributors.id, uid));
    res.json(doc);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // PUBLIC READ / WRITE — content the storefront needs (no auth)
  // ═══════════════════════════════════════════════════════════════════════
  registerResource(app, "product-categories", productCategories, { publicRead: true, writeGuard: [isAuthenticated, requireAdmin] });
  registerResource(app, "products", products, { publicRead: true, writeGuard: [isAuthenticated, requireAdmin] });
  registerResource(app, "blog-categories", blogCategories, { publicRead: true, writeGuard: [isAuthenticated, requireAdmin] });
  registerResource(app, "blog-posts", blogPosts, { publicRead: true, writeGuard: [isAuthenticated, requireAdmin] });
  registerResource(app, "events", events, { publicRead: true, writeGuard: [isAuthenticated, requireAdmin] });
  registerResource(app, "gallery-albums", galleryAlbums, { publicRead: true, writeGuard: [isAuthenticated, requireAdmin] });
  registerResource(app, "gallery-images", galleryImages, { publicRead: true, writeGuard: [isAuthenticated, requireAdmin] });
  registerResource(app, "testimonials", testimonials, { publicRead: true, writeGuard: [isAuthenticated, requireAdmin] });
  registerResource(app, "faq-categories", faqCategories, { publicRead: true, writeGuard: [isAuthenticated, requireAdmin] });
  registerResource(app, "faqs", faqs, { publicRead: true, writeGuard: [isAuthenticated, requireAdmin] });
  registerResource(app, "hero-carousel", heroCarousel, { publicRead: true, writeGuard: [isAuthenticated, requireAdmin] });
  registerResource(app, "site-settings", siteSettings, { publicRead: true, writeGuard: [isAuthenticated, requireAdmin] });
  registerResource(app, "homepage-sections", homepageSections, { publicRead: true, writeGuard: [isAuthenticated, requireAdmin] });
  registerResource(app, "page-sections", pageSections, { publicRead: true, writeGuard: [isAuthenticated, requireAdmin] });
  registerResource(app, "appointment-types", appointmentTypes, { publicRead: true, writeGuard: [isAuthenticated, requireAdmin] });

  // Public-writable (anyone can submit)
  registerResource(app, "contact-messages", contactMessages, { readGuard: [isAuthenticated, requireAdmin], writeGuard: [], allowUpdate: false, allowDelete: false });
  app.patch("/api/contact-messages/:id", isAuthenticated, requireAdmin, async (req: any, res) => {
    const [row] = await db.update(contactMessages).set(req.body).where(eq(contactMessages.id, req.params.id)).returning();
    res.json(row);
  });
  registerResource(app, "newsletter-subscribers", newsletterSubscribers, { readGuard: [isAuthenticated, requireAdmin], writeGuard: [], allowUpdate: false, allowDelete: false });
  registerResource(app, "appointments", appointments, { readGuard: [isAuthenticated, requireAdmin], writeGuard: [], allowDelete: false });
  app.patch("/api/appointments/:id", isAuthenticated, requireAdmin, async (req: any, res) => {
    const [row] = await db.update(appointments).set(req.body).where(eq(appointments.id, req.params.id)).returning();
    res.json(row);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // ADMIN-ONLY RESOURCES
  // ═══════════════════════════════════════════════════════════════════════
  registerResource(app, "distributors", distributors, { readGuard: [isAuthenticated, requireAdmin], writeGuard: [isAuthenticated, requireAdmin] });
  registerResource(app, "wallets", wallets, { readGuard: [isAuthenticated, requireAdmin], writeGuard: [isAuthenticated, requireAdmin] });
  registerResource(app, "withdrawals", withdrawals, { readGuard: [isAuthenticated, requireAdmin], writeGuard: [isAuthenticated, requireAdmin] });
  registerResource(app, "orders", orders, { readGuard: [isAuthenticated, requireAdmin], writeGuard: [isAuthenticated, requireAdmin] });
  registerResource(app, "audit-logs", auditLogs, { readGuard: [isAuthenticated, requireAdmin], writeGuard: [isAuthenticated, requireAdmin], allowUpdate: false, allowDelete: false });
  registerResource(app, "profiles", profiles, { readGuard: [isAuthenticated, requireAdmin], writeGuard: [isAuthenticated, requireAdmin] });
  registerResource(app, "kyc-documents", kycDocuments, { readGuard: [isAuthenticated, requireAdmin], writeGuard: [isAuthenticated, requireAdmin] });

  // ═══════════════════════════════════════════════════════════════════════
  // MEDIA LIBRARY (replaces Supabase Storage) — stored in Postgres
  // ═══════════════════════════════════════════════════════════════════════
  const ALLOWED_MIMES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif", "image/svg+xml"]);

  app.post("/api/media/upload", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { bucket = "media", folder = "", filename, mimeType, dataBase64 } = req.body;
      if (!filename || !mimeType || !dataBase64) return res.status(400).json({ error: "filename, mimeType and dataBase64 are required." });
      if (!ALLOWED_MIMES.has(mimeType)) return res.status(400).json({ error: `MIME type ${mimeType} not allowed.` });
      const sizeBytes = Buffer.from(dataBase64, "base64").length;
      if (sizeBytes > 10 * 1024 * 1024) return res.status(400).json({ error: "File exceeds 10 MB limit." });
      const [file] = await db.insert(mediaFiles).values({
        bucket, folder, filename, mimeType, sizeBytes, dataBase64, uploadedBy: req.user.claims.sub,
      }).returning({ id: mediaFiles.id, bucket: mediaFiles.bucket, folder: mediaFiles.folder, filename: mediaFiles.filename, mimeType: mediaFiles.mimeType, sizeBytes: mediaFiles.sizeBytes, createdAt: mediaFiles.createdAt });
      res.status(201).json({ ...file, url: `/api/media/${file.id}` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/media", isAuthenticated, requireAdmin, async (req: any, res) => {
    const rows = await db.select({
      id: mediaFiles.id, bucket: mediaFiles.bucket, folder: mediaFiles.folder, filename: mediaFiles.filename,
      mimeType: mediaFiles.mimeType, sizeBytes: mediaFiles.sizeBytes, createdAt: mediaFiles.createdAt,
    }).from(mediaFiles).orderBy(desc(mediaFiles.createdAt));
    res.json(rows.map(r => ({ ...r, url: `/api/media/${r.id}` })));
  });

  app.get("/api/media/:id", async (req, res) => {
    const [file] = await db.select().from(mediaFiles).where(eq(mediaFiles.id, req.params.id));
    if (!file) return res.status(404).end();
    res.setHeader("Content-Type", file.mimeType);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.send(Buffer.from(file.dataBase64, "base64"));
  });

  app.delete("/api/media/:id", isAuthenticated, requireAdmin, async (req: any, res) => {
    await db.delete(mediaFiles).where(eq(mediaFiles.id, req.params.id));
    res.status(204).end();
  });

  // Re-host external image server-side (SSRF-guarded) into our media library
  app.post("/api/admin/rehost-image", isAuthenticated, requireAdmin, async (req: any, res) => {
    if (rateLimited(`rehost:${req.user.claims.sub}`, 20, 60 * 60 * 1000)) {
      return res.status(429).json({ error: "Rate limit: 20 re-hosts per hour." });
    }
    const { sourceUrl, bucket = "media", folder = "migrated" } = req.body ?? {};
    if (!sourceUrl || !isSsrfSafeUrl(sourceUrl)) return res.status(400).json({ error: "sourceUrl is not a safe public URL." });
    try {
      const response = await fetch(sourceUrl, { headers: { "User-Agent": "SongtaiLife-MediaMigrator/1.0" }, signal: AbortSignal.timeout(15_000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const contentType = response.headers.get("content-type")?.split(";")[0].trim() ?? "image/jpeg";
      if (!ALLOWED_MIMES.has(contentType)) return res.status(400).json({ error: `Content-Type "${contentType}" not allowed.` });
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > 10 * 1024 * 1024) return res.status(400).json({ error: "Image exceeds 10 MB." });
      const dataBase64 = Buffer.from(buffer).toString("base64");
      const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const [file] = await db.insert(mediaFiles).values({ bucket, folder, filename, mimeType: contentType, sizeBytes: buffer.byteLength, dataBase64, uploadedBy: req.user.claims.sub }).returning({ id: mediaFiles.id });
      res.json({ newUrl: `/api/media/${file.id}` });
    } catch (err: any) {
      res.status(502).json({ error: err.message });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  // ADMIN BOOTSTRAP — promote the currently logged-in Replit user to superadmin
  // ═══════════════════════════════════════════════════════════════════════
  app.post("/api/admin/bootstrap", isAuthenticated, async (req: any, res) => {
    const bootstrapKey = process.env.ADMIN_BOOTSTRAP_KEY;
    if (!bootstrapKey) return res.status(503).json({ error: "Admin bootstrap is not configured. Set ADMIN_BOOTSTRAP_KEY." });
    if (rateLimited(`bootstrap:${req.ip}`, 3, 15 * 60 * 1000)) {
      return res.status(429).json({ error: "Too many bootstrap attempts." });
    }
    const { bootstrapKey: provided } = req.body;
    if (!provided || provided !== bootstrapKey) return res.status(401).json({ error: "Invalid bootstrap key." });

    const existingAdmins = await db.select().from(profiles).where(eq(profiles.role, "superadmin")).limit(1);
    if (existingAdmins.length > 0) return res.status(409).json({ error: "A superadmin already exists." });

    const uid = req.user.claims.sub;
    const email = req.user.claims.email ?? "";
    const [profile] = await db.insert(profiles).values({ id: uid, email, role: "superadmin", locale: "en" })
      .onConflictDoUpdate({ target: profiles.id, set: { role: "superadmin" } }).returning();

    console.log(`[Bootstrap] Superadmin created: ${email} (${uid})`);
    res.json({ success: true, uid, message: "Superadmin role granted to your account." });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // MESOMB PAYMENTS
  // ═══════════════════════════════════════════════════════════════════════
  app.post("/api/payment/checkout", async (req: any, res) => {
    const { amountXaf, pvPoints, phone, provider, cart, userId, customerName, customerPhone, deliveryAddress, deliveryNotes,
            customerFirstName, customerLastName, customerEmail, customerTown, customerRegion } = req.body;
    if (!amountXaf || !phone || !provider) return res.status(400).json({ error: "Missing required checkout parameters." });

    const orderId = `ord-${crypto.randomBytes(4).toString("hex")}`;
    await db.insert(orders).values({
      orderId, userId: userId || "guest", amountXaf: Number(amountXaf), pvPoints: Number(pvPoints || 0), phone, provider,
      cart: cart || [], status: "pending", customerName: customerName || null, customerPhone: customerPhone || null,
      deliveryAddress: deliveryAddress || null, deliveryNotes: deliveryNotes || null,
    });

    const mesomb = getMeSombClient();
    if (!mesomb) {
      return res.json({ success: true, orderId, status: "pending", message: "Payment handshake initiated. Confirm on your handset." });
    }

    const localPhone = String(phone).replace(/^\+?237/, "").replace(/\s/g, "");
    const service = String(provider).toUpperCase() === "ORANGE" ? "ORANGE" : "MTN";
    let mesombResponse: any;
    try {
      mesombResponse = await mesomb.collect({
        payer: localPhone, amount: Number(amountXaf), service, country: "CM", currency: "XAF",
        trxID: orderId, reference: `ORDER-${orderId}`,
        customer: {
          email: customerEmail || `${orderId}@songtailife.cm`,
          firstName: customerFirstName || (customerName?.split(" ")[0] ?? "Customer"),
          lastName: customerLastName || (customerName?.split(" ")[1] ?? ""),
          town: customerTown || "Yaoundé", region: customerRegion || "Centre", country: "CM",
        },
        location: { town: "Yaoundé", region: "Centre", country: "CM" },
        products: (cart || []).map((item: any) => ({ name: item.name || "Product", category: item.category || "Wellness", quantity: item.quantity || 1, amount: item.price || 0 })),
      });
    } catch (sdkErr: any) {
      await db.update(orders).set({ status: "failed" }).where(eq(orders.orderId, orderId));
      return res.status(502).json({ error: "Mobile money request failed.", detail: sdkErr.message });
    }

    if (mesombResponse.operationSuccess && mesombResponse.transactionSuccess) {
      await db.update(orders).set({ status: "pending_confirmation", mesombTransactionId: mesombResponse.transactionId }).where(eq(orders.orderId, orderId));
    } else {
      await db.update(orders).set({ status: "failed" }).where(eq(orders.orderId, orderId));
      return res.status(400).json({ error: mesombResponse.message ?? "Mobile money request rejected." });
    }

    res.json({ success: true, orderId, status: "pending_confirmation", message: "Payment request sent. Approve the prompt on your phone." });
  });

  app.post("/api/payment/webhook", async (req: any, res) => {
    const rawBody: string = req.rawBody ?? JSON.stringify(req.body);
    const sigHeader = (req.headers["x-mesomb-webhook-signature"] ?? "") as string;
    const eventId = (req.headers["x-mesomb-webhook-event-id"] ?? "") as string;
    const webhookSecret = process.env.MESOMB_WEBHOOK_SECRET;

    if (sigHeader) {
      if (!webhookSecret) return res.status(500).json({ error: "Webhook secret not configured." });
      const tPart = sigHeader.split(",").find((p: string) => p.startsWith("t="));
      const v1Part = sigHeader.split(",").find((p: string) => p.startsWith("v1="));
      if (!tPart || !v1Part) return res.status(400).json({ error: "Invalid signature format." });
      const timestamp = tPart.slice(2);
      const received = v1Part.slice(3);
      const ageSecs = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
      if (ageSecs > 300) return res.status(400).json({ error: "Timestamp outside tolerance window." });
      const expected = crypto.createHmac("sha256", webhookSecret).update(`${timestamp}.${rawBody}`, "utf8").digest("hex");
      const recvBuf = Buffer.from(received, "hex");
      const expBuf = Buffer.from(expected, "hex");
      if (recvBuf.length !== expBuf.length || !crypto.timingSafeEqual(recvBuf, expBuf)) return res.status(400).json({ error: "Invalid signature." });
    } else if (process.env.NODE_ENV === "production") {
      return res.status(400).json({ error: "Webhook signature header required." });
    }

    if (eventId) {
      const [existing] = await db.select().from(mesombWebhookEvents).where(eq(mesombWebhookEvents.eventId, eventId));
      if (existing) return res.json({ received: true, duplicate: true });
    }

    let event: any;
    try { event = typeof req.body === "object" ? req.body : JSON.parse(rawBody); } catch { return res.status(400).json({ error: "Invalid JSON body." }); }

    if (eventId) {
      try {
        await db.insert(mesombWebhookEvents).values({ eventId, eventType: event.event_type ?? "unknown", payload: event });
      } catch (e: any) { console.warn("[Webhook] Could not insert event record:", e.message); }
    }

    try {
      const txn = event?.data?.object;
      const ref = txn?.reference ?? txn?.trxID ?? "";
      const orderId = ref.startsWith("ORDER-") ? ref.replace("ORDER-", "") : ref;
      const mesombTx = txn?.pk ?? txn?.id ?? null;

      if (event.event_type === "payment.transaction.success" && orderId) {
        const [orderData] = await db.select().from(orders).where(eq(orders.orderId, orderId));
        if (orderData && orderData.status !== "paid") {
          await db.update(orders).set({ status: "paid", transactionId: mesombTx ?? `tx-${crypto.randomBytes(6).toString("hex")}`, mesombTransactionId: mesombTx, paidAt: new Date() }).where(eq(orders.orderId, orderId));
          await db.insert(processedPayments).values({ orderId, transactionId: mesombTx ?? orderId }).onConflictDoNothing();

          if (orderData.userId && orderData.userId !== "guest") {
            await calculateUnilevelCommissions(orderId, orderData.userId, orderData.amountXaf, orderData.pvPoints ?? 0);
          }

          (async () => {
            try {
              const [setting] = await db.select().from(siteSettings).where(eq(siteSettings.key, "order_notifications"));
              const notifConfig: any = setting?.value ?? {};
              if (!notifConfig?.enabled || !notifConfig?.whatsapp_number) return;
              const result = await sendOrderWhatsApp(notifConfig.whatsapp_number, {
                orderId, amountXaf: orderData.amountXaf, customerName: orderData.customerName, customerPhone: orderData.customerPhone,
                deliveryAddress: orderData.deliveryAddress, deliveryNotes: orderData.deliveryNotes, cart: (orderData.cart as any) ?? [],
              });
              await db.update(orders).set(result.success ? { whatsappNotified: true, whatsappNotifiedAt: new Date(), whatsappNotificationError: null } : { whatsappNotified: false, whatsappNotificationError: result.error ?? "Unknown error" }).where(eq(orders.orderId, orderId));
            } catch (e: any) { console.error("[WhatsApp] error", e.message); }
          })();
        }
      } else if (event.event_type === "payment.transaction.failed" && orderId) {
        await db.update(orders).set({ status: "cancelled", mesombTransactionId: mesombTx }).where(eq(orders.orderId, orderId));
      }
    } catch (handlerErr: any) {
      console.error("[Webhook] Handler error:", handlerErr.message);
    }
    res.json({ received: true });
  });

  app.post("/api/payment/resend-notification", isAuthenticated, requireAdmin, async (req: any, res) => {
    if (rateLimited(`resend:${req.user.claims.sub}`, 10, 15 * 60 * 1000)) return res.status(429).json({ error: "Too many requests." });
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ error: "orderId is required." });
    const [orderData] = await db.select().from(orders).where(eq(orders.orderId, orderId));
    if (!orderData) return res.status(404).json({ error: `Order ${orderId} not found.` });
    if (orderData.status !== "paid") return res.status(400).json({ error: "Can only send notifications for paid orders." });
    const [setting] = await db.select().from(siteSettings).where(eq(siteSettings.key, "order_notifications"));
    const notifConfig: any = setting?.value ?? {};
    if (!notifConfig?.whatsapp_number) return res.status(400).json({ error: "No admin WhatsApp number configured." });
    const result = await sendOrderWhatsApp(notifConfig.whatsapp_number, {
      orderId: orderData.orderId, amountXaf: orderData.amountXaf, customerName: orderData.customerName, customerPhone: orderData.customerPhone,
      deliveryAddress: orderData.deliveryAddress, deliveryNotes: orderData.deliveryNotes, cart: (orderData.cart as any) ?? [],
    });
    if (result.success) {
      await db.update(orders).set({ whatsappNotified: true, whatsappNotifiedAt: new Date(), whatsappNotificationError: null }).where(eq(orders.orderId, orderId));
      await logAdminAction(req.user.claims.email, "WhatsApp Notification Resent", `Order ${orderId}`);
      return res.json({ success: true, message: "WhatsApp notification sent." });
    }
    await db.update(orders).set({ whatsappNotified: false, whatsappNotificationError: result.error ?? "Unknown error" }).where(eq(orders.orderId, orderId));
    return res.status(502).json({ success: false, error: result.error });
  });

  app.post("/api/payment/payout", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const { amountXaf, phone, provider } = req.body;
    if (!amountXaf || !phone || !provider) return res.status(400).json({ error: "Missing withdrawal details." });
    const amount = Number(amountXaf);
    const [walletData] = await db.select().from(wallets).where(eq(wallets.id, userId));
    if (!walletData) return res.status(400).json({ error: "No wallet configured." });
    const currentBalance = walletData.balanceXaf ?? 0;
    if (currentBalance < amount) return res.status(400).json({ error: "Insufficient balance." });

    await db.update(wallets).set({ balanceXaf: currentBalance - amount, updatedAt: new Date() }).where(eq(wallets.id, userId));
    const [tx] = await db.insert(walletTransactions).values({ walletId: userId, type: "withdrawal", amountXaf: amount, description: `MeSomb payout to ${phone}`, status: "processing" }).returning();

    const mesomb = getMeSombClient();
    if (!mesomb) return res.json({ success: true, transactionId: tx.id, status: "processing", message: "Payout queued (MeSomb not configured)." });

    const [distData] = await db.select().from(distributors).where(eq(distributors.id, userId));
    const localPhone = String(phone).replace(/^\+?237/, "").replace(/\s/g, "");
    const service = String(provider).toUpperCase() === "ORANGE" ? "ORANGE" : "MTN";
    let depositResponse: any;
    try {
      depositResponse = await mesomb.deposit({
        receiver: localPhone, amount, service, country: "CM", currency: "XAF", trxID: String(tx.id),
        customer: { email: `${tx.id}@songtailife.cm`, firstName: "Distributor", lastName: "", town: "Yaoundé", region: "Centre", country: "CM" },
        location: { town: "Yaoundé", region: "Centre", country: "CM" },
      });
    } catch (sdkErr: any) {
      await db.update(wallets).set({ balanceXaf: currentBalance, updatedAt: new Date() }).where(eq(wallets.id, userId));
      await db.update(walletTransactions).set({ status: "failed" }).where(eq(walletTransactions.id, tx.id));
      return res.status(502).json({ error: "Payout failed. Wallet refunded.", detail: sdkErr.message });
    }

    if (depositResponse.operationSuccess && depositResponse.transactionSuccess) {
      await db.update(walletTransactions).set({ status: "processing", referenceId: depositResponse.transactionId ?? String(tx.id) }).where(eq(walletTransactions.id, tx.id));
    } else {
      await db.update(wallets).set({ balanceXaf: currentBalance, updatedAt: new Date() }).where(eq(wallets.id, userId));
      await db.update(walletTransactions).set({ status: "failed" }).where(eq(walletTransactions.id, tx.id));
      return res.status(400).json({ error: depositResponse.message ?? "Deposit rejected." });
    }
    res.json({ success: true, transactionId: tx.id, status: "processing", message: "Payout accepted." });
  });

  app.post("/api/payment/check-transaction", isAuthenticated, requireAdmin, async (req: any, res) => {
    const { mesombTransactionId } = req.body;
    if (!mesombTransactionId) return res.status(400).json({ error: "mesombTransactionId is required." });
    const mesomb = getMeSombClient();
    if (!mesomb) return res.status(503).json({ error: "MeSomb credentials not configured." });
    try {
      const result = await mesomb.checkTransaction(mesombTransactionId);
      res.json({ success: true, status: result.status, raw: result.raw });
    } catch (err: any) {
      res.status(502).json({ error: "checkTransaction failed.", detail: err.message });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Admin: manually add a downline distributor (demo/import helper — no login)
  // ═══════════════════════════════════════════════════════════════════════
  app.post("/api/distributor/add-downline", isAuthenticated, requireAdmin, async (req: any, res) => {
    const { memberName, sponsorCode } = req.body;
    if (!memberName || !sponsorCode) return res.status(400).json({ error: "memberName and sponsorCode are required." });
    const placeholderId = `manual-${crypto.randomBytes(8).toString("hex")}`;
    const generatedCode = `ST-DOWN-${Math.floor(1000 + Math.random() * 9000)}`;
    await db.insert(distributors).values({ id: placeholderId, distributorCode: generatedCode, sponsorId: sponsorCode, placementId: sponsorCode, rank: "bronze", kycStatus: "none" });
    await db.insert(profiles).values({ id: placeholderId, email: `downline-${Date.now()}@songtai.demo`, role: "distributor", locale: "en" }).onConflictDoNothing();
    res.json({ success: true, distributorCode: generatedCode, memberId: placeholderId });
  });
}
