import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import crypto from "crypto";
import { getMeSombClient } from "./server/mesomb";

dotenv.config();

// Initialize Supabase Admin client only if credentials are present
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let db: any = null;

if (supabaseUrl && supabaseServiceKey) {
  db = createClient(supabaseUrl, supabaseServiceKey, {
    realtime: { transport: ws as any },
  });
  console.log("Supabase Admin client initialized successfully");
} else {
  console.warn(
    "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — Supabase-backed routes (payments, MLM) will return 503 until configured."
  );
}

// Helper: require Supabase for a route handler
function requireDb(handler: (db: any, req: any, res: any) => Promise<any>) {
  return async (req: any, res: any) => {
    if (!db) {
      return res
        .status(503)
        .json({ error: "Database not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY." });
    }
    try {
      return await handler(db, req, res);
    } catch (err: any) {
      console.error("[requireDb] Unhandled route error:", err?.message ?? err);
      // Postgres/Supabase constraint codes — return actionable JSON, never HTML
      if (err?.code === "23505") {
        const detail = err.detail ?? "";
        const field  = detail.includes("slug") ? "slug"
                     : detail.includes("custom_domain") ? "custom domain"
                     : "value";
        return res.status(409).json({ error: `This ${field} is already taken. Choose a different one.`, detail });
      }
      if (err?.code === "23503") {
        return res.status(400).json({ error: "Invalid reference — the linked record does not exist.", detail: err.detail ?? "" });
      }
      return res.status(500).json({ error: err?.message ?? "An unexpected server error occurred." });
    }
  };
}

// Pre-hydrate collections with seeds on startup if they are empty
async function hydrateSeeds() {
  if (!db) return;
  try {
    const { data: existingProducts } = await db.from("products").select("id").limit(1);
    if (!existingProducts || existingProducts.length === 0) {
      console.log("Hydrating initial products seed into Supabase...");

      const { data: cats } = await db.from("product_categories").select("id, slug");
      const catMap: Record<string, string> = {};
      if (cats) cats.forEach((c: any) => { catMap[c.slug] = c.id; });

      await db.from("products").upsert([
        {
          slug: "cellular-vitality-pro",
          name_en: "Cellular Vitality Pro",
          name_fr: "Vitalité Cellulaire Pro",
          description_en:
            "Premium wellness capsule formulated with advanced antioxidants, organic African moringa extracts, and active micro-nutrients.",
          description_fr:
            "Capsule de bien-être premium formulée avec des antioxydants avancés, des extraits de moringa africain bio et des micro-nutriments actifs.",
          price_xaf: 32000,
          pv_points: 60,
          category_id: catMap["health"] ?? null,
          images: [
            "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&q=80&w=800",
          ],
          is_active: true,
        },
        {
          slug: "luminous-gold-serum",
          name_en: "Luminous Gold Elixir",
          name_fr: "Élixir Or Lumineux",
          description_en:
            "An ultra-premium revitalizing face serum powered by pure rosehip extract, cold-pressed argan oils, and light-reflecting natural minerals.",
          description_fr:
            "Un sérum visage ultra-premium revitalisant à base d'extrait pur de rose musquée, d'huiles d'argan pressées à froid et de minéraux naturels réfléchissants.",
          price_xaf: 28500,
          pv_points: 50,
          category_id: catMap["beauty"] ?? null,
          images: [
            "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=800",
          ],
          is_active: true,
        },
        {
          slug: "bio-yield-max-liquid",
          name_en: "Bio-Yield Max (Agriculture)",
          name_fr: "Bio-Rendement Max (Agriculture)",
          description_en:
            "An ecological liquid bio-stimulant and fertilizer engineered to maximize harvest yield and restore crop soil microbiome.",
          description_fr:
            "Un bio-stimulant liquide écologique et engrais conçu pour maximiser le rendement des récoltes et restaurer le microbiome du sol.",
          price_xaf: 18000,
          pv_points: 35,
          category_id: catMap["agriculture"] ?? null,
          images: [
            "https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&q=80&w=800",
          ],
          is_active: true,
        },
      ], { onConflict: "slug" });
    }

    const { data: existingBlogs } = await db.from("blog_posts").select("id").limit(1);
    if (!existingBlogs || existingBlogs.length === 0) {
      console.log("Hydrating initial blog posts seed into Supabase...");
      const { data: blogCats } = await db.from("blog_categories").select("id, name");
      const blogCatMap: Record<string, string> = {};
      if (blogCats) blogCats.forEach((c: any) => { blogCatMap[c.name.toLowerCase()] = c.id; });

      await db.from("blog_posts").upsert([
        {
          slug: "harnessing-moringa-african-health",
          title: "Harnessing the Green Power of Moringa for West African Wellness",
          body: "For generations, the Moringa Oleifera tree has stood tall in our villages... Sourced from northern cooperatives.",
          category_id: blogCatMap["nutraceuticals"] ?? null,
          status: "published",
        },
      ], { onConflict: "slug" });
    }

    const { data: existingEvents } = await db.from("events").select("id").limit(1);
    if (!existingEvents || existingEvents.length === 0) {
      console.log("Hydrating initial events seed into Supabase...");
      await db.from("events").upsert([
        {
          slug: "songtai-annual-convention-2026",
          title: "Songtai Life Grand Annual Convention 2026",
          start_at: "2026-08-15T09:00:00Z",
          end_at: "2026-08-15T18:00:00Z",
          location: "Palais des Sports, Yaoundé",
          capacity: 3500,
        },
      ], { onConflict: "slug" });
    }

    // Seed site_settings defaults (contact + branding) — safe to run on every boot
    try {
      await db.from("site_settings").upsert([
        {
          key: "contact",
          value: { phone: "", email: "", address_en: "", address_fr: "", map_url: "" },
        },
        {
          key: "branding",
          value: { logo_url: "", logo_dark_url: "", favicon_url: "" },
        },
      ], { onConflict: "key", ignoreDuplicates: true });
    } catch { /* site_settings table may not exist yet — silently skip */ }
  } catch (err: any) {
    console.error("Hydration error:", err.message);
  }
}

// Unilevel Multi-Generation Commission Calculation Engine (server-side)
async function calculateUnilevelCommissions(
  orderId: string,
  purchaserUid: string,
  amountXaf: number,
  pvPoints: number
) {
  if (!db) return;
  try {
    console.log(`[MLM-Engine] Computing commissions for Order ${orderId}, Purchaser ${purchaserUid}, PV ${pvPoints}`);

    const { data: purchaserData } = await db
      .from("distributors")
      .select("*")
      .eq("id", purchaserUid)
      .maybeSingle();

    if (!purchaserData) {
      console.log(`[MLM-Engine] User ${purchaserUid} is not a registered distributor. No unilevel overrides generated.`);
      return;
    }

    const currentPv = purchaserData.pv || 0;
    const newPv = currentPv + pvPoints;
    let nextRank = purchaserData.rank || "bronze";
    if (newPv >= 10000) nextRank = "diamond";
    else if (newPv >= 5000) nextRank = "platinum";
    else if (newPv >= 2000) nextRank = "gold";
    else if (newPv >= 500) nextRank = "silver";

    await db.from("distributors").update({ pv: newPv, rank: nextRank }).eq("id", purchaserUid);
    console.log(`[MLM-Engine] Updated purchaser ${purchaserUid} PV to ${newPv}. Rank: ${nextRank}`);

    const rates = [0.10, 0.05, 0.03, 0.02, 0.01];
    let currentUid = purchaserUid;

    for (let level = 0; level < rates.length; level++) {
      if (level === 0) {
        const payout = Math.floor(amountXaf * rates[level]);
        await awardCommission(purchaserUid, orderId, "direct_bonus", level, payout, `Direct Purchase Volume Bonus (${rates[level] * 100}%)`);
      } else {
        const { data: currentDist } = await db.from("distributors").select("sponsor_id").eq("id", currentUid).maybeSingle();
        if (!currentDist || !currentDist.sponsor_id || currentDist.sponsor_id === "Root") break;

        const { data: sponsorDoc } = await db
          .from("distributors")
          .select("id")
          .eq("distributor_code", currentDist.sponsor_id)
          .maybeSingle();

        if (!sponsorDoc) {
          console.log(`[MLM-Engine] Sponsor code ${currentDist.sponsor_id} not found.`);
          break;
        }

        const sponsorUid = sponsorDoc.id;
        const payout = Math.floor(amountXaf * rates[level]);
        await awardCommission(sponsorUid, orderId, "unilevel_override", level, payout, `Generation ${level} Unilevel Override (${rates[level] * 100}%)`);

        currentUid = sponsorUid;
      }
    }
  } catch (err: any) {
    console.error("[MLM-Engine-Error] Commission computation failed:", err.message);
  }
}

async function awardCommission(
  uid: string,
  orderId: string,
  type: string,
  level: number,
  amountXaf: number,
  description: string
) {
  if (!db || amountXaf <= 0) return;

  await db.rpc("increment_wallet_balance", { p_user_id: uid, p_amount: amountXaf });

  await db.from("commissions").insert({
    distributor_id: uid,
    order_id: orderId,
    type,
    level,
    amount_xaf: amountXaf,
    status: "completed",
  });

  await db.from("wallet_transactions").insert({
    wallet_id: uid,
    type: "commission",
    amount_xaf: amountXaf,
    reference_id: orderId,
    description,
    status: "completed",
  });

  console.log(`[MLM-Engine] Credited ${amountXaf} XAF to ${uid} (Level ${level} ${type})`);
}

// ── Pack Purchase → Distributor Activation ───────────────────────────────────
async function activateDistributorOnPackPurchase(
  orderId: string,
  orderData: any,
  packItem: { type: string; packTier?: string; pv?: number; sponsorCode?: string; price_xaf?: number }
) {
  if (!db) return;
  try {
    const userId = orderData.user_id;
    if (!userId || userId === "guest") {
      console.warn(`[PackActivation] Cannot activate — no authenticated user for order ${orderId}`);
      return;
    }

    const packTier  = String(packItem.packTier  ?? "bronze");
    const packPv    = Math.floor(Number(packItem.pv ?? 0));
    const priceXaf  = Math.floor(Number(packItem.price_xaf ?? orderData.amount_xaf ?? 0));
    const sponsorCode = packItem.sponsorCode ?? null;

    // Resolve sponsor distributor UUID from sponsor code
    let sponsorDistId: string | null = null;
    if (sponsorCode) {
      const { data: sponsor } = await db.from("distributors")
        .select("id, distributor_code")
        .eq("distributor_code", sponsorCode)
        .maybeSingle();
      sponsorDistId = sponsor?.id ?? null;
    }

    // Find first available binary slot under the sponsor (BFS)
    let placementId:  string | null    = sponsorCode;
    let placementLeg: "left" | "right" = "left";

    if (sponsorCode) {
      const queue: string[] = [sponsorCode];
      bfsSearch: while (queue.length > 0) {
        const code = queue.shift()!;
        const { data: kids } = await db.from("distributors")
          .select("distributor_code, placement_leg")
          .eq("placement_id", code);
        const leftKid  = (kids ?? []).find((k: any) => k.placement_leg === "left");
        const rightKid = (kids ?? []).find((k: any) => k.placement_leg === "right");
        if (!leftKid)  { placementId = code; placementLeg = "left";  break bfsSearch; }
        if (!rightKid) { placementId = code; placementLeg = "right"; break bfsSearch; }
        queue.push(leftKid.distributor_code, rightKid.distributor_code);
      }
    }

    // Check if distributor row already exists for this user
    const { data: existing } = await db.from("distributors")
      .select("id, distributor_code, status")
      .eq("id", userId)
      .maybeSingle();

    if (existing) {
      // Upgrade / re-activate existing distributor row
      await db.from("distributors").update({
        status:         "active",
        pack_tier:      packTier,
        pack_price_xaf: priceXaf,
        pack_pv:        packPv,
        referral_link:  `https://songtailife.cm/join?ref=${existing.distributor_code}`,
      }).eq("id", userId);
      console.log(`[PackActivation] Distributor ${userId} re-activated with pack ${packTier} (Order ${orderId})`);
    } else {
      // Create brand-new distributor row
      const code = `ST-${Math.floor(10000 + Math.random() * 90000)}`;
      await db.from("distributors").insert({
        id:             userId,
        distributor_code: code,
        sponsor_id:     sponsorCode ?? "Root",
        placement_id:   placementId,
        placement_leg:  placementLeg,
        rank:           "bronze",
        kyc_status:     "none",
        status:         "active",
        pack_tier:      packTier,
        pack_price_xaf: priceXaf,
        pack_pv:        packPv,
        pv:             packPv,
        referral_link:  `https://songtailife.cm/join?ref=${code}`,
        joined_at:      new Date().toISOString(),
      });

      // Ensure profile has distributor role
      await db.from("profiles").update({ role: "distributor" }).eq("id", userId);

      // Credit pack PV to sponsor's binary leg
      if (sponsorDistId && packPv > 0) {
        const pvCol = placementLeg === "left" ? "left_leg_pv" : "right_leg_pv";
        const { data: sponsorRow } = await db.from("distributors")
          .select(pvCol).eq("id", sponsorDistId).maybeSingle();
        const currentLegPv: number = (sponsorRow as any)?.[pvCol] ?? 0;
        await db.from("distributors")
          .update({ [pvCol]: currentLegPv + packPv })
          .eq("id", sponsorDistId);
      }

      console.log(`[PackActivation] New distributor ${code} created for user ${userId} (Order ${orderId})`);
    }

    // Run the unilevel commission engine for the pack PV
    if (packPv > 0) {
      await calculateUnilevelCommissions(orderId, userId, priceXaf, packPv);
    }
  } catch (err: any) {
    console.error(`[PackActivation] Error for Order ${orderId}:`, err.message);
  }
}

// ── Customer WhatsApp notification ───────────────────────────────────────────
async function sendCustomerWhatsApp(
  customerPhone: string,
  orderId: string,
  amountXaf: number,
  outcome: "success" | "failure"
): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_WHATSAPP_FROM;
  if (!accountSid || !authToken || !fromNumber) return;

  const normalized = customerPhone.replace(/\s/g, "");
  const to = normalized.startsWith("whatsapp:") ? normalized
    : `whatsapp:${normalized.startsWith("+") ? normalized : `+${normalized}`}`;

  const body = outcome === "success"
    ? [
        `✅ *Payment Confirmed — Songtai Life*`,
        ``,
        `Thank you! Your mobile money payment was received.`,
        `*Order:* ${orderId}`,
        `*Amount:* ${amountXaf.toLocaleString()} XAF`,
        ``,
        `Your distributor account is now active. Login at songtailife.cm to access your dashboard.`,
      ].join("\n")
    : [
        `❌ *Payment Not Processed — Songtai Life*`,
        ``,
        `Your mobile money payment was not successful.`,
        `*Order:* ${orderId}`,
        `*Amount:* ${amountXaf.toLocaleString()} XAF`,
        ``,
        `Please try again or contact us for assistance.`,
      ].join("\n");

  try {
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: "POST",
      headers: { "Authorization": `Basic ${credentials}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ From: fromNumber, To: to, Body: body }).toString(),
    });
    console.log(`[CustomerWhatsApp] Sent '${outcome}' for Order ${orderId} → ${customerPhone}`);
  } catch (err: any) {
    console.error(`[CustomerWhatsApp] Failed for Order ${orderId}:`, err.message);
  }
}

// ─── Twilio WhatsApp Order Notification ─────────────────────────────────────
async function sendOrderWhatsApp(
  toNumber: string,
  orderData: {
    orderId: string;
    amountXaf: number;
    customerName?: string;
    customerPhone?: string;
    deliveryAddress?: string;
    deliveryNotes?: string;
    cart: any[];
  }
): Promise<{ success: boolean; error?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_WHATSAPP_FROM; // e.g. "whatsapp:+14155238886"

  if (!accountSid || !authToken || !fromNumber) {
    return { success: false, error: "Twilio credentials (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM) not configured." };
  }

  const to = toNumber.startsWith("whatsapp:") ? toNumber : `whatsapp:${toNumber}`;

  const items = orderData.cart.map((i: any) => `  • ${i.name ?? i.id} ×${i.qty ?? 1}`).join("\n");

  const body = [
    `🛒 *New Songtai Life Order*`,
    ``,
    `*Order ID:* ${orderData.orderId}`,
    `*Amount:* ${orderData.amountXaf.toLocaleString()} XAF`,
    ``,
    `*Customer:* ${orderData.customerName || "—"}`,
    `*Phone:* ${orderData.customerPhone || "—"}`,
    ``,
    `*Delivery Address:*`,
    orderData.deliveryAddress || "Not provided",
    ...(orderData.deliveryNotes ? [``, `*Notes:* ${orderData.deliveryNotes}`] : []),
    ``,
    `*Items:*`,
    items || "  (no items)",
  ].join("\n");

  try {
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${credentials}`,
          "Content-Type":  "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ From: fromNumber, To: to, Body: body }).toString(),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      return { success: false, error: `Twilio error ${response.status}: ${text.slice(0, 200)}` };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ── Module-level app + PORT ───────────────────────────────────────────────────
// Declared here (not inside startServer) so the Express app can be exported as
// a Vercel serverless handler while still calling app.listen() on Replit/local.
const app = express();
const _parsedPort = parseInt(process.env.PORT ?? "");
const PORT = Number.isInteger(_parsedPort) && _parsedPort > 0 && _parsedPort <= 65535 ? _parsedPort : 5000;

async function startServer() {

  // ── Security headers ────────────────────────────────────────────────────────
  // Mirrors the next.config.js headers() block, adapted for Express.
  // Tuned specifically to not break: Supabase Realtime (wss), GTM/GA4, and
  // Supabase Storage-hosted images. See attached security-headers design doc.
  const isDev = process.env.NODE_ENV !== "production";

  const ContentSecurityPolicy = [
    "default-src 'self'",
    // unsafe-eval only in dev (Vite HMR requires it)
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://www.googletagmanager.com https://www.google-analytics.com`,
    // unsafe-inline required for Tailwind/Framer Motion runtime styles;
    // fonts.googleapis.com serves the Google Fonts CSS stylesheet loaded in index.html
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    // broad https: allows Supabase Storage images with varying subdomains;
    // tighten to the exact project subdomain once fully on real uploaded assets
    "img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in https:",
    // fonts.gstatic.com serves the actual font files referenced by the Google Fonts CSS
    "font-src 'self' data: https://fonts.gstatic.com",
    // wss: is required for Supabase Realtime subscriptions (site_settings sync,
    // admin live tables); omitting it silently breaks all live-data features.
    // *.supabase.in covers Supabase projects on the .in TLD (matches img-src).
    // ws: in dev allows Vite HMR websocket connections on the dev server.
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.supabase.in wss://*.supabase.in${isDev ? " ws:" : ""} https://www.google-analytics.com https://www.googletagmanager.com`,
    // Allow GTM noscript iframe (injectGTM appends <iframe src="https://www.googletagmanager.com/ns.html?id=...">)
    // YouTube-nocookie + Vimeo for testimonial video embed previews in admin
    "frame-src 'self' https://www.googletagmanager.com https://www.youtube-nocookie.com https://www.youtube.com https://player.vimeo.com",
    // frame-ancestors 'none' + X-Frame-Options covers both modern and legacy browsers
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");

  app.disable("x-powered-by"); // suppress X-Powered-By: Express (minor info-disclosure)

  app.use((_req, res, next) => {
    res.setHeader("Content-Security-Policy", ContentSecurityPolicy);
    // Clickjacking — legacy browsers honour X-Frame-Options; modern ones use frame-ancestors
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    // Prevent MIME-type sniffing
    res.setHeader("X-Content-Type-Options", "nosniff");
    // Send full origin only to same-origin; only origin (no path) to cross-origin HTTPS
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    // Disable sensitive device APIs; allow geolocation only for self (used in distributor map)
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=(self), interest-cohort=()"
    );
    // Isolate browsing context from cross-origin opener attacks
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    // Restrict cross-origin resource embedding to same-site only
    res.setHeader("Cross-Origin-Resource-Policy", "same-site");
    // HSTS is managed by Replit's proxy in production — do not set it here to avoid conflicts
    next();
  });
  // ── End security headers ────────────────────────────────────────────────────

  // Capture raw body for MeSomb webhook HMAC verification BEFORE json parsing
  app.use(express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf.toString("utf8");
    },
  }));

  await hydrateSeeds();

  // ── Stale order expiry — safety net for missed webhooks ─────────────────────
  // Runs every 5 min; finds orders stuck in pending/pending_confirmation for
  // more than 30 min and resolves them (re-queries MeSomb if possible, else marks expired).
  setInterval(async () => {
    if (!db) return;
    try {
      const cutoffTs = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const { data: staleOrders } = await db.from("orders")
        .select("order_id, mesomb_transaction_id, customer_phone, amount_xaf, user_id, cart, pv_points, status")
        .in("status", ["pending", "pending_confirmation"])
        .lt("created_at", cutoffTs);

      if (!staleOrders || staleOrders.length === 0) return;
      console.log(`[StaleOrderCron] Found ${staleOrders.length} stale order(s) to resolve.`);

      const mesomb = getMeSombClient();
      for (const stale of staleOrders) {
        try {
          let resolvedStatus: "paid" | "expired" | "cancelled" = "expired";

          if (mesomb && stale.mesomb_transaction_id) {
            try {
              const check = await (mesomb as any).checkTransaction(stale.mesomb_transaction_id);
              const st = (check?.status ?? "").toUpperCase();
              if (st === "SUCCESS") resolvedStatus = "paid";
              else if (st === "FAILED" || st === "CANCELLED") resolvedStatus = "cancelled";
            } catch { /* leave as expired */ }
          }

          if (resolvedStatus === "paid") {
            await db.from("orders").update({
              status: "paid",
              paid_at: new Date().toISOString(),
            }).eq("order_id", stale.order_id);

            if (stale.user_id && stale.user_id !== "guest") {
              await calculateUnilevelCommissions(stale.order_id, stale.user_id, stale.amount_xaf, stale.pv_points ?? 0);
              const packItem = (stale.cart || []).find((i: any) => i.type === "distributor_pack");
              if (packItem) {
                await activateDistributorOnPackPurchase(stale.order_id, stale, packItem);
              }
            }
            if (stale.customer_phone) {
              sendCustomerWhatsApp(stale.customer_phone, stale.order_id, stale.amount_xaf, "success").catch(() => {});
            }
            console.log(`[StaleOrderCron] Order ${stale.order_id} resolved → paid (MeSomb re-query)`);
          } else {
            await db.from("orders").update({ status: resolvedStatus }).eq("order_id", stale.order_id);
            if (resolvedStatus === "cancelled" && stale.customer_phone) {
              sendCustomerWhatsApp(stale.customer_phone, stale.order_id, stale.amount_xaf, "failure").catch(() => {});
            }
            console.log(`[StaleOrderCron] Order ${stale.order_id} → ${resolvedStatus}`);
          }
        } catch (orderErr: any) {
          console.error(`[StaleOrderCron] Error on order ${stale.order_id}:`, orderErr.message);
        }
      }
    } catch (cronErr: any) {
      console.error("[StaleOrderCron] Cron error:", cronErr.message);
    }
  }, 5 * 60 * 1000);

  // Gemini client
  let aiClient: GoogleGenAI | null = null;
  function getGemini(): GoogleGenAI {
    if (!aiClient) {
      const key = process.env.GEMINI_API_KEY;
      if (!key) throw new Error("GEMINI_API_KEY environment variable is missing.");
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } },
      });
    }
    return aiClient;
  }

  // Gemini chat
  app.post("/api/gemini/chat", async (req, res) => {
    try {
      const { message, history } = req.body;
      const ai = getGemini();

      const systemInstruction = `
You are the "Songtai Life AI Architect", a world-class system designer, core developer, and compensation plan advisor for the Songtai Life MLM platform.
Your knowledge is based strictly on the Technical Specification & Implementation Blueprint of Songtai Life.
Key details of Songtai Life:
- Target market: Cameroon, high-end consumer audience in West Africa.
- Currency: CFA Franc (XAF), no decimals.
- Direct-selling network: Adjacency-list based unilevel/binary structure in PostgreSQL via Supabase.
- Payments: MeSomb gateway for MTN Mobile Money and Orange Money.
- Brand colors: Songtai Green (#0A7D32) and Refined Gold accents.
- Stack: React + Vite frontend, Express backend, Supabase (PostgreSQL + Auth + Realtime).
You can answer questions about:
1. DB schemas (e.g. generating PostgreSQL DDL, explaining relations)
2. MeSomb integration (e.g. handling Orange Money / MTN MoMo API webhooks, HMAC signature verification)
3. Compensation plans (e.g. how levels, PVs, direct bonuses, and rank promotions are calculated)
4. Genealogy trees (adjacency lists, downlines, caching reads)
5. Designing UI modules with Luminous Vitality theme guidelines.
Answer concisely, helpfully, and professionally. Support both English and French if the user asks.
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            role: "user",
            parts: [{ text: `Conversation history so far:\n${JSON.stringify(history)}\n\nUser Question:\n${message}` }],
          },
        ],
        config: { systemInstruction, temperature: 0.7 },
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini Endpoint Error:", error.message);
      res.json({ error: "Gemini API key is not configured or rate-limited. Falling back." });
    }
  });

  // =========================================================================
  // MESOMB PAYMENTS WORKFLOW API  (direct fetch implementation in server/mesomb.ts)
  // =========================================================================

  // ── Collect (customer pays) ───────────────────────────────────────────────
  app.post("/api/payment/checkout", requireDb(async (db, req, res) => {
    const { amountXaf, pvPoints, phone, provider, cart, userId,
            customerName, customerPhone, deliveryAddress, deliveryNotes,
            customerFirstName, customerLastName, customerEmail,
            customerTown, customerRegion } = req.body;

    if (!amountXaf || !phone || !provider) {
      return res.status(400).json({ error: "Missing required checkout parameters: amountXaf, phone, provider" });
    }

    const orderId = `ord-${crypto.randomBytes(4).toString("hex")}`;

    const { error: insertError } = await db.from("orders").insert({
      order_id: orderId,
      user_id: userId || "guest",
      amount_xaf: Number(amountXaf),
      pv_points: Number(pvPoints || 0),
      phone,
      provider,
      cart: cart || [],
      status: "pending",
      customer_name: customerName || null,
      customer_phone: customerPhone || null,
      delivery_address: deliveryAddress || null,
      delivery_notes: deliveryNotes || null,
    });

    if (insertError) throw new Error(insertError.message);
    console.log(`[Payments] Order ${orderId} created. Initiating MeSomb Collect...`);

    const mesomb = getMeSombClient();
    if (!mesomb) {
      // SDK not configured — leave order in pending and return; webhook will finalize later
      console.warn("[Payments] MeSomb credentials not set — returning pending without initiating collect.");
      return res.json({
        success: true,
        orderId,
        status: "pending",
        message: "Payment handshake initiated. Confirm carrier verification on your handset.",
      });
    }

    // Normalize phone — MeSomb expects local format without country code (e.g. '670000000')
    const localPhone = String(phone).replace(/^\+?237/, "").replace(/\s/g, "");
    const service = String(provider).toUpperCase() === "ORANGE" ? "ORANGE" : "MTN";

    let mesombResponse: any;
    try {
      mesombResponse = await mesomb.collect({
        payer: localPhone,
        amount: Number(amountXaf),
        service,
        country: "CM",
        currency: "XAF",
        trxID: orderId,
        reference: `ORDER-${orderId}`,
        customer: {
          email:     customerEmail     || `${orderId}@songtailife.cm`,
          firstName: customerFirstName || (customerName?.split(" ")[0] ?? "Customer"),
          lastName:  customerLastName  || (customerName?.split(" ")[1] ?? ""),
          town:      customerTown   || "Yaoundé",
          region:    customerRegion || "Centre",
          country:   "CM",
        },
        location: { town: "Yaoundé", region: "Centre", country: "CM" },
        products: (cart || []).map((item: any) => ({
          name:     item.name || item.product_name || "Product",
          category: item.category || "Wellness",
          quantity: item.quantity || 1,
          amount:   item.price || item.unit_price_xaf || 0,
        })),
      });
    } catch (sdkErr: any) {
      console.error("[Payments] MeSomb collect threw:", sdkErr.message);
      await db.from("orders").update({ status: "failed" }).eq("order_id", orderId);
      return res.status(502).json({ error: "Mobile money request failed. Please try again.", detail: sdkErr.message });
    }

    if (mesombResponse.operationSuccess && mesombResponse.transactionSuccess) {
      const txnPk = mesombResponse.transactionId;
      await db.from("orders").update({
        status: "pending_confirmation",
        mesomb_transaction_id: txnPk,
      }).eq("order_id", orderId);
      console.log(`[Payments] MeSomb collect accepted for Order ${orderId}. Tx: ${txnPk}`);
    } else {
      const msg = mesombResponse.message ?? "Mobile money request rejected.";
      console.warn(`[Payments] MeSomb collect failed for Order ${orderId}: ${msg}`);
      await db.from("orders").update({ status: "failed" }).eq("order_id", orderId);
      return res.status(400).json({ error: msg });
    }

    res.json({
      success: true,
      orderId,
      status: "pending_confirmation",
      message: "Payment request sent to your handset. Approve the prompt on your phone to complete.",
    });
  }));

  // ── Webhook (MeSomb → server) ─────────────────────────────────────────────
  // Uses real MeSomb signature scheme: t=<ts>,v1=<hex-hmac-sha256> on "<ts>.<rawBody>"
  app.post("/api/payment/webhook", requireDb(async (db, req, res) => {
    const rawBody: string = (req as any).rawBody ?? JSON.stringify(req.body);
    const sigHeader = (req.headers["x-mesomb-webhook-signature"] ?? "") as string;
    const eventId   = (req.headers["x-mesomb-webhook-event-id"]  ?? "") as string;
    const webhookSecret = process.env.MESOMB_WEBHOOK_SECRET;

    // ── Signature verification ────────────────────────────────────────────
    if (sigHeader) {
      if (!webhookSecret) {
        console.error("[Webhook] MESOMB_WEBHOOK_SECRET not set — cannot verify signature.");
        return res.status(500).json({ error: "Webhook secret not configured." });
      }

      const tPart  = sigHeader.split(",").find(p => p.startsWith("t="));
      const v1Part = sigHeader.split(",").find(p => p.startsWith("v1="));
      if (!tPart || !v1Part) {
        console.warn("[Webhook] Malformed signature header:", sigHeader);
        return res.status(400).json({ error: "Invalid signature format." });
      }

      const timestamp = tPart.slice(2);
      const received  = v1Part.slice(3);

      // Reject replays older than 5 minutes
      const ageSecs = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
      if (ageSecs > 300) {
        console.warn(`[Webhook] Timestamp too old (${ageSecs}s). Rejecting replay.`);
        return res.status(400).json({ error: "Timestamp outside tolerance window." });
      }

      const expected = crypto.createHmac("sha256", webhookSecret)
        .update(`${timestamp}.${rawBody}`, "utf8")
        .digest("hex");

      const recvBuf = Buffer.from(received,  "hex");
      const expBuf  = Buffer.from(expected, "hex");
      if (recvBuf.length !== expBuf.length || !crypto.timingSafeEqual(recvBuf, expBuf)) {
        console.warn("[Webhook] Signature mismatch — rejecting.");
        return res.status(400).json({ error: "Invalid signature." });
      }
      console.log("[Webhook] Signature verified ✓");
    } else if (process.env.NODE_ENV === "production") {
      // In production always require a signature
      console.warn("[Webhook] Missing signature header in production — rejecting.");
      return res.status(400).json({ error: "Webhook signature header required." });
    } else {
      console.log("[Webhook] No signature header — dev/test mode, skipping verification.");
    }

    // ── Deduplication using event_id ──────────────────────────────────────
    // Always return 200 on duplicates — MeSomb redelivers on timeouts
    if (eventId) {
      const { data: existing } = await db
        .from("mesomb_webhook_events")
        .select("id")
        .eq("event_id", eventId)
        .maybeSingle();

      if (existing) {
        console.log(`[Webhook] Duplicate event_id ${eventId} — already processed, returning 200.`);
        return res.json({ received: true, duplicate: true });
      }
    }

    let event: any;
    try {
      event = typeof req.body === "object" ? req.body : JSON.parse(rawBody);
    } catch {
      return res.status(400).json({ error: "Invalid JSON body." });
    }

    // Record event BEFORE processing — prevents double-processing if handler crashes halfway
    if (eventId) {
      await db.from("mesomb_webhook_events").insert({
        event_id:   eventId,
        event_type: event.event_type ?? "unknown",
        payload:    event,
      }).then(({ error: evErr }: any) => {
        if (evErr) console.warn("[Webhook] Could not insert event record:", evErr.message);
      });
    }

    // ── Route by event type ───────────────────────────────────────────────
    try {
      const txn      = event?.data?.object;
      const ref      = txn?.reference ?? txn?.trxID ?? "";
      // reference is stored as "ORDER-<orderId>" — strip prefix
      const orderId  = ref.startsWith("ORDER-") ? ref.replace("ORDER-", "") : ref;
      const mesombTx = txn?.pk ?? txn?.id ?? null;

      switch (event.event_type) {
        case "payment.transaction.success": {
          if (!orderId) { console.warn("[Webhook] No orderId in success event."); break; }

          const { data: orderData } = await db.from("orders").select("*").eq("order_id", orderId).maybeSingle();
          if (!orderData) { console.warn(`[Webhook] Order ${orderId} not found.`); break; }
          if (orderData.status === "paid") { console.log(`[Webhook] Order ${orderId} already paid.`); break; }

          await db.from("orders").update({
            status: "paid",
            transaction_id: mesombTx ?? `tx-${crypto.randomBytes(6).toString("hex")}`,
            mesomb_transaction_id: mesombTx,
            paid_at: new Date().toISOString(),
          }).eq("order_id", orderId);

          // Also keep processed_payments for backwards-compat idempotency guard
          await db.from("processed_payments").insert({
            order_id: orderId,
            transaction_id: mesombTx ?? orderId,
          }).then(({ error: ppErr }: any) => {
            if (ppErr && !ppErr.message?.includes("duplicate")) console.warn("[Webhook] processed_payments insert:", ppErr.message);
          });

          console.log(`[Webhook] Order ${orderId} → paid. MeSomb tx: ${mesombTx}`);

          if (orderData.user_id && orderData.user_id !== "guest") {
            await calculateUnilevelCommissions(orderId, orderData.user_id, orderData.amount_xaf, orderData.pv_points);
          }

          // Pack purchase — activate / create distributor row
          const packItem = (orderData.cart ?? []).find((i: any) => i.type === "distributor_pack");
          if (packItem && orderData.user_id && orderData.user_id !== "guest") {
            await activateDistributorOnPackPurchase(orderId, orderData, packItem);
          }

          // Customer WhatsApp notification — non-blocking
          if (orderData.customer_phone) {
            sendCustomerWhatsApp(orderData.customer_phone, orderId, orderData.amount_xaf, "success").catch(() => {});
          }

          // WhatsApp admin notification — non-blocking
          (async () => {
            try {
              const { data: setting } = await db.from("site_settings").select("value").eq("key", "order_notifications").maybeSingle();
              const notifConfig  = setting?.value ?? {};
              const adminNumber  = notifConfig?.whatsapp_number ?? "";
              const notifEnabled = notifConfig?.enabled ?? false;
              if (!notifEnabled || !adminNumber) return;

              const result = await sendOrderWhatsApp(adminNumber, {
                orderId,
                amountXaf:       orderData.amount_xaf,
                customerName:    orderData.customer_name    ?? undefined,
                customerPhone:   orderData.customer_phone   ?? undefined,
                deliveryAddress: orderData.delivery_address ?? undefined,
                deliveryNotes:   orderData.delivery_notes   ?? undefined,
                cart:            orderData.cart ?? [],
              });

              await db.from("orders").update(
                result.success
                  ? { whatsapp_notified: true,  whatsapp_notified_at: new Date().toISOString(), whatsapp_notification_error: null }
                  : { whatsapp_notified: false, whatsapp_notification_error: result.error ?? "Unknown error" }
              ).eq("order_id", orderId);

              if (result.success) console.log(`[WhatsApp] Admin notified for Order ${orderId}.`);
              else console.error(`[WhatsApp] Notification failed for Order ${orderId}: ${result.error}`);
            } catch (err: any) {
              console.error(`[WhatsApp] Error for Order ${orderId}:`, err.message);
            }
          })();
          break;
        }

        case "payment.transaction.failed": {
          if (!orderId) { console.warn("[Webhook] No orderId in failed event."); break; }
          // Fetch order first so we can send customer notification
          const { data: failedOrder } = await db.from("orders").select("customer_phone, amount_xaf").eq("order_id", orderId).maybeSingle();
          await db.from("orders").update({ status: "cancelled", mesomb_transaction_id: mesombTx }).eq("order_id", orderId);
          if (failedOrder?.customer_phone) {
            sendCustomerWhatsApp(failedOrder.customer_phone, orderId, failedOrder.amount_xaf ?? 0, "failure").catch(() => {});
          }
          console.log(`[Webhook] Order ${orderId} → cancelled (payment failed).`);
          break;
        }

        default:
          console.log(`[Webhook] Unhandled event type: ${event.event_type}`);
      }
    } catch (handlerErr: any) {
      // Log but still return 200 — signature/dedup passed, MeSomb should not redeliver
      console.error("[Webhook] Handler error (event accepted but processing failed):", handlerErr.message);
    }

    // Always return 200 after signature + dedup checks pass
    return res.json({ received: true });
  }));

  // ── In-memory rate limiters (Phase 8 security hardening) ──────────────────
  // payout: max 5 per user per 60 min
  const payoutAttempts = new Map<string, { count: number; resetAt: number }>();
  // add-downline: max 10 per user per 60 min (each call creates an auth user)
  const downlineAttempts = new Map<string, { count: number; resetAt: number }>();
  // resend-notification: max 10 per user per 15 min
  const resendAttempts = new Map<string, { count: number; resetAt: number }>();

  function checkRateLimit(
    map: Map<string, { count: number; resetAt: number }>,
    key: string,
    maxCount: number,
    windowMs: number
  ): { limited: boolean; retryAfterMs: number } {
    const now = Date.now();
    const bucket = map.get(key);
    if (bucket && now < bucket.resetAt) {
      if (bucket.count >= maxCount) {
        return { limited: true, retryAfterMs: bucket.resetAt - now };
      }
      bucket.count++;
      return { limited: false, retryAfterMs: 0 };
    }
    map.set(key, { count: 1, resetAt: now + windowMs });
    return { limited: false, retryAfterMs: 0 };
  }

  // Resend WhatsApp notification for a paid order (admin-only)
  app.post("/api/payment/resend-notification", requireDb(async (db, req, res) => {
    // ── Auth: must be signed in ───────────────────────────────────
    const sessionUser = (req as any).user;
    if (!sessionUser?.claims?.sub) {
      return res.status(401).json({ error: "Authentication required." });
    }
    const actorId = sessionUser.claims.sub as string;

    // ── Authz: must be admin or superadmin ────────────────────────
    const { data: profile } = await db
      .from("profiles")
      .select("role")
      .eq("id", actorId)
      .maybeSingle();
    if (!profile || !["admin", "superadmin"].includes(profile.role ?? "")) {
      return res.status(403).json({ error: "Forbidden." });
    }

    // ── Rate limit: max 10 resends per user per 15 min ────────────
    const now = Date.now();
    const rateBucket = resendAttempts.get(actorId);
    if (rateBucket) {
      if (now < rateBucket.resetAt && rateBucket.count >= 10) {
        return res.status(429).json({ error: "Too many notification resend requests. Try again later." });
      }
      if (now >= rateBucket.resetAt) resendAttempts.delete(actorId);
    }
    const bucket = resendAttempts.get(actorId) ?? { count: 0, resetAt: now + 15 * 60 * 1000 };
    bucket.count++;
    resendAttempts.set(actorId, bucket);

    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ error: "orderId is required." });

    const { data: orderData } = await db
      .from("orders")
      .select("*")
      .eq("order_id", orderId)
      .maybeSingle();

    if (!orderData) return res.status(404).json({ error: `Order ${orderId} not found.` });
    if (orderData.status !== "paid") return res.status(400).json({ error: "Can only send notifications for paid orders." });

    const { data: setting } = await db
      .from("site_settings")
      .select("value")
      .eq("key", "order_notifications")
      .maybeSingle();

    const notifConfig  = setting?.value ?? {};
    const adminNumber  = notifConfig?.whatsapp_number ?? "";

    if (!adminNumber) {
      return res.status(400).json({ error: "No admin WhatsApp number configured. Set it in Admin → Settings → Order Alerts." });
    }

    const result = await sendOrderWhatsApp(adminNumber, {
      orderId: orderData.order_id,
      amountXaf: orderData.amount_xaf,
      customerName:    orderData.customer_name    ?? undefined,
      customerPhone:   orderData.customer_phone   ?? undefined,
      deliveryAddress: orderData.delivery_address ?? undefined,
      deliveryNotes:   orderData.delivery_notes   ?? undefined,
      cart: orderData.cart ?? [],
    });

    if (result.success) {
      await db.from("orders").update({
        whatsapp_notified:    true,
        whatsapp_notified_at: new Date().toISOString(),
        whatsapp_notification_error: null,
      }).eq("order_id", orderId);

      // Audit log
      try {
        await db.from("audit_logs").insert({
          action: "WhatsApp Notification Resent",
          details: `Order ${orderId} — resent by ${actorId}`,
        });
      } catch { /* audit log failure must never block the response */ }

      console.log(`[WhatsApp-Resend] Notification sent for Order ${orderId} by admin ${actorId}.`);
      return res.json({ success: true, message: "WhatsApp notification sent." });
    } else {
      await db.from("orders").update({
        whatsapp_notified: false,
        whatsapp_notification_error: result.error ?? "Unknown error",
      }).eq("order_id", orderId);
      console.error(`[WhatsApp-Resend] Failed for Order ${orderId} by admin ${actorId}: ${result.error}`);
      return res.status(502).json({ success: false, error: result.error });
    }
  }));

  // ── Deposit / Payout (server pays distributor) ───────────────────────────
  app.post("/api/payment/payout", requireDb(async (db, req, res) => {
    const sessionUser = (req as any).user;
    if (!sessionUser?.claims?.sub) {
      return res.status(401).json({ error: "Authorization required." });
    }
    const userId = sessionUser.claims.sub;

    // Rate limit: max 5 payout requests per user per hour
    const rl = checkRateLimit(payoutAttempts, userId, 5, 60 * 60 * 1000);
    if (rl.limited) {
      return res.status(429).json({ error: `Too many payout requests. Retry in ${Math.ceil(rl.retryAfterMs / 60000)} minute(s).` });
    }

    const { amountXaf, phone, provider } = req.body;
    if (!amountXaf || !phone || !provider) {
      return res.status(400).json({ error: "Missing withdrawal details: amountXaf, phone, provider" });
    }

    const amount = Number(amountXaf);

    const { data: walletData } = await db.from("wallets").select("*").eq("id", userId).maybeSingle();
    if (!walletData) return res.status(400).json({ error: "User has no wallet ledger configured." });

    const currentBalance = Number(walletData.balance_xaf || 0);
    if (currentBalance < amount) {
      return res.status(400).json({ error: "Insufficient wallet balance to request this payout." });
    }

    // Deduct wallet immediately — webhook is authoritative for final completion
    await db.from("wallets").update({
      balance_xaf: currentBalance - amount,
      updated_at: new Date().toISOString(),
    }).eq("id", userId);

    const txId = `wd-${crypto.randomBytes(5).toString("hex")}`;
    await db.from("wallet_transactions").insert({
      id: txId,
      wallet_id: userId,
      type: "withdrawal",
      amount_xaf: amount,
      description: `MeSomb Deposit payout to ${phone} (${String(provider).toUpperCase()})`,
      status: "processing",
    });

    console.log(`[Payout] Withdrawal ${txId} for User ${userId}, ${amount} XAF → ${phone}. Calling MeSomb makeDeposit...`);

    const mesomb = getMeSombClient();
    if (!mesomb) {
      console.warn("[Payout] MeSomb credentials not set — leaving transaction in processing state.");
      return res.json({
        success: true,
        transactionId: txId,
        status: "processing",
        message: "Payout queued. MeSomb credentials are not yet configured — process manually.",
      });
    }

    // Fetch distributor profile for customer fields
    const { data: distData } = await db.from("distributors").select("*").eq("id", userId).maybeSingle();
    const localPhone = String(phone).replace(/^\+?237/, "").replace(/\s/g, "");
    const service = String(provider).toUpperCase() === "ORANGE" ? "ORANGE" : "MTN";

    let depositResponse: any;
    try {
      depositResponse = await mesomb.deposit({
        receiver: localPhone,
        amount,
        service,
        country: "CM",
        currency: "XAF",
        trxID: txId,
        customer: {
          email:     distData?.email      ?? `${txId}@songtailife.cm`,
          firstName: distData?.first_name ?? "Distributor",
          lastName:  distData?.last_name  ?? "",
          town:      distData?.city       ?? "Yaoundé",
          region:    distData?.region     ?? "Centre",
          country:   "CM",
        },
        location: { town: "Yaoundé", region: "Centre", country: "CM" },
      });
    } catch (sdkErr: any) {
      console.error("[Payout] MeSomb deposit threw:", sdkErr.message);
      await db.from("wallets").update({ balance_xaf: currentBalance, updated_at: new Date().toISOString() }).eq("id", userId);
      await db.from("wallet_transactions").update({ status: "failed" }).eq("id", txId);
      return res.status(502).json({ error: "Payout request failed. Your wallet has been refunded.", detail: sdkErr.message });
    }

    if (depositResponse.operationSuccess && depositResponse.transactionSuccess) {
      const mesombTx = depositResponse.transactionId;
      await db.from("wallet_transactions").update({
        status: "processing",
        reference_id: mesombTx ?? txId,
      }).eq("id", txId);
      console.log(`[Payout] MeSomb deposit accepted for tx ${txId}. MeSomb tx: ${mesombTx}`);
    } else {
      const msg = depositResponse.message ?? "Deposit rejected by MeSomb.";
      console.warn(`[Payout] MeSomb deposit failed for tx ${txId}: ${msg}`);
      await db.from("wallets").update({ balance_xaf: currentBalance, updated_at: new Date().toISOString() }).eq("id", userId);
      await db.from("wallet_transactions").update({ status: "failed" }).eq("id", txId);
      return res.status(400).json({ error: msg });
    }

    res.json({
      success: true,
      transactionId: txId,
      status: "processing",
      message: "Payout request accepted by mobile network. Funds will arrive within minutes.",
    });
  }));

  // ── Transaction reconciliation — check stuck payments ────────────────────
  app.post("/api/payment/check-transaction", requireDb(async (db, req, res) => {
    const sessionUser = (req as any).user;
    if (!sessionUser?.claims?.sub) return res.status(401).json({ error: "Authorization required." });

    // Admin only
    const { data: profile } = await db.from("profiles").select("role").eq("id", sessionUser.claims.sub).maybeSingle();
    if (!["admin", "superadmin"].includes(profile?.role ?? "")) {
      return res.status(403).json({ error: "Forbidden." });
    }

    const { mesombTransactionId } = req.body;
    if (!mesombTransactionId) return res.status(400).json({ error: "mesombTransactionId is required." });

    const mesomb = getMeSombClient();
    if (!mesomb) return res.status(503).json({ error: "MeSomb credentials not configured." });

    try {
      const result = await mesomb.checkTransaction(mesombTransactionId);
      console.log(`[Reconcile] MeSomb status for tx ${mesombTransactionId}: ${result.status}`);
      return res.json({ success: true, status: result.status, raw: result.raw });
    } catch (err: any) {
      return res.status(502).json({ error: "checkTransaction failed.", detail: err.message });
    }
  }));

  app.post("/api/distributor/add-downline", requireDb(async (db, req, res) => {
    const sessionUser = (req as any).user;
    if (!sessionUser?.claims?.sub) {
      return res.status(401).json({ error: "Authorization required." });
    }

    // Rate limit: max 10 new downline registrations per user per hour
    const rl = checkRateLimit(downlineAttempts, sessionUser.claims.sub, 10, 60 * 60 * 1000);
    if (rl.limited) {
      return res.status(429).json({ error: `Too many member-add requests. Retry in ${Math.ceil(rl.retryAfterMs / 60000)} minute(s).` });
    }

    const { memberName, sponsorCode } = req.body;
    if (!memberName || !sponsorCode) {
      return res.status(400).json({ error: "memberName and sponsorCode are required." });
    }

    const placeholderEmail = `downline-${Date.now()}@songtai.demo`;
    const { data: newAuthUser, error: createError } = await db.auth.admin.createUser({
      email: placeholderEmail,
      password: crypto.randomBytes(12).toString("hex"),
      user_metadata: { displayName: memberName, isDemo: true },
    });
    if (createError) throw createError;

    const generatedCode = `ST-DOWN-${Math.floor(1000 + Math.random() * 9000)}`;

    await db.from("distributors").insert({
      id: newAuthUser.user.id,
      distributor_code: generatedCode,
      sponsor_id: sponsorCode,
      placement_id: sponsorCode,
      rank: "bronze",
      kyc_status: "none",
    });

    await db.from("profiles").upsert({
      id: newAuthUser.user.id,
      email: placeholderEmail,
      display_name: memberName,
      role: "distributor",
    }, { onConflict: "id", ignoreDuplicates: true });

    res.json({ success: true, distributorCode: generatedCode, memberId: newAuthUser.user.id });
  }));

  // ── Distributor binary tree (12 generations, BFS) ─────────────────────────
  app.get("/api/distributor/tree", requireDb(async (db, req, res) => {
    const sessionUser = (req as any).user;
    if (!sessionUser?.claims?.sub) return res.status(401).json({ error: "Authentication required." });
    const userId = sessionUser.claims.sub as string;
    const MAX_GEN = 12;

    const { data: root } = await db.from("distributors")
      .select("id, distributor_code, rank, pv, placement_leg, left_leg_pv, right_leg_pv, pack_tier, status, joined_at")
      .eq("id", userId).maybeSingle();
    if (!root) return res.status(404).json({ error: "Distributor profile not found." });

    const { data: rootProf } = await db.from("profiles")
      .select("display_name, email").eq("id", userId).maybeSingle();

    const rootNode: any = {
      ...root,
      displayName: rootProf?.display_name || rootProf?.email?.split("@")[0] || root.distributor_code,
      children: [],
      generation: 0,
    };

    const nodeMap = new Map<string, any>([[root.distributor_code, rootNode]]);
    let currentLevel: any[] = [rootNode];
    let totalNodes = 0;

    for (let gen = 0; gen < MAX_GEN && currentLevel.length > 0; gen++) {
      const codes = currentLevel.map((n: any) => n.distributor_code);
      const { data: kids } = await db.from("distributors")
        .select("id, distributor_code, rank, pv, placement_leg, left_leg_pv, right_leg_pv, pack_tier, status, joined_at, placement_id")
        .in("placement_id", codes);

      if (!kids || kids.length === 0) break;
      totalNodes += kids.length;

      const kidIds = kids.map((k: any) => k.id);
      const { data: profs } = await db.from("profiles")
        .select("id, display_name, email").in("id", kidIds);
      const pmap = new Map((profs ?? []).map((p: any) => [p.id, p]));

      const nextLevel: any[] = [];
      for (const kid of kids) {
        const parentNode = nodeMap.get(kid.placement_id);
        if (!parentNode) continue;
        const prof = pmap.get(kid.id);
        const childNode: any = {
          ...kid,
          displayName: prof?.display_name || prof?.email?.split("@")[0] || kid.distributor_code,
          children: [],
          generation: gen + 1,
        };
        parentNode.children.push(childNode);
        nodeMap.set(kid.distributor_code, childNode);
        nextLevel.push(childNode);
      }
      currentLevel = nextLevel;
    }

    const leftPv  = root.left_leg_pv  ?? 0;
    const rightPv = root.right_leg_pv ?? 0;

    res.json({
      tree: rootNode,
      stats: {
        total_downline: totalNodes,
        left_leg_pv:    leftPv,
        right_leg_pv:   rightPv,
        weaker_leg:     leftPv <= rightPv ? "left" : "right",
        weaker_leg_pv:  Math.min(leftPv, rightPv),
      },
    });
  }));

  // ── Distributor earnings (Performance Bonus + Leadership Bonus) ───────────
  app.get("/api/distributor/earnings", requireDb(async (db, req, res) => {
    const sessionUser = (req as any).user;
    if (!sessionUser?.claims?.sub) return res.status(401).json({ error: "Authentication required." });
    const userId = sessionUser.claims.sub as string;

    const { data: dist } = await db.from("distributors")
      .select("rank, left_leg_pv, right_leg_pv, pv")
      .eq("id", userId).maybeSingle();
    if (!dist) return res.status(404).json({ error: "Distributor profile not found." });

    const { data: allTiers } = await db.from("rank_tiers")
      .select("*").order("display_order", { ascending: true });

    const myTier = (allTiers ?? []).find((t: any) => t.rank_key === dist.rank) ?? null;

    const leftPv   = dist.left_leg_pv  ?? 0;
    const rightPv  = dist.right_leg_pv ?? 0;
    const weakerPv = Math.min(leftPv, rightPv);
    const bonusPct  = myTier?.weekly_bonus_pct    ?? 0;
    const ceilingXaf = myTier?.weekly_ceiling_xaf ?? 0;
    const rawBonus  = Math.floor(weakerPv * bonusPct / 100);
    const bonusXaf  = ceilingXaf > 0 ? Math.min(rawBonus, ceilingXaf) : rawBonus;

    // Commission totals by level for Leadership Bonus breakdown
    const { data: comms } = await db.from("commissions")
      .select("level, amount_xaf")
      .eq("distributor_id", userId)
      .eq("status", "completed");
    const commByGen: Record<number, number> = {};
    for (const c of (comms ?? [])) {
      commByGen[c.level] = (commByGen[c.level] ?? 0) + (c.amount_xaf ?? 0);
    }

    // 12-generation leadership bonus breakdown
    const genPcts: number[] = myTier?.generation_pcts ?? [];
    const leadershipBonus = Array.from({ length: 12 }, (_, i) => {
      const gen = i + 1;
      const pct = genPcts[i] ?? 0;
      const unlocked = pct > 0;
      let unlockRank: string | null = null;
      if (!unlocked && allTiers) {
        for (const tier of allTiers) {
          const tierPcts: number[] = tier.generation_pcts ?? [];
          if ((tierPcts[i] ?? 0) > 0) { unlockRank = tier.rank_label_en ?? tier.rank_key; break; }
        }
      }
      return {
        generation:  gen,
        pct,
        earned_xaf: commByGen[i] ?? 0,
        unlocked,
        unlock_rank: unlockRank,
      };
    });

    res.json({
      rank:      dist.rank,
      rank_tier: myTier,
      performance_bonus: {
        left_leg_pv:    leftPv,
        right_leg_pv:   rightPv,
        weaker_leg:     leftPv <= rightPv ? "left" : "right",
        weaker_leg_pv:  weakerPv,
        weekly_bonus_pct:   bonusPct,
        weekly_ceiling_xaf: ceilingXaf,
        raw_bonus_xaf:  rawBonus,
        bonus_xaf:      bonusXaf,
        is_capped:      ceilingXaf > 0 && rawBonus > ceilingXaf,
      },
      leadership_bonus: leadershipBonus,
    });
  }));

  // Simple in-memory rate limiter for bootstrap endpoint
  const bootstrapAttempts = new Map<string, { count: number; resetAt: number }>();

  app.post("/api/admin/bootstrap", requireDb(async (db, req, res) => {
    const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.socket.remoteAddress ?? "unknown";

    const now = Date.now();
    const existing = bootstrapAttempts.get(clientIp);
    if (existing) {
      if (now < existing.resetAt && existing.count >= 3) {
        return res.status(429).json({ error: "Too many bootstrap attempts. Try again later." });
      }
      if (now >= existing.resetAt) {
        bootstrapAttempts.delete(clientIp);
      }
    }
    const entry = bootstrapAttempts.get(clientIp) ?? { count: 0, resetAt: now + 15 * 60 * 1000 };
    entry.count++;
    bootstrapAttempts.set(clientIp, entry);

    const bootstrapKey = process.env.ADMIN_BOOTSTRAP_KEY;
    if (!bootstrapKey) {
      return res.status(503).json({ error: "Admin bootstrap is not configured on this server. Set ADMIN_BOOTSTRAP_KEY." });
    }
    const { bootstrapKey: provided, email, password } = req.body;
    if (!provided || provided !== bootstrapKey) {
      return res.status(401).json({ error: "Invalid bootstrap key." });
    }
    if (!email || !password || password.length < 8) {
      return res.status(400).json({ error: "email and password (min 8 chars) are required." });
    }

    const { data: existingAdmins, error: existErr } = await db
      .from("profiles")
      .select("id")
      .eq("role", "superadmin")
      .limit(1);
    if (existErr) throw existErr;
    if (existingAdmins && existingAdmins.length > 0) {
      return res.status(409).json({ error: "A superadmin already exists. Bootstrap is disabled." });
    }

    const { data: authData, error: authErr } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (authErr) throw authErr;

    const uid = authData.user.id;

    const { error: profileErr } = await db.from("profiles").upsert({
      id: uid,
      email,
      phone: "+237699999999",
      role: "superadmin",
      locale: "en",
      must_change_password: true,
    });
    if (profileErr) throw profileErr;

    bootstrapAttempts.delete(clientIp);

    console.log(`[Bootstrap] Superadmin created: ${email} (${uid})`);
    return res.json({ success: true, uid, message: "Superadmin account created. Log in and change your password immediately." });
  }));

  // ── Partner site lookup (public — reads active partners only) ───────────────
  // Used to validate a slug server-side (e.g. for future SSR or API integrations).
  // The client-side PartnerProvider queries Supabase directly via the anon key.
  // ── God-mode: search existing distributors (for sponsor picker) ─────────────
  app.get("/api/admin/distributors/search", requireDb(async (db, req, res) => {
    const sessionUser = (req as any).user;
    if (!sessionUser?.claims?.sub) return res.status(401).json({ error: "Authorization required." });
    const actorId = sessionUser.claims.sub as string;
    const { data: actor } = await db.from("profiles").select("role").eq("id", actorId).maybeSingle();
    if (!actor || !["admin", "superadmin"].includes(actor.role ?? "")) {
      return res.status(403).json({ error: "Admin or superadmin role required." });
    }
    const q = (req.query.q as string ?? "").trim();
    const { data: dists } = await db.from("distributors")
      .select("id, distributor_code, rank, status")
      .or(q ? `distributor_code.ilike.%${q}%` : "status.eq.active")
      .order("joined_at", { ascending: false })
      .limit(20);
    const ids = (dists ?? []).map((d: any) => d.id);
    const { data: profs } = ids.length > 0
      ? await db.from("profiles").select("id, display_name, email").in("id", ids)
      : { data: [] };
    const profMap: Record<string, any> = {};
    (profs ?? []).forEach((p: any) => { profMap[p.id] = p; });
    return res.json((dists ?? []).map((d: any) => ({
      id: d.id,
      code: d.distributor_code,
      name: profMap[d.id]?.display_name || profMap[d.id]?.email?.split("@")[0] || d.distributor_code,
      rank: d.rank,
      status: d.status,
    })));
  }));

  // ── God-mode: create a distributor account directly (no payment) ─────────────
  app.post("/api/admin/distributor/create", requireDb(async (db, req, res) => {
    const sessionUser = (req as any).user;
    if (!sessionUser?.claims?.sub) return res.status(401).json({ error: "Authorization required." });
    const actorId = sessionUser.claims.sub as string;
    const { data: actor } = await db.from("profiles").select("role, email, display_name").eq("id", actorId).maybeSingle();
    if (!actor || !["admin", "superadmin"].includes(actor.role ?? "")) {
      return res.status(403).json({ error: "Admin or superadmin role required." });
    }

    const { displayName, phone, email, packTier, sponsorCode, placementLeg } = req.body;
    if (!displayName || !phone || !packTier) {
      return res.status(400).json({ error: "displayName, phone, and packTier are required." });
    }
    const VALID_TIERS = ["bronze","silver","gold","platinum","vip"];
    if (!VALID_TIERS.includes(packTier)) {
      return res.status(400).json({ error: `Invalid packTier. Must be one of: ${VALID_TIERS.join(", ")}` });
    }

    const pvMap:    Record<string, number> = { bronze: 50, silver: 150, gold: 350, platinum: 700, vip: 1200 };
    const priceMap: Record<string, number> = { bronze: 25000, silver: 75000, gold: 180000, platinum: 350000, vip: 600000 };

    // Generate 12-char hex temp password
    const tempPassword = crypto.randomBytes(6).toString("hex");
    const userEmail = (email?.trim()) || `dist-${Date.now()}@songtai.admin`;

    // Create Supabase auth user
    const { data: newAuthUser, error: createError } = await db.auth.admin.createUser({
      email: userEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { displayName, phone },
    });
    if (createError) throw createError;
    const userId = newAuthUser.user.id;

    // Resolve sponsor
    let resolvedSponsorCode: string | null = null;
    if (sponsorCode) {
      const { data: sponsor } = await db.from("distributors").select("id, distributor_code").eq("distributor_code", sponsorCode).maybeSingle();
      resolvedSponsorCode = sponsor?.distributor_code ?? null;
    }

    // BFS placement under sponsor (or root if none)
    let placementId: string | null = resolvedSponsorCode;
    let finalLeg: "left" | "right" = "left";
    if (resolvedSponsorCode && (!placementLeg || placementLeg === "auto")) {
      const queue: string[] = [resolvedSponsorCode];
      bfsSearch: while (queue.length > 0) {
        const code = queue.shift()!;
        const { data: kids } = await db.from("distributors").select("distributor_code, placement_leg").eq("placement_id", code);
        const leftKid  = (kids ?? []).find((k: any) => k.placement_leg === "left");
        const rightKid = (kids ?? []).find((k: any) => k.placement_leg === "right");
        if (!leftKid)  { placementId = code; finalLeg = "left";  break bfsSearch; }
        if (!rightKid) { placementId = code; finalLeg = "right"; break bfsSearch; }
        queue.push(leftKid.distributor_code, rightKid.distributor_code);
      }
    } else if (resolvedSponsorCode && (placementLeg === "left" || placementLeg === "right")) {
      placementId = resolvedSponsorCode;
      finalLeg = placementLeg;
    }

    // Generate unique distributor code
    const code = `ST-${Math.floor(10000 + Math.random() * 90000)}`;

    // Create profile
    await db.from("profiles").upsert({
      id: userId, email: userEmail, phone,
      display_name: displayName, role: "distributor",
      account_source: "admin_created",
      created_by_admin: actorId,
      must_change_password: true,
    }, { onConflict: "id" });

    // Create distributor row (status: active immediately — no payment)
    await db.from("distributors").insert({
      id: userId, distributor_code: code,
      sponsor_id:     resolvedSponsorCode ?? "Root",
      placement_id:   placementId ?? resolvedSponsorCode ?? "Root",
      placement_leg:  finalLeg,
      rank:           "bronze",
      kyc_status:     "none",
      status:         "active",
      pack_tier:      packTier,
      pack_price_xaf: priceMap[packTier] ?? 0,
      pack_pv:        pvMap[packTier] ?? 50,
      pv:             pvMap[packTier] ?? 50,
      referral_link:  `https://songtailife.cm/join?ref=${code}`,
      joined_at:      new Date().toISOString(),
      created_by_admin: actorId,
    });

    // Audit log (never let this block the response)
    try {
      await db.from("audit_logs").insert({
        action: "God-Mode Distributor Created",
        details: `Admin ${actor.email ?? actorId} created distributor for ${displayName} (${phone}). Pack: ${packTier}. Code: ${code}. Sponsor: ${resolvedSponsorCode ?? "none"}. Placement: ${finalLeg} under ${placementId ?? "root"}. NO payment collected — admin activation override.`,
      });
    } catch { /* audit failure must never block the response */ }

    // Send WhatsApp with credentials (fire-and-forget)
    const waPhone = phone.replace(/\s/g, "");
    const waTo = waPhone.startsWith("whatsapp:") ? waPhone : `whatsapp:${waPhone.startsWith("+") ? waPhone : `+${waPhone}`}`;
    const waBody = [
      `🌟 *Welcome to Songtai Life!*`,
      ``,
      `Your distributor account has been set up by our team.`,
      ``,
      `*Name:* ${displayName}`,
      `*Distributor Code:* ${code}`,
      `*Pack:* ${packTier.charAt(0).toUpperCase() + packTier.slice(1)}`,
      ``,
      `*Login Details:*`,
      `*Email:* ${userEmail}`,
      `*Temporary Password:* ${tempPassword}`,
      ``,
      `⚠️ Log in and change your password immediately.`,
      `🔗 https://songtailife.cm/distributor/login`,
    ].join("\n");
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken  = process.env.TWILIO_AUTH_TOKEN;
      const fromNumber = process.env.TWILIO_WHATSAPP_FROM;
      if (accountSid && authToken && fromNumber) {
        const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
        await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
          method: "POST",
          headers: { "Authorization": `Basic ${credentials}`, "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ From: fromNumber, To: waTo, Body: waBody }).toString(),
        });
      }
    } catch (err: any) {
      console.error(`[GodMode] WhatsApp notification failed for ${displayName}:`, err.message);
    }

    return res.json({
      success: true, userId, distributorCode: code,
      tempPassword, email: userEmail,
      placementId, placementLeg: finalLeg,
      sponsorCode: resolvedSponsorCode,
      note: "IMPORTANT: Commission implications for admin-created distributors have not been confirmed with Zayne. No commissions were triggered. Resolve this business rule before this account's sponsor expects a payout.",
    });
  }));

  // ── Admin: list all partner sites ─────────────────────────────────────────
  app.get("/api/admin/partners", requireDb(async (db, req, res) => {
    const sessionUser = (req as any).user;
    if (!sessionUser?.claims?.sub) return res.status(401).json({ error: "Authorization required." });
    const actorId = sessionUser.claims.sub as string;
    const { data: actor } = await db.from("profiles").select("role").eq("id", actorId).maybeSingle();
    if (!actor || !["admin", "superadmin"].includes(actor.role ?? "")) {
      return res.status(403).json({ error: "Admin or superadmin role required." });
    }
    const { data } = await db.from("partners").select("*").order("created_at", { ascending: false });
    return res.json(data ?? []);
  }));

  // ── Admin: create a partner site ──────────────────────────────────────────
  app.post("/api/admin/partner/create", requireDb(async (db, req, res) => {
    const sessionUser = (req as any).user;
    if (!sessionUser?.claims?.sub) return res.status(401).json({ error: "Authorization required." });
    const actorId = sessionUser.claims.sub as string;
    const { data: actor } = await db.from("profiles").select("role, email").eq("id", actorId).maybeSingle();
    if (!actor || !["admin", "superadmin"].includes(actor.role ?? "")) {
      return res.status(403).json({ error: "Admin or superadmin role required." });
    }

    const { slug, pendingContactName, pendingContactPhone, whatsappNumber, contactEmail,
            heroTitleEn, heroTitleFr, heroSubtitleEn, heroSubtitleFr, heroImageUrl,
            distributorId, status, customDomain } = req.body;

    if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return res.status(400).json({ error: "slug is required and must be URL-safe (lowercase letters, numbers, hyphens)." });
    }

    // Check slug uniqueness
    const { data: existing } = await db.from("partners").select("id").eq("slug", slug).maybeSingle();
    if (existing) return res.status(409).json({ error: `Slug "${slug}" is already taken.` });

    const now = new Date().toISOString();
    const initialStatus = status === "active" ? "active" : "pending";

    const { data, error } = await db.from("partners").insert({
      slug,
      whatsapp_number:      whatsappNumber || null,
      contact_email:        contactEmail || null,
      hero_title_en:        heroTitleEn || null,
      hero_title_fr:        heroTitleFr || null,
      hero_subtitle_en:     heroSubtitleEn || null,
      hero_subtitle_fr:     heroSubtitleFr || null,
      hero_image_url:       heroImageUrl || null,
      distributor_id:       distributorId || null,
      pending_contact_name: pendingContactName || null,
      pending_contact_phone:pendingContactPhone || null,
      custom_domain:        customDomain || null,
      status:               initialStatus,
      created_by_admin:     actorId,
      ...(initialStatus === "active" ? { approved_by: actorId, approved_at: now } : {}),
    }).select().single();
    if (error) throw error;

    try {
      await db.from("audit_logs").insert({
        action: "Partner Site Created",
        details: `Admin ${actor.email ?? actorId} created partner site "${slug}" (status: ${initialStatus}). Contact: ${pendingContactName ?? "—"} / ${pendingContactPhone ?? "—"}.`,
      });
    } catch {}

    return res.json({ success: true, partner: data });
  }));

  // ── Admin: update a partner site ──────────────────────────────────────────
  app.put("/api/admin/partner/:id", requireDb(async (db, req, res) => {
    const sessionUser = (req as any).user;
    if (!sessionUser?.claims?.sub) return res.status(401).json({ error: "Authorization required." });
    const actorId = sessionUser.claims.sub as string;
    const { data: actor } = await db.from("profiles").select("role, email").eq("id", actorId).maybeSingle();
    if (!actor || !["admin", "superadmin"].includes(actor.role ?? "")) {
      return res.status(403).json({ error: "Admin or superadmin role required." });
    }

    const { id } = req.params;
    const { pendingContactName, pendingContactPhone, whatsappNumber, contactEmail,
            heroTitleEn, heroTitleFr, heroSubtitleEn, heroSubtitleFr, heroImageUrl,
            distributorId, status, customDomain } = req.body;

    const { data: current } = await db.from("partners").select("status, slug").eq("id", id).maybeSingle();
    if (!current) return res.status(404).json({ error: "Partner not found." });

    const now = new Date().toISOString();
    const updates: Record<string, any> = {};

    // Only include fields that were explicitly passed in the body
    if ("pendingContactName" in req.body) updates.pending_contact_name  = pendingContactName ?? null;
    if ("pendingContactPhone" in req.body) updates.pending_contact_phone = pendingContactPhone ?? null;
    if ("whatsappNumber"      in req.body) updates.whatsapp_number       = whatsappNumber ?? null;
    if ("contactEmail"        in req.body) updates.contact_email         = contactEmail ?? null;
    if ("heroTitleEn"         in req.body) updates.hero_title_en         = heroTitleEn ?? null;
    if ("heroTitleFr"         in req.body) updates.hero_title_fr         = heroTitleFr ?? null;
    if ("heroSubtitleEn"      in req.body) updates.hero_subtitle_en      = heroSubtitleEn ?? null;
    if ("heroSubtitleFr"      in req.body) updates.hero_subtitle_fr      = heroSubtitleFr ?? null;
    if ("heroImageUrl"        in req.body) updates.hero_image_url        = heroImageUrl ?? null;
    if ("distributorId"       in req.body) updates.distributor_id        = distributorId ?? null;
    if ("customDomain"        in req.body) updates.custom_domain         = customDomain ?? null;

    if (status && status !== current.status) {
      updates.status = status;
      if (status === "active") { updates.approved_by = actorId; updates.approved_at = now; }
    }

    const { data, error } = await db.from("partners").update(updates).eq("id", id).select().single();
    if (error) throw error;

    try {
      await db.from("audit_logs").insert({
        action: "Partner Site Updated",
        details: `Admin ${actor.email ?? actorId} updated partner site "${current.slug}" (id: ${id}).${status && status !== current.status ? ` Status: ${current.status} → ${status}.` : ""}`,
      });
    } catch {}

    return res.json({ success: true, partner: data });
  }));

  // ── Admin: attach a custom domain to a partner site via Vercel API ──────────
  app.post("/api/admin/partner/:id/domain/attach", requireDb(async (db, req, res) => {
    const sessionUser = (req as any).user;
    if (!sessionUser?.claims?.sub) return res.status(401).json({ error: "Authorization required." });
    const actorId = sessionUser.claims.sub as string;
    const { data: actor } = await db.from("profiles").select("role, email").eq("id", actorId).maybeSingle();
    if (!actor || !["admin", "superadmin"].includes(actor.role ?? "")) {
      return res.status(403).json({ error: "Admin or superadmin role required." });
    }

    const VERCEL_API_TOKEN   = process.env.VERCEL_API_TOKEN;
    const VERCEL_PROJECT_ID  = process.env.VERCEL_PROJECT_ID;
    if (!VERCEL_API_TOKEN || !VERCEL_PROJECT_ID) {
      return res.status(503).json({
        error: "Vercel domain integration is not configured. Set VERCEL_API_TOKEN and VERCEL_PROJECT_ID environment secrets.",
        missing: [!VERCEL_API_TOKEN && "VERCEL_API_TOKEN", !VERCEL_PROJECT_ID && "VERCEL_PROJECT_ID"].filter(Boolean),
      });
    }

    const { id } = req.params;
    const { domain } = req.body;
    if (!domain || !/^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i.test(domain)) {
      return res.status(400).json({ error: "A valid domain name is required (e.g. janedoe-wellness.com)." });
    }

    const { data: partner } = await db.from("partners").select("id, slug, custom_domain").eq("id", id).maybeSingle();
    if (!partner) return res.status(404).json({ error: "Partner not found." });

    // Call Vercel API to add the domain
    const vercelRes = await fetch(
      `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${VERCEL_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: domain }),
      }
    );
    const vercelData = await vercelRes.json() as any;

    if (!vercelRes.ok && vercelData.error?.code !== "domain_already_in_use") {
      console.error("[Domain] Vercel API error:", vercelData);
      return res.status(502).json({
        error: vercelData.error?.message ?? "Vercel API rejected the domain. Check the domain name and try again.",
        vercel_code: vercelData.error?.code,
      });
    }

    const verification = vercelData.verification ?? [];
    const now = new Date().toISOString();

    // Update partner row: store domain, verification token, and set status
    const updatePayload: Record<string, any> = {
      custom_domain: domain,
      domain_status: "pending_verification",
      vercel_domain_added_at: now,
    };
    // Store verification records as JSON string if the column exists
    if (verification.length > 0) {
      updatePayload.domain_verification_token = JSON.stringify(verification);
    }
    await db.from("partners").update(updatePayload).eq("id", id);

    try {
      await db.from("audit_logs").insert({
        action: "Partner Custom Domain Attached",
        details: `Admin ${actor.email ?? actorId} attached domain "${domain}" to partner site "${partner.slug}" (id: ${id}). Vercel status: pending_verification.`,
      });
    } catch {}

    return res.json({
      success: true,
      domain,
      domain_status: "pending_verification",
      verification,
      message: "Domain added to Vercel. Configure the DNS records below at your domain registrar, then check status.",
    });
  }));

  // ── Admin: check Vercel domain verification status ────────────────────────
  app.post("/api/admin/partner/:id/domain/check", requireDb(async (db, req, res) => {
    const sessionUser = (req as any).user;
    if (!sessionUser?.claims?.sub) return res.status(401).json({ error: "Authorization required." });
    const actorId = sessionUser.claims.sub as string;
    const { data: actor } = await db.from("profiles").select("role, email").eq("id", actorId).maybeSingle();
    if (!actor || !["admin", "superadmin"].includes(actor.role ?? "")) {
      return res.status(403).json({ error: "Admin or superadmin role required." });
    }

    const VERCEL_API_TOKEN   = process.env.VERCEL_API_TOKEN;
    const VERCEL_PROJECT_ID  = process.env.VERCEL_PROJECT_ID;
    if (!VERCEL_API_TOKEN || !VERCEL_PROJECT_ID) {
      return res.status(503).json({
        error: "Vercel domain integration is not configured. Set VERCEL_API_TOKEN and VERCEL_PROJECT_ID environment secrets.",
      });
    }

    const { id } = req.params;
    const { data: partner } = await db.from("partners").select("id, slug, custom_domain, domain_status").eq("id", id).maybeSingle();
    if (!partner) return res.status(404).json({ error: "Partner not found." });
    if (!partner.custom_domain) return res.status(400).json({ error: "This partner has no custom domain set." });

    // Query Vercel for domain status
    const vercelRes = await fetch(
      `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${encodeURIComponent(partner.custom_domain)}`,
      { headers: { Authorization: `Bearer ${VERCEL_API_TOKEN}` } }
    );
    const vercelData = await vercelRes.json() as any;

    if (!vercelRes.ok) {
      console.error("[Domain] Vercel check error:", vercelData);
      return res.status(502).json({
        error: vercelData.error?.message ?? "Could not check domain status with Vercel.",
        vercel_code: vercelData.error?.code,
      });
    }

    const verified   = vercelData.verified === true;
    const verification = vercelData.verification ?? [];
    const newStatus  = verified ? "verified" : "pending_verification";

    await db.from("partners").update({ domain_status: newStatus }).eq("id", id);

    if (verified) {
      try {
        await db.from("audit_logs").insert({
          action: "Partner Custom Domain Verified",
          details: `Domain "${partner.custom_domain}" for partner "${partner.slug}" (id: ${id}) is now verified. SSL will be provisioned by Vercel automatically.`,
        });
      } catch {}
    }

    return res.json({
      success: true,
      domain: partner.custom_domain,
      verified,
      domain_status: newStatus,
      verification,
      message: verified
        ? "Domain is verified! Vercel will provision SSL automatically within minutes."
        : "Domain is not yet verified. Ensure the DNS records are correctly configured at your registrar.",
    });
  }));

  // ── Public partner lookup by slug ─────────────────────────────────────────
  app.get("/api/partner/:slug", requireDb(async (db, req, res) => {
    const { slug } = req.params as { slug: string };
    if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return res.status(400).json({ error: "Invalid slug format" });
    }
    const { data, error } = await db
      .from("partners")
      .select(
        "id, slug, whatsapp_number, contact_email, " +
        "hero_title_en, hero_title_fr, hero_subtitle_en, hero_subtitle_fr, " +
        "hero_image_url, status"
      )
      .eq("slug", slug)
      .eq("status", "active")
      .single();
    if (error || !data) {
      return res.status(404).json({ error: "Partner not found or inactive" });
    }
    return res.json(data);
  }));

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "Songtai Life Backend — Replit Edition" });
  });

  // ── Re-host external image via server-side proxy ─────────────────────────
  // Fetches an external image URL server-side (avoids CORS) and uploads it
  // to Supabase Storage, returning the new Storage public URL.
  // Auth: must be authenticated admin or superadmin. Rate-limited.
  const ALLOWED_IMAGE_MIMES_SERVER = new Set([
    "image/jpeg","image/png","image/webp","image/avif","image/gif","image/svg+xml",
  ]);
  // SSRF block-list: reject requests to private/loopback/link-local ranges
  function isSsrfSafeUrl(rawUrl: string): boolean {
    let parsed: URL;
    try { parsed = new URL(rawUrl); } catch { return false; }
    if (!["http:","https:"].includes(parsed.protocol)) return false;
    const h = parsed.hostname.toLowerCase();
    // Reject localhost and common internal hostnames
    if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return false;
    // Reject IP literals in private/loopback/link-local/metadata ranges
    const ipv4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4) {
      const [, a, b, c] = ipv4.map(Number);
      if (a === 10) return false;                          // RFC1918
      if (a === 172 && b >= 16 && b <= 31) return false;  // RFC1918
      if (a === 192 && b === 168) return false;            // RFC1918
      if (a === 127) return false;                         // loopback
      if (a === 169 && b === 254) return false;            // link-local / AWS metadata
      if (a === 0) return false;                           // 0.x.x.x
      if (a === 100 && b >= 64 && b <= 127) return false;  // CGNAT
    }
    // Reject IPv6 loopback ::1
    if (h === "::1" || h === "[::1]") return false;
    return true;
  }
  const rehostAttempts = new Map<string, { count: number; resetAt: number }>();
  app.post("/api/admin/rehost-image", requireDb(async (db, req, res) => {
    // ── Auth: must be signed in ──────────────────────────────────────
    const sessionUser = (req as any).user;
    if (!sessionUser?.claims?.sub) {
      return res.status(401).json({ error: "Authentication required." });
    }
    const actorId = sessionUser.claims.sub as string;

    // ── Authz: must be admin or superadmin ───────────────────────────
    const { data: profile } = await db.from("profiles").select("role").eq("id", actorId).maybeSingle();
    if (!profile || !["admin","superadmin"].includes(profile.role ?? "")) {
      return res.status(403).json({ error: "Forbidden." });
    }

    // ── Rate limit: 20 rehost calls per admin per hour ───────────────
    const now = Date.now();
    const rb = rehostAttempts.get(actorId) ?? { count: 0, resetAt: now + 60 * 60 * 1000 };
    if (now >= rb.resetAt) { rb.count = 0; rb.resetAt = now + 60 * 60 * 1000; }
    if (rb.count >= 20) return res.status(429).json({ error: "Rate limit: 20 re-hosts per hour. Try again later." });
    rb.count++;
    rehostAttempts.set(actorId, rb);

    const { sourceUrl, bucket = "media", folder = "migrated" } = req.body ?? {};
    if (!sourceUrl || typeof sourceUrl !== "string") {
      return res.status(400).json({ error: "sourceUrl is required" });
    }

    // ── SSRF guard ───────────────────────────────────────────────────
    if (!isSsrfSafeUrl(sourceUrl)) {
      return res.status(400).json({ error: "sourceUrl is not a safe public URL." });
    }

    // ── Validate bucket ──────────────────────────────────────────────
    if (!["media","documents","testimonials"].includes(bucket)) {
      return res.status(400).json({ error: "Invalid bucket." });
    }

    // ── Fetch image ──────────────────────────────────────────────────
    let contentType = "image/jpeg";
    let buffer: ArrayBuffer;
    try {
      const response = await fetch(sourceUrl, {
        headers: { "User-Agent": "SongtaiLife-MediaMigrator/1.0" },
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status} fetching source image`);
      contentType = response.headers.get("content-type")?.split(";")[0].trim() ?? "image/jpeg";
      if (!ALLOWED_IMAGE_MIMES_SERVER.has(contentType)) {
        return res.status(400).json({ error: `Content-Type "${contentType}" is not an allowed image type.` });
      }
      // Enforce max 10 MB
      const lengthHeader = response.headers.get("content-length");
      if (lengthHeader && Number(lengthHeader) > 10 * 1024 * 1024) {
        return res.status(400).json({ error: "Source image exceeds 10 MB limit." });
      }
      buffer = await response.arrayBuffer();
      if (buffer.byteLength > 10 * 1024 * 1024) {
        return res.status(400).json({ error: "Downloaded image exceeds 10 MB limit." });
      }
    } catch (err: any) {
      return res.status(502).json({ error: `Failed to fetch source image: ${err.message}` });
    }

    // ── Upload to Storage ────────────────────────────────────────────
    const extMap: Record<string, string> = {
      "image/jpeg":"jpg","image/png":"png","image/webp":"webp",
      "image/avif":"avif","image/gif":"gif","image/svg+xml":"svg",
    };
    const ext = extMap[contentType] ?? "jpg";
    const safeFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, "").slice(0, 64) || "migrated";
    const slug = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const storagePath = `${safeFolder}/${slug}`;
    const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${storagePath}`;

    try {
      const uploadRes = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabaseServiceKey}`,
          "Content-Type": contentType,
          "x-upsert": "false",
        },
        body: buffer,
      });
      if (!uploadRes.ok) {
        const body = await uploadRes.text();
        throw new Error(`Storage upload failed: ${body}`);
      }
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }

    const newUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${storagePath}`;
    res.json({ newUrl });
  }));

  // ── robots.txt ──────────────────────────────────────────────────────────────
  app.get("/robots.txt", (_req, res) => {
    const base = process.env.SITE_URL ?? "https://songtailife.cm";
    res.type("text/plain").send(
      [
        "User-agent: *",
        "Allow: /",
        "Disallow: /admin",
        "Disallow: /distributor",
        "Disallow: /api",
        "",
        `Sitemap: ${base}/sitemap.xml`,
      ].join("\n")
    );
  });

  // ── sitemap.xml — dynamic from Supabase content ──────────────────────────
  app.get("/sitemap.xml", async (_req, res) => {
    const base = process.env.SITE_URL ?? "https://songtailife.cm";
    const now = new Date().toISOString();

    try {
      const [{ data: products }, { data: posts }, { data: events }] = await Promise.all([
        db
          ? db.from("products").select("slug, updated_at, video_url_en, video_url_fr, video_source_en, video_source_fr, video_thumbnail_en, video_thumbnail_fr, video_duration_seconds, video_title_en, video_title_fr, video_description_en, video_description_fr, name_en").eq("is_active", true)
          : { data: [] },
        db
          ? db.from("blog_posts").select("slug, published_at").eq("status", "published")
          : { data: [] },
        db
          ? db.from("events").select("slug, start_at").eq("is_active", true)
          : { data: [] },
      ]);

      const staticUrls = [
        { loc: base, priority: "1.0", changefreq: "weekly" },
        { loc: `${base}/?section=about`,       priority: "0.7", changefreq: "monthly" },
        { loc: `${base}/?section=products`,    priority: "0.9", changefreq: "weekly" },
        { loc: `${base}/?section=events`,      priority: "0.8", changefreq: "weekly" },
        { loc: `${base}/?section=blog`,        priority: "0.8", changefreq: "weekly" },
        { loc: `${base}/?section=gallery`,     priority: "0.6", changefreq: "monthly" },
        { loc: `${base}/?section=opportunity`, priority: "0.8", changefreq: "monthly" },
        { loc: `${base}/?section=faq`,         priority: "0.7", changefreq: "monthly" },
        { loc: `${base}/?section=contact`,     priority: "0.6", changefreq: "yearly" },
        { loc: `${base}/?section=media`,       priority: "0.6", changefreq: "monthly" },
        { loc: `${base}/?section=videos`,      priority: "0.7", changefreq: "weekly" },
        { loc: `${base}/?section=appointment`, priority: "0.6", changefreq: "monthly" },
      ];

      const YOUTUBE_ID_RE = /^[a-zA-Z0-9_-]{11}$/;
      const youtubeIdFromUrl = (input: string | null): string | null => {
        if (!input) return null;
        const trimmed = input.trim();
        if (!trimmed) return null;
        if (YOUTUBE_ID_RE.test(trimmed)) return trimmed;
        let url: URL;
        try { url = new URL(trimmed); } catch { return null; }
        const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "");
        if (!/(^|\.)youtube\.com$|(^|\.)youtube-nocookie\.com$|^youtu\.be$/.test(host)) return null;
        let candidate: string | null = null;
        if (host === "youtu.be") {
          candidate = url.pathname.split("/").filter(Boolean)[0] ?? null;
        } else if (url.pathname === "/watch") {
          candidate = url.searchParams.get("v");
        } else {
          const parts = url.pathname.split("/").filter(Boolean);
          const idx = parts.findIndex(p => p === "embed" || p === "shorts" || p === "live");
          if (idx !== -1 && parts[idx + 1]) candidate = parts[idx + 1];
        }
        return candidate && YOUTUBE_ID_RE.test(candidate) ? candidate : null;
      };

      const productUrls = (products ?? []).map((p: any) => {
        const videoUrl = p.video_url_en || p.video_url_fr || null;
        const videoSource = (p.video_url_en ? p.video_source_en : p.video_source_fr) === "youtube" ? "youtube" : "upload";
        const videoThumb = p.video_thumbnail_en || p.video_thumbnail_fr || null;
        const videoTitle = p.video_title_en || p.video_title_fr || p.name_en || "";
        const videoDesc = p.video_description_en || p.video_description_fr || "";
        const videoDuration = p.video_duration_seconds ?? null;
        const youtubeId = videoSource === "youtube" ? youtubeIdFromUrl(videoUrl) : null;
        return {
          loc: `${base}/?section=products&slug=${p.slug}`,
          lastmod: p.updated_at ? new Date(p.updated_at).toISOString() : now,
          priority: "0.7",
          changefreq: "weekly",
          video: videoUrl
            ? {
                url: youtubeId ? null : videoUrl,
                playerLoc: youtubeId ? `https://www.youtube-nocookie.com/embed/${youtubeId}` : null,
                thumb: videoThumb || (youtubeId ? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg` : null),
                title: videoTitle,
                desc: videoDesc,
                duration: videoDuration,
              }
            : null,
        };
      });

      const postUrls = (posts ?? []).map((p: any) => ({
        loc: `${base}/?section=blog&slug=${p.slug}`,
        lastmod: p.published_at ? new Date(p.published_at).toISOString() : now,
        priority: "0.6",
        changefreq: "monthly",
      }));

      const eventUrls = (events ?? []).map((e: any) => ({
        loc: `${base}/?section=events&slug=${e.slug}`,
        lastmod: e.start_at ? new Date(e.start_at).toISOString() : now,
        priority: "0.6",
        changefreq: "weekly",
      }));

      const allUrls = [
        ...staticUrls.map(u => ({ ...u, lastmod: now })),
        ...productUrls,
        ...postUrls,
        ...eventUrls,
      ];

      const escXml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

      const xml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
        '        xmlns:xhtml="http://www.w3.org/1999/xhtml"',
        '        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">',
        ...allUrls.map((u: any) => {
          const sep = u.loc.includes("?") ? "&amp;" : "?";
          const lines = [
            "  <url>",
            `    <loc>${u.loc}</loc>`,
            `    <lastmod>${u.lastmod}</lastmod>`,
            `    <changefreq>${u.changefreq}</changefreq>`,
            `    <priority>${u.priority}</priority>`,
            `    <xhtml:link rel="alternate" hreflang="en" href="${u.loc}${sep}lang=en"/>`,
            `    <xhtml:link rel="alternate" hreflang="fr" href="${u.loc}${sep}lang=fr"/>`,
          ];
          if (u.video) {
            const v = u.video;
            lines.push("    <video:video>");
            if (v.thumb) lines.push(`      <video:thumbnail_loc>${escXml(v.thumb)}</video:thumbnail_loc>`);
            lines.push(`      <video:title>${escXml(v.title)}</video:title>`);
            if (v.desc) lines.push(`      <video:description>${escXml(v.desc)}</video:description>`);
            if (v.url) lines.push(`      <video:content_loc>${escXml(v.url)}</video:content_loc>`);
            if (v.playerLoc) lines.push(`      <video:player_loc>${escXml(v.playerLoc)}</video:player_loc>`);
            if (v.duration) lines.push(`      <video:duration>${v.duration}</video:duration>`);
            lines.push(`      <video:publication_date>${u.lastmod}</video:publication_date>`);
            lines.push("    </video:video>");
          }
          lines.push("  </url>");
          return lines.join("\n");
        }),
        "</urlset>",
      ].join("\n");

      res.type("application/xml").send(xml);
    } catch (err: any) {
      res.status(500).type("text/plain").send(`Sitemap generation error: ${err.message}`);
    }
  });

  // Vite dev middleware / production static files
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

}

// ── Initialize middleware & routes (async) ────────────────────────────────────
const serverReady = startServer().catch((err) => {
  console.error("Critical error during server initialization:", err);
  process.exit(1);
});

// ── Vercel serverless export ──────────────────────────────────────────────────
// @vercel/node picks up the default export as the HTTP handler.
// We await serverReady so all middleware and routes are registered before the
// first request arrives, even though setup is asynchronous.
export default async function handler(req: any, res: any) {
  await serverReady;
  return (app as any)(req, res);
}

// ── Replit / local: start the TCP listener ───────────────────────────────────
// process.env.VERCEL is injected automatically by Vercel's runtime.
// When absent (Replit, Docker, local dev) we start a normal HTTP server.
if (!process.env.VERCEL) {
  serverReady.then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server listening on host 0.0.0.0, port ${PORT}`);
    });
  });
}
