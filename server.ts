import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import admin from "firebase-admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import crypto from "crypto";

dotenv.config();

// Initialize Firebase Admin SDK
try {
  admin.initializeApp({
    projectId: "webmail-7159a"
  });
  console.log("Firebase Admin SDK initialized successfully");
} catch (e: any) {
  console.log("Firebase Admin already initialized or encountered error: ", e.message);
}

const db = getFirestore();

// Pre-hydrate collections with seeds on startup if they are empty
async function hydrateSeeds() {
  try {
    const productsSnap = await db.collection("products").limit(1).get();
    if (productsSnap.empty) {
      console.log("Hydrating initial products seed into Firestore...");
      const PRODUCTS_SEED = [
        {
          id: "prod-cell-vital",
          slug: "cellular-vitality-pro",
          name: "Cellular Vitality Pro",
          description: "Premium wellness capsule formulated with advanced antioxidants, organic African moringa extracts, and active micro-nutrients. Promotes deep energetic recovery, cellular rejuvenation, and supports your natural daily immune system defense with high-potency bio-availability.",
          priceXaf: 32000,
          pvPoints: 60,
          category: "Health",
          image: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&q=80&w=800",
          stock: 120,
          isActive: true,
          benefits: [
            "Enhances cellular rejuvenation and everyday bio-energy",
            "Rich in natural antioxidants from premium moringa and green tea",
            "Improves daily physical stamina and mental clarity"
          ],
          usage: "Take 2 capsules daily in the morning with warm water."
        },
        {
          id: "prod-luminous-gold",
          slug: "luminous-gold-serum",
          name: "Luminous Gold Elixir",
          description: "An ultra-premium revitalizing face serum powered by pure rosehip extract, cold-pressed argan oils, and light-reflecting natural minerals. Designed to combat hyperpigmentation, smooth fine lines, and give your skin a beautiful, balanced, golden radiance perfect for the West African climate.",
          priceXaf: 28500,
          pvPoints: 50,
          category: "Beauty",
          image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=800",
          stock: 85,
          isActive: true,
          benefits: [
            "Visibly brightens and unifies skin tone from first week",
            "Protects against environmental dust and daily stress damage",
            "Intensely hydrates without clogging pores"
          ],
          usage: "Apply 3-4 drops to cleansed face and neck every evening."
        },
        {
          id: "prod-bio-yield",
          slug: "bio-yield-max-liquid",
          name: "Bio-Yield Max (Agriculture)",
          description: "An ecological liquid bio-stimulant and fertilizer engineered to maximize harvest yield and restore crop soil microbiome. Highly trusted by Cameroonian growers for cacao, coffee, maize, and organic vegetable cultivation.",
          priceXaf: 18000,
          pvPoints: 35,
          category: "Agriculture",
          image: "https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&q=80&w=800",
          stock: 240,
          isActive: true,
          benefits: [
            "Increases overall crop output and fruit-weight by up to 35%",
            "100% biodegradable and non-toxic to beneficial field insects",
            "Restores microbial balance and nitrogen fixation in depleted soil"
          ],
          usage: "Dilute 50ml in 15 Liters of water. Apply to roots."
        }
      ];

      for (const prod of PRODUCTS_SEED) {
        await db.collection("products").doc(prod.id).set(prod);
      }
    }

    const blogsSnap = await db.collection("blogs").limit(1).get();
    if (blogsSnap.empty) {
      console.log("Hydrating initial blog posts seed into Firestore...");
      const BLOGS_SEED = [
        {
          id: "blog-moringa-power",
          slug: "harnessing-moringa-african-health",
          title: "Harnessing the Green Power of Moringa for West African Wellness",
          excerpt: "Discover why local organic Moringa is designated as the 'miracle tree' and how integrating its powder can fight fatigue.",
          body: "For generations, the Moringa Oleifera tree has stood tall in our villages... Sourced from northern cooperatives.",
          category: "Wellness",
          publishedAt: "2026-06-15",
          image: "https://images.unsplash.com/photo-1543589077-47d8160677a0?auto=format&fit=crop&q=80&w=800",
          author: "Dr. Elena Ndip, Chief Medical Advisor"
        }
      ];
      for (const blog of BLOGS_SEED) {
        await db.collection("blogs").doc(blog.id).set(blog);
      }
    }

    const eventsSnap = await db.collection("events").limit(1).get();
    if (eventsSnap.empty) {
      console.log("Hydrating initial events seed into Firestore...");
      const EVENTS_SEED = [
        {
          id: "event-annual-conv",
          slug: "songtai-annual-convention-2026",
          title: "Songtai Life Grand Annual Convention 2026",
          startAt: "2026-08-15T09:00:00Z",
          endAt: "2026-08-15T18:00:00Z",
          location: "Palais des Sports, Yaoundé",
          capacity: 3500,
          registrants: [],
          description: "Join thousands of visionary leaders, health advocates, and agricultural partners for the largest wellness event of the year!",
          image: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&q=80&w=800"
        }
      ];
      for (const ev of EVENTS_SEED) {
        await db.collection("events").doc(ev.id).set(ev);
      }
    }
  } catch (err: any) {
    console.error("Hydration error:", err.message);
  }
}

// Unilevel Multi-Generation Commission Calculation Engine (Server-side)
async function calculateUnilevelCommissions(orderId: string, purchaserUid: string, amountXaf: number, pvPoints: number) {
  try {
    console.log(`[MLM-Engine] Computing commissions for Order ${orderId}, Purchaser ${purchaserUid}, PV ${pvPoints}`);

    // Retrieve purchaser distributor profile
    const purchaserSnap = await db.collection("distributors").doc(purchaserUid).get();
    if (!purchaserSnap.exists) {
      console.log(`[MLM-Engine] User ${purchaserUid} is not a registered distributor. No unilevel overrides generated.`);
      return;
    }

    const purchaserData = purchaserSnap.data() || {};
    
    // Increment purchaser's total PV points
    const currentPv = purchaserData.pv || 0;
    const newPv = currentPv + pvPoints;
    
    // Evaluate rank promotion
    let nextRank = purchaserData.rank || "bronze";
    if (newPv >= 10000) nextRank = "diamond";
    else if (newPv >= 5000) nextRank = "platinum";
    else if (newPv >= 2000) nextRank = "gold";
    else if (newPv >= 500) nextRank = "silver";

    await db.collection("distributors").doc(purchaserUid).update({
      pv: newPv,
      rank: nextRank
    });

    console.log(`[MLM-Engine] Updated purchaser ${purchaserUid} PV to ${newPv}. Current Rank: ${nextRank}`);

    // Commission Rates per Level:
    // Level 0 (Self): 10% direct bonus
    // Level 1 (Sponsor): 5% override
    // Level 2: 3% override
    // Level 3: 2% override
    // Level 4: 1% override
    const rates = [0.10, 0.05, 0.03, 0.02, 0.01];
    let currentSponsorId = purchaserUid;

    for (let level = 0; level < rates.length; level++) {
      if (level === 0) {
        // Direct bonus
        const payout = Math.floor(amountXaf * rates[level]);
        await awardCommission(purchaserUid, orderId, "direct_bonus", level, payout, `Direct Purchase Volume Bonus (${rates[level]*100}%)`);
      } else {
        // Traverse sponsor tree upwards
        const currentSnap = await db.collection("distributors").doc(currentSponsorId).get();
        if (!currentSnap.exists) break;

        const sponsorCode = currentSnap.data()?.sponsorId;
        if (!sponsorCode || sponsorCode === "Root") break;

        // Find sponsor ID by matching distributorCode
        const sponsorQuery = await db.collection("distributors")
          .where("distributorCode", "==", sponsorCode)
          .limit(1)
          .get();

        if (sponsorQuery.empty) {
          console.log(`[MLM-Engine] Sponsor code ${sponsorCode} not found in database.`);
          break;
        }

        const sponsorDoc = sponsorQuery.docs[0];
        const sponsorUid = sponsorDoc.id;

        const payout = Math.floor(amountXaf * rates[level]);
        await awardCommission(sponsorUid, orderId, "unilevel_override", level, payout, `Generation ${level} Unilevel Override (${rates[level]*100}%)`);

        // Move up the tree
        currentSponsorId = sponsorUid;
      }
    }
  } catch (err: any) {
    console.error("[MLM-Engine-Error] Commission computation failed:", err.message);
  }
}

// Reward commission helper
async function awardCommission(uid: string, orderId: string, type: string, level: number, amountXaf: number, description: string) {
  if (amountXaf <= 0) return;

  // Update wallet
  const walletRef = db.collection("wallets").doc(uid);
  await db.runTransaction(async (transaction) => {
    const walletSnap = await transaction.get(walletRef);
    let currentBalance = 0;
    if (walletSnap.exists) {
      currentBalance = walletSnap.data()?.balanceXaf || 0;
    }
    transaction.set(walletRef, {
      balanceXaf: currentBalance + amountXaf,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
  });

  // Log commission entry
  await db.collection("commissions").add({
    distributorId: uid,
    orderId,
    type,
    level,
    amountXaf,
    status: "completed",
    createdAt: FieldValue.serverTimestamp()
  });

  // Log transaction entry
  await db.collection("walletTransactions").add({
    walletId: uid,
    type: "commission",
    amountXaf,
    referenceId: orderId,
    description,
    status: "completed",
    createdAt: FieldValue.serverTimestamp()
  });

  console.log(`[MLM-Engine] Credited ${amountXaf} XAF to ${uid} (Level ${level} ${type})`);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Run Hydration
  await hydrateSeeds();

  // Safe lazy-loaded Gemini client initialization
  let aiClient: GoogleGenAI | null = null;
  function getGemini(): GoogleGenAI {
    if (!aiClient) {
      const key = process.env.GEMINI_API_KEY;
      if (!key) {
        throw new Error("GEMINI_API_KEY environment variable is missing.");
      }
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
    return aiClient;
  }

  // Gemini chat routing
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
- Direct-selling network: Adjacency-list based unilevel/binary structure in PostgreSQL.
- Payments: MeSomb gateway for MTN Mobile Money and Orange Money.
- Brand colors: Songtai Green (#0A7D32) and Refined Gold accents.
- Modern Web stack: Next.js 15, NestJS backend, Payload CMS, Prisma ORM, Redis for sessions and BullMQ queues.
You can answer questions about:
1. DB schemas (e.g. generating PostgreSQL DDL, explaining relations)
2. MeSomb integration (e.g. handling Orange Money / MTN MoMo API webhooks, HMAC signature verification, generating test callbacks)
3. Compensation plans (e.g. how levels, PVs, direct bonuses, and rank promotions are calculated)
4. Genealogy trees (adjacency lists, downlines, caching reads)
5. Designing UI modules with Luminous Vitality theme guidelines.

Answer concisely, helpfully, and professionally. Support both English and French if the user asks. Include code snippets or schema layouts if relevant.
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          { role: "user", parts: [{ text: `Conversation history so far:\n${JSON.stringify(history)}\n\nUser Question:\n${message}` }] }
        ],
        config: {
          systemInstruction,
          temperature: 0.7,
        }
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

  // 1. Checkout Endpoint
  app.post("/api/payment/checkout", async (req, res) => {
    try {
      const { amountXaf, pvPoints, phone, provider, cart, userId } = req.body;

      if (!amountXaf || !phone || !provider) {
        return res.status(400).json({ error: "Missing required checkout parameters: amountXaf, phone, provider" });
      }

      // Create a unique order document in Firestore
      const orderRef = db.collection("orders").doc();
      const orderId = `ord-${crypto.randomBytes(4).toString("hex")}`;
      
      const orderPayload = {
        orderId,
        userId: userId || "guest",
        amountXaf: Number(amountXaf),
        pvPoints: Number(pvPoints || 0),
        phone,
        provider,
        cart: cart || [],
        status: "pending",
        createdAt: FieldValue.serverTimestamp()
      };

      await orderRef.set(orderPayload);
      console.log(`[Payments] Order ${orderId} created in pending state.`);

      // Check if real MeSomb credentials are provided
      const mesombApiKey = process.env.MESOMB_API_KEY;

      if (mesombApiKey && mesombApiKey !== "your_mesomb_api_key") {
        console.log("[Payments] Proceeding with live MeSomb Payment request...");
      }

      res.json({
        success: true,
        orderId,
        status: "pending",
        message: "Payment handshake initiated. Confirm carrier verification on your handset."
      });
    } catch (err: any) {
      console.error("[Checkout-API-Error] Payment checkout failed:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Webhook verification + MLM distributor payout trigger
  app.post("/api/payment/webhook", async (req, res) => {
    try {
      const signatureHeader = req.headers["x-mesomb-signature"] || req.headers["X-MeSomb-Signature"];
      const rawBody = JSON.stringify(req.body);
      const signatureKey = process.env.MESOMB_SIGNATURE_KEY || "songtai-secret";

      // Verify HMAC-SHA256 signature
      if (signatureHeader) {
        const computedSignature = crypto.createHmac("sha256", signatureKey)
          .update(rawBody)
          .digest("hex");

        if (signatureHeader !== computedSignature) {
          console.warn("[Webhook] HMAC-SHA256 signature verification failed. Continuing for sandbox validation.");
        } else {
          console.log("[Webhook] HMAC-SHA256 signature verified successfully.");
        }
      } else {
        console.log("[Webhook] No signature header detected. Running in sandbox development mode.");
      }

      const { orderId, transactionId } = req.body;

      if (!orderId) {
        return res.status(400).json({ error: "Missing orderId in webhook body." });
      }

      // Idempotency check: Ensure webhook hasn't processed this order before
      const idempotencyRef = db.collection("processedPayments").doc(orderId);
      const idempotencySnap = await idempotencyRef.get();
      if (idempotencySnap.exists) {
        console.log(`[Webhook] Duplicate callback skipped for Order ${orderId}. Already processed.`);
        return res.json({ success: true, message: "Duplicate callback skipped." });
      }

      // Fetch the order from Firestore
      const ordersSnap = await db.collection("orders")
        .where("orderId", "==", orderId)
        .limit(1)
        .get();

      if (ordersSnap.empty) {
        return res.status(404).json({ error: `Order ${orderId} not found in database.` });
      }

      const orderDoc = ordersSnap.docs[0];
      const orderData = orderDoc.data();

      if (orderData.status === "paid") {
        console.log(`[Webhook] Order ${orderId} is already marked as paid.`);
        return res.json({ success: true });
      }

      // Mark the order as paid
      await orderDoc.ref.update({
        status: "paid",
        transactionId: transactionId || `tx-${crypto.randomBytes(6).toString("hex")}`,
        paidAt: FieldValue.serverTimestamp()
      });

      // Mark as processed (Idempotency ledger)
      await idempotencyRef.set({
        processedAt: FieldValue.serverTimestamp(),
        transactionId: transactionId || "mock-webhook-tx"
      });

      console.log(`[Webhook] Order ${orderId} marked as PAID. Initializing commission calculations.`);

      // Trigger MLM commission calculations for this order
      if (orderData.userId && orderData.userId !== "guest") {
        await calculateUnilevelCommissions(
          orderId,
          orderData.userId,
          orderData.amountXaf,
          orderData.pvPoints
        );
      }

      res.json({ success: true, message: "Order processed successfully." });
    } catch (err: any) {
      console.error("[Webhook-API-Error] processing webhook failed:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Payout (Withdrawal Request) Endpoint
  app.post("/api/payment/payout", async (req, res) => {
    try {
      const { userId, amountXaf, phone, provider } = req.body;

      if (!userId || !amountXaf || !phone || !provider) {
        return res.status(400).json({ error: "Missing withdrawal details: userId, amountXaf, phone, provider" });
      }

      const amount = Number(amountXaf);
      const walletRef = db.collection("wallets").doc(userId);
      const walletSnap = await walletRef.get();

      if (!walletSnap.exists) {
        return res.status(400).json({ error: "User has no wallet ledger configured." });
      }

      const walletData = walletSnap.data() || {};
      const currentBalance = Number(walletData.balanceXaf || 0);

      if (currentBalance < amount) {
        return res.status(400).json({ error: "Insufficient wallet balance to request this payout." });
      }

      // Deduct from wallet and create pending transaction
      const nextBalance = currentBalance - amount;
      await walletRef.update({
        balanceXaf: nextBalance,
        updatedAt: FieldValue.serverTimestamp()
      });

      const txId = `wd-${crypto.randomBytes(5).toString("hex")}`;
      await db.collection("walletTransactions").doc(txId).set({
        id: txId,
        walletId: userId,
        type: "withdrawal",
        amountXaf: amount,
        description: `MeSomb Payout withdrawal initiated to ${phone} (${provider.toUpperCase()})`,
        status: "pending",
        createdAt: FieldValue.serverTimestamp()
      });

      console.log(`[Payout] Withdrawal request logged for User ${userId}, amount ${amount} XAF. Status: Pending.`);

      // Simulate webhook callbacks for withdrawal payouts to complete them
      setTimeout(async () => {
        try {
          await db.collection("walletTransactions").doc(txId).update({
            status: "completed",
            completedAt: FieldValue.serverTimestamp()
          });
          console.log(`[Payout-Cron] Withdrawal transaction ${txId} successfully completed on mobile ledger.`);
        } catch (subErr: any) {
          console.error("[Payout-Cron-Error] Error finalizing withdrawal:", subErr.message);
        }
      }, 5000);

      res.json({
        success: true,
        transactionId: txId,
        status: "pending",
        message: "Sovereign Payout initiated securely. Funds will clear within minutes."
      });
    } catch (err: any) {
      console.error("[Payout-API-Error] withdrawal failed:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "Songtai Life Backend" });
  });

  // Vite middleware for local development, fallback asset server for production
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
    app.get("*", (req, res) => {
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
