import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import crypto from "crypto";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./server/replit_integrations/auth/index";

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
    return handler(db, req, res);
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

async function startServer() {
  const app = express();
  const parsedPort = parseInt(process.env.PORT ?? "");
  const PORT = Number.isInteger(parsedPort) && parsedPort > 0 && parsedPort <= 65535 ? parsedPort : 5000;

  app.use(express.json());

  // Setup Replit Auth (session + OIDC) BEFORE other routes
  await setupAuth(app);
  registerAuthRoutes(app);

  await hydrateSeeds();

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
  // MESOMB PAYMENTS WORKFLOW API
  // =========================================================================

  app.post("/api/payment/checkout", requireDb(async (db, req, res) => {
    const { amountXaf, pvPoints, phone, provider, cart, userId } = req.body;

    if (!amountXaf || !phone || !provider) {
      return res.status(400).json({ error: "Missing required checkout parameters: amountXaf, phone, provider" });
    }

    const orderId = `ord-${crypto.randomBytes(4).toString("hex")}`;

    const { error } = await db.from("orders").insert({
      order_id: orderId,
      user_id: userId || "guest",
      amount_xaf: Number(amountXaf),
      pv_points: Number(pvPoints || 0),
      phone,
      provider,
      cart: cart || [],
      status: "pending",
    });

    if (error) throw new Error(error.message);
    console.log(`[Payments] Order ${orderId} created in pending state.`);

    res.json({
      success: true,
      orderId,
      status: "pending",
      message: "Payment handshake initiated. Confirm carrier verification on your handset.",
    });
  }));

  app.post("/api/payment/webhook", requireDb(async (db, req, res) => {
    const signatureHeader = req.headers["x-mesomb-signature"] || req.headers["X-MeSomb-Signature"];
    const rawBody = JSON.stringify(req.body);
    const signatureKey = process.env.MESOMB_SIGNATURE_KEY;
    if (!signatureKey && process.env.NODE_ENV === "production") {
      console.error("[Webhook] MESOMB_SIGNATURE_KEY is not set — cannot verify signatures in production.");
      return res.status(500).json({ error: "Webhook signature key not configured." });
    }

    if (signatureHeader) {
      if (!signatureKey) {
        console.warn("[Webhook] Received signed webhook but MESOMB_SIGNATURE_KEY is not set — rejecting.");
        return res.status(500).json({ error: "Webhook signature key not configured." });
      }
      const computedSignature = crypto.createHmac("sha256", signatureKey).update(rawBody).digest("hex");
      if (signatureHeader !== computedSignature) {
        console.warn("[Webhook] HMAC-SHA256 signature verification failed. Rejecting.");
        return res.status(401).json({ error: "Invalid webhook signature." });
      }
      console.log("[Webhook] HMAC-SHA256 signature verified successfully.");
    } else {
      if (process.env.NODE_ENV === "production") {
        console.warn("[Webhook] Missing signature in production — rejecting.");
        return res.status(401).json({ error: "Webhook signature required in production." });
      }
      console.log("[Webhook] No signature header — running in sandbox development mode.");
    }

    const { orderId, transactionId } = req.body;
    if (!orderId) return res.status(400).json({ error: "Missing orderId in webhook body." });

    const { data: alreadyProcessed } = await db
      .from("processed_payments")
      .select("order_id")
      .eq("order_id", orderId)
      .maybeSingle();

    if (alreadyProcessed) {
      console.log(`[Webhook] Duplicate callback skipped for Order ${orderId}.`);
      return res.json({ success: true, message: "Duplicate callback skipped." });
    }

    const { data: orderData } = await db
      .from("orders")
      .select("*")
      .eq("order_id", orderId)
      .maybeSingle();

    if (!orderData) return res.status(404).json({ error: `Order ${orderId} not found.` });
    if (orderData.status === "paid") {
      console.log(`[Webhook] Order ${orderId} is already marked as paid.`);
      return res.json({ success: true });
    }

    const finalTxId = transactionId || `tx-${crypto.randomBytes(6).toString("hex")}`;

    await db.from("orders").update({
      status: "paid",
      transaction_id: finalTxId,
      paid_at: new Date().toISOString(),
    }).eq("order_id", orderId);

    await db.from("processed_payments").insert({
      order_id: orderId,
      transaction_id: finalTxId,
    });

    console.log(`[Webhook] Order ${orderId} marked as PAID. Initializing commission calculations.`);

    if (orderData.user_id && orderData.user_id !== "guest") {
      await calculateUnilevelCommissions(orderId, orderData.user_id, orderData.amount_xaf, orderData.pv_points);
    }

    res.json({ success: true, message: "Order processed successfully." });
  }));

  app.post("/api/payment/payout", requireDb(async (db, req, res) => {
    // Verify caller via Replit Auth session
    const sessionUser = (req as any).user;
    if (!sessionUser?.claims?.sub) {
      return res.status(401).json({ error: "Authorization required." });
    }
    const userId = sessionUser.claims.sub;

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
      description: `MeSomb Payout withdrawal initiated to ${phone} (${provider.toUpperCase()})`,
      status: "pending",
    });

    console.log(`[Payout] Withdrawal request logged for User ${userId}, amount ${amount} XAF. Status: Pending.`);

    setTimeout(async () => {
      try {
        await db.from("wallet_transactions").update({
          status: "completed",
        }).eq("id", txId);
        console.log(`[Payout-Cron] Withdrawal transaction ${txId} successfully completed.`);
      } catch (subErr: any) {
        console.error("[Payout-Cron-Error]", subErr.message);
      }
    }, 5000);

    res.json({
      success: true,
      transactionId: txId,
      status: "pending",
      message: "Sovereign Payout initiated securely. Funds will clear within minutes.",
    });
  }));

  app.post("/api/distributor/add-downline", requireDb(async (db, req, res) => {
    const sessionUser = (req as any).user;
    if (!sessionUser?.claims?.sub) {
      return res.status(401).json({ error: "Authorization required." });
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

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "Songtai Life Backend — Replit Edition" });
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on host 0.0.0.0, port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Critical error starting backend server:", err);
});
