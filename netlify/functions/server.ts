// ── Netlify serverless function — Express adapter ────────────────────────────
//
// This file wraps the Express app in `serverless-http` so it runs as a
// Netlify Function. All request routing stays inside the Express app; this
// file only bridges Netlify's event/context format to Node.js req/res.
//
// Route configuration (netlify.toml `[[redirects]]`) ensures:
//  • /api/*      → this function
//  • /sitemap.xml, /robots.txt → this function
//  • everything else → static dist/ with SPA fallback to index.html
//
// Netlify automatically sets process.env.NETLIFY=true, which prevents
// server.ts from calling app.listen() — no extra configuration needed.

import serverless from "serverless-http";
import { app, serverReady } from "../../server";

// Cache the serverless-http handler across invocations in the same Lambda
// container so the Express startup cost (middleware wiring, DB init, etc.)
// is paid only once per cold start, not on every request.
let _handler: ReturnType<typeof serverless> | undefined;

async function getHandler(): Promise<ReturnType<typeof serverless>> {
  if (!_handler) {
    // Wait for startServer() to finish registering all routes and middleware.
    await serverReady;
    _handler = serverless(app);
  }
  return _handler;
}

// Netlify Functions v1 export — works with `serverless-http`.
export const handler = async (event: any, context: any) => {
  const h = await getHandler();
  return h(event, context);
};
