#!/usr/bin/env node
/**
 * Songtai Life — Admin Seed Script
 * ─────────────────────────────────
 * Run once after deploying to Supabase to:
 *   1. Create the superadmin account
 *   2. Create storage buckets (media, documents, testimonials)
 *   3. Verify site_settings defaults are present
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   ADMIN_EMAIL=admin@yoursite.com ADMIN_PASSWORD=ChangeMe123! \
 *   node scripts/seed-admin.mjs
 *
 * Or copy the values into a .env file and run:
 *   node --env-file=.env scripts/seed-admin.mjs
 */

import { createClient } from "@supabase/supabase-js";

// ── 0. Config ────────────────────────────────────────────────────────────────
const SUPABASE_URL             = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAIL              = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD           = process.env.ADMIN_PASSWORD;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌  Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.");
  process.exit(1);
}
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error("❌  Missing ADMIN_EMAIL or ADMIN_PASSWORD env vars.");
  console.error("    Set them before running: ADMIN_EMAIL=... ADMIN_PASSWORD=...");
  process.exit(1);
}
if (ADMIN_PASSWORD.length < 8) {
  console.error("❌  ADMIN_PASSWORD must be at least 8 characters.");
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── helpers ──────────────────────────────────────────────────────────────────
function ok(msg)   { console.log(`  ✅  ${msg}`); }
function info(msg) { console.log(`  ℹ️   ${msg}`); }
function warn(msg) { console.log(`  ⚠️   ${msg}`); }
function fail(msg) { console.error(`  ❌  ${msg}`); }

function hr(title) {
  const line = "─".repeat(55);
  console.log(`\n${line}`);
  if (title) console.log(`  ${title}`);
  console.log(line);
}

// ── 1. Superadmin account ────────────────────────────────────────────────────
async function seedAdmin() {
  hr("STEP 1 — Superadmin account");

  // Check if one already exists
  const { data: existing, error: checkErr } = await db
    .from("profiles")
    .select("id, email")
    .eq("role", "superadmin")
    .limit(1);

  if (checkErr) { fail(`Cannot read profiles: ${checkErr.message}`); return false; }

  if (existing && existing.length > 0) {
    warn(`Superadmin already exists (${existing[0].email}). Skipping creation.`);
    info("If you need to reset it, delete the user from Supabase Auth → Users first.");
    return true;
  }

  // Create auth user
  const { data: authData, error: authErr } = await db.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
  });
  if (authErr) { fail(`Could not create auth user: ${authErr.message}`); return false; }

  const uid = authData.user.id;

  // Insert profile with superadmin role
  const { error: profileErr } = await db.from("profiles").upsert({
    id:                   uid,
    email:                ADMIN_EMAIL,
    role:                 "superadmin",
    locale:               "en",
    must_change_password: true,
  });
  if (profileErr) { fail(`Could not write profile: ${profileErr.message}`); return false; }

  ok(`Superadmin created: ${ADMIN_EMAIL} (uid: ${uid})`);
  warn("must_change_password = true — change password on first login.");
  return true;
}

// ── 2. Storage buckets ───────────────────────────────────────────────────────
const BUCKETS = [
  { id: "media",        public: true,  fileSizeLimit: 10 * 1024 * 1024,  allowedMimeTypes: ["image/*", "video/*"] },
  { id: "documents",    public: true,  fileSizeLimit: 20 * 1024 * 1024,  allowedMimeTypes: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"] },
  { id: "testimonials", public: true,  fileSizeLimit: 5  * 1024 * 1024,  allowedMimeTypes: ["image/*"] },
];

async function seedBuckets() {
  hr("STEP 2 — Storage buckets");

  const { data: existingBuckets, error: listErr } = await db.storage.listBuckets();
  if (listErr) { fail(`Cannot list buckets: ${listErr.message}`); return false; }

  const existingIds = new Set((existingBuckets ?? []).map((b) => b.id));

  for (const bucket of BUCKETS) {
    if (existingIds.has(bucket.id)) {
      info(`Bucket "${bucket.id}" already exists — skipping.`);
      continue;
    }

    const { error: createErr } = await db.storage.createBucket(bucket.id, {
      public:             bucket.public,
      fileSizeLimit:      bucket.fileSizeLimit,
      allowedMimeTypes:   bucket.allowedMimeTypes,
    });

    if (createErr) {
      fail(`Could not create bucket "${bucket.id}": ${createErr.message}`);
    } else {
      ok(`Bucket "${bucket.id}" created (public=${bucket.public}, max ${bucket.fileSizeLimit / 1024 / 1024}MB)`);
    }
  }
  return true;
}

// ── 3. Site settings defaults ────────────────────────────────────────────────
const SETTINGS_DEFAULTS = [
  { key: "whatsapp",    value: { number: "", default_message: "Hi Songtai Life, I would like to know more!", enabled: false } },
  { key: "analytics",  value: { gtm_id: "", ga4_id: "", enabled: false } },
  { key: "socials",    value: { facebook: "", instagram: "", tiktok: "", whatsapp: "", youtube: "", linkedin: "" } },
  { key: "seo_defaults", value: { site_title: "Songtai Life", meta_description: "Health. Opportunity. Prosperity. Premium natural products from West African botanical heritage.", og_image_url: "" } },
];

async function seedSettings() {
  hr("STEP 3 — Site settings defaults");

  const { data: existing, error: listErr } = await db.from("site_settings").select("key");
  if (listErr) { fail(`Cannot read site_settings: ${listErr.message}`); return false; }

  const existingKeys = new Set((existing ?? []).map((r) => r.key));

  for (const setting of SETTINGS_DEFAULTS) {
    if (existingKeys.has(setting.key)) {
      info(`site_settings["${setting.key}"] already set — skipping.`);
      continue;
    }
    const { error } = await db.from("site_settings").insert({ key: setting.key, value: setting.value });
    if (error) {
      fail(`Could not insert "${setting.key}": ${error.message}`);
    } else {
      ok(`site_settings["${setting.key}"] seeded.`);
    }
  }
  return true;
}

// ── 4. Summary & next steps ──────────────────────────────────────────────────
function printSummary() {
  hr("DONE — What to do next");
  console.log(`
  1. LOG IN
     Go to your site's /login page and sign in with:
       Email:    ${ADMIN_EMAIL}
       Password: (the one you set in ADMIN_PASSWORD)

  2. CHANGE YOUR PASSWORD
     The account has must_change_password = true.
     Go to Admin → Account Settings and update it immediately.

  3. CONFIGURE SITE SETTINGS  (Admin → Settings)
     • SEO defaults  — site title, meta description, OG image
     • Socials       — Facebook, Instagram, TikTok, YouTube, WhatsApp
     • WhatsApp CTA  — phone number & default message
     • Analytics     — GTM ID or GA4 measurement ID

  4. ADD PRODUCTS  (Admin → Products → New Product)
     • Name (EN + FR), description, price in XAF, PV points
     • Upload images to the "media" storage bucket

  5. STORAGE BUCKETS  (Supabase Dashboard → Storage)
     Three buckets were created:
       • media        — images & videos uploaded by admin (10 MB max)
       • documents    — PDFs, Word files (20 MB max)
       • testimonials — customer photo uploads (5 MB max)
     
     ⚠️  Row-Level Security policies for these buckets are in:
         supabase/migrations/0006_site_settings_appointments.sql
     Apply that migration in the Supabase Dashboard → SQL Editor
     if you haven't already.

  6. HERO CAROUSEL  (Admin → Hero Carousel)
     Replace the default Unsplash images with your own.
     Upload to the "media" bucket and paste the public URL.

  7. OPTIONAL — disable the bootstrap endpoint
     Once your superadmin is set, you can unset the
     ADMIN_BOOTSTRAP_KEY environment variable or remove
     the /api/admin/bootstrap route from server.ts to harden
     the production server.
`);
}

// ── main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║       Songtai Life — Admin Seed Script               ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log(`  Target: ${SUPABASE_URL}`);

  const steps = [seedAdmin, seedBuckets, seedSettings];
  for (const step of steps) {
    try {
      await step();
    } catch (err) {
      fail(`Unexpected error: ${err.message}`);
    }
  }

  printSummary();
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
