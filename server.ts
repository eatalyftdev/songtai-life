import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { eq } from "drizzle-orm";
import { setupAuth, registerAuthRoutes } from "./server/replit_integrations/auth/index";
import { registerAppRoutes } from "./server/appRoutes";
import { db } from "./server/db";
import { productCategories, products, blogCategories, blogPosts, events, siteSettings } from "./shared/models/app";

dotenv.config();

// Pre-hydrate collections with seeds on startup if they are empty
async function hydrateSeeds() {
  try {
    const existingProducts = await db.select().from(products).limit(1);
    if (existingProducts.length === 0) {
      console.log("Hydrating initial products seed...");
      const cats = await db.select().from(productCategories);
      const catMap: Record<string, string> = {};
      cats.forEach((c) => { catMap[c.slug] = c.id; });

      await db.insert(products).values([
        {
          slug: "cellular-vitality-pro",
          nameEn: "Cellular Vitality Pro",
          nameFr: "Vitalité Cellulaire Pro",
          descriptionEn: "Premium wellness capsule formulated with advanced antioxidants, organic African moringa extracts, and active micro-nutrients.",
          descriptionFr: "Capsule de bien-être premium formulée avec des antioxydants avancés, des extraits de moringa africain bio et des micro-nutriments actifs.",
          priceXaf: 32000,
          pvPoints: 60,
          categoryId: catMap["health"] ?? null,
          images: ["https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&q=80&w=800"],
          isActive: true,
        },
        {
          slug: "luminous-gold-serum",
          nameEn: "Luminous Gold Elixir",
          nameFr: "Élixir Or Lumineux",
          descriptionEn: "An ultra-premium revitalizing face serum powered by pure rosehip extract, cold-pressed argan oils, and light-reflecting natural minerals.",
          descriptionFr: "Un sérum visage ultra-premium revitalisant à base d'extrait pur de rose musquée, d'huiles d'argan pressées à froid et de minéraux naturels réfléchissants.",
          priceXaf: 28500,
          pvPoints: 50,
          categoryId: catMap["beauty"] ?? null,
          images: ["https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=800"],
          isActive: true,
        },
        {
          slug: "bio-yield-max-liquid",
          nameEn: "Bio-Yield Max (Agriculture)",
          nameFr: "Bio-Rendement Max (Agriculture)",
          descriptionEn: "An ecological liquid bio-stimulant and fertilizer engineered to maximize harvest yield and restore crop soil microbiome.",
          descriptionFr: "Un bio-stimulant liquide écologique et engrais conçu pour maximiser le rendement des récoltes et restaurer le microbiome du sol.",
          priceXaf: 18000,
          pvPoints: 35,
          categoryId: catMap["agriculture"] ?? null,
          images: ["https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&q=80&w=800"],
          isActive: true,
        },
      ]);
    }

    const existingBlogs = await db.select().from(blogPosts).limit(1);
    if (existingBlogs.length === 0) {
      console.log("Hydrating initial blog posts seed...");
      await db.insert(blogPosts).values([
        {
          slug: "harnessing-moringa-african-health",
          title: "Harnessing the Green Power of Moringa for West African Wellness",
          body: "For generations, the Moringa Oleifera tree has stood tall in our villages. Sourced from northern cooperatives, our formulations honor this heritage while applying modern extraction science.",
          status: "published",
        },
      ]);
    }

    const existingEvents = await db.select().from(events).limit(1);
    if (existingEvents.length === 0) {
      console.log("Hydrating initial events seed...");
      await db.insert(events).values([
        {
          slug: "songtai-annual-convention-2026",
          title: "Songtai Life Grand Annual Convention 2026",
          startAt: new Date("2026-08-15T09:00:00Z"),
          endAt: new Date("2026-08-15T18:00:00Z"),
          location: "Palais des Sports, Yaoundé",
          capacity: 3500,
        },
      ]);
    }

    // Seed default site_settings (safe on every boot)
    for (const [key, value] of [
      ["contact", { phone: "", email: "", address_en: "", address_fr: "", map_url: "" }],
      ["branding", { logo_url: "", logo_dark_url: "", favicon_url: "" }],
    ] as const) {
      const [existing] = await db.select().from(siteSettings).where(eq(siteSettings.key, key));
      if (!existing) {
        await db.insert(siteSettings).values({ key, value }).onConflictDoNothing();
      }
    }
  } catch (err: any) {
    console.error("Hydration error:", err.message);
  }
}

// ── Module-level app + PORT ───────────────────────────────────────────────────
const app = express();
const _parsedPort = parseInt(process.env.PORT ?? "");
const PORT = Number.isInteger(_parsedPort) && _parsedPort > 0 && _parsedPort <= 65535 ? _parsedPort : 5000;

async function startServer() {
  const isDev = process.env.NODE_ENV !== "production";

  const ContentSecurityPolicy = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://www.googletagmanager.com https://www.google-analytics.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    `connect-src 'self'${isDev ? " ws:" : ""} https://www.google-analytics.com https://www.googletagmanager.com`,
    "frame-src 'self' https://www.googletagmanager.com https://www.youtube-nocookie.com https://www.youtube.com https://player.vimeo.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");

  app.disable("x-powered-by");

  app.use((_req, res, next) => {
    res.setHeader("Content-Security-Policy", ContentSecurityPolicy);
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(self), interest-cohort=()");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Resource-Policy", "same-site");
    next();
  });

  // Capture raw body for MeSomb webhook HMAC verification BEFORE json parsing.
  // Skip for media uploads (base64 payloads can be large; no signature needed there).
  app.use(express.json({
    limit: "15mb",
    verify: (req: any, _res, buf) => { req.rawBody = buf.toString("utf8"); },
  }));

  // Setup Replit Auth (session + OIDC) BEFORE other routes
  await setupAuth(app);
  registerAuthRoutes(app);
  registerAppRoutes(app);

  await hydrateSeeds();

  // ── Gemini chat assistant ────────────────────────────────────────────────
  let aiClient: GoogleGenAI | null = null;
  function getGemini(): GoogleGenAI {
    if (!aiClient) {
      const key = process.env.GEMINI_API_KEY;
      if (!key) throw new Error("GEMINI_API_KEY environment variable is missing.");
      aiClient = new GoogleGenAI({ apiKey: key, httpOptions: { headers: { "User-Agent": "aistudio-build" } } });
    }
    return aiClient;
  }

  app.post("/api/gemini/chat", async (req, res) => {
    try {
      const { message, history } = req.body;
      const ai = getGemini();
      const systemInstruction = `
You are the "Songtai Life AI Architect", a world-class system designer, core developer, and compensation plan advisor for the Songtai Life MLM platform.
Key details of Songtai Life:
- Target market: Cameroon, high-end consumer audience in West Africa.
- Currency: CFA Franc (XAF), no decimals.
- Direct-selling network: Adjacency-list based unilevel structure in PostgreSQL.
- Payments: MeSomb gateway for MTN Mobile Money and Orange Money.
- Brand colors: Songtai Green (#0A7D32) and Refined Gold accents.
- Stack: React + Vite frontend, Express backend, Replit PostgreSQL, Replit Auth.
Answer concisely, helpfully, and professionally. Support both English and French if the user asks.
`;
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [{ role: "user", parts: [{ text: `Conversation history so far:\n${JSON.stringify(history)}\n\nUser Question:\n${message}` }] }],
        config: { systemInstruction, temperature: 0.7 },
      });
      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini Endpoint Error:", error.message);
      res.json({ error: "Gemini API key is not configured or rate-limited. Falling back." });
    }
  });

  // ── Health check ─────────────────────────────────────────────────────────
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "Songtai Life Backend" });
  });

  // ── robots.txt ────────────────────────────────────────────────────────────
  app.get("/robots.txt", (_req, res) => {
    const base = process.env.SITE_URL ?? "https://songtailife.cm";
    res.type("text/plain").send(
      ["User-agent: *", "Allow: /", "Disallow: /admin", "Disallow: /distributor", "Disallow: /api", "", `Sitemap: ${base}/sitemap.xml`].join("\n")
    );
  });

  // ── sitemap.xml ───────────────────────────────────────────────────────────
  app.get("/sitemap.xml", async (_req, res) => {
    const base = process.env.SITE_URL ?? "https://songtailife.cm";
    const now = new Date().toISOString();
    try {
      const [productRows, postRows, eventRows] = await Promise.all([
        db.select().from(products),
        db.select().from(blogPosts),
        db.select().from(events),
      ]);

      const staticUrls = [
        { loc: base, priority: "1.0", changefreq: "weekly" },
        { loc: `${base}/?section=about`, priority: "0.7", changefreq: "monthly" },
        { loc: `${base}/?section=products`, priority: "0.9", changefreq: "weekly" },
        { loc: `${base}/?section=events`, priority: "0.8", changefreq: "weekly" },
        { loc: `${base}/?section=blog`, priority: "0.8", changefreq: "weekly" },
        { loc: `${base}/?section=gallery`, priority: "0.6", changefreq: "monthly" },
        { loc: `${base}/?section=opportunity`, priority: "0.8", changefreq: "monthly" },
        { loc: `${base}/?section=faq`, priority: "0.7", changefreq: "monthly" },
        { loc: `${base}/?section=contact`, priority: "0.6", changefreq: "yearly" },
        { loc: `${base}/?section=media`, priority: "0.6", changefreq: "monthly" },
      ];

      const productUrls = productRows.filter(p => p.isActive).map(p => ({ loc: `${base}/?section=products&slug=${p.slug}`, lastmod: now, priority: "0.7", changefreq: "weekly" }));
      const postUrls = postRows.filter(p => p.status === "published").map(p => ({ loc: `${base}/?section=blog&slug=${p.slug}`, lastmod: p.publishedAt ? new Date(p.publishedAt).toISOString() : now, priority: "0.6", changefreq: "monthly" }));
      const eventUrls = eventRows.map(e => ({ loc: `${base}/?section=events&slug=${e.slug}`, lastmod: new Date(e.startAt).toISOString(), priority: "0.6", changefreq: "weekly" }));

      const allUrls = [...staticUrls.map(u => ({ ...u, lastmod: now })), ...productUrls, ...postUrls, ...eventUrls];

      const xml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
        ...allUrls.map(u => [
          "  <url>", `    <loc>${u.loc}</loc>`, `    <lastmod>${u.lastmod}</lastmod>`,
          `    <changefreq>${u.changefreq}</changefreq>`, `    <priority>${u.priority}</priority>`,
          "  </url>",
        ].join("\n")),
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
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => { res.sendFile(path.join(distPath, "index.html")); });
  }
}

const serverReady = startServer().catch((err) => {
  console.error("Critical error during server initialization:", err);
  process.exit(1);
});

export default async function handler(req: any, res: any) {
  await serverReady;
  return (app as any)(req, res);
}

if (!process.env.VERCEL) {
  serverReady.then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server listening on host 0.0.0.0, port ${PORT}`);
    });
  });
}
