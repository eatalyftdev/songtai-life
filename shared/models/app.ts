import { sql } from "drizzle-orm";
import {
  pgTable,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  uuid,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./auth";

// ── Product Categories ──────────────────────────────────────────────
export const productCategories = pgTable("product_categories", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name"),
  nameFr: text("name_fr"),
  slug: text("slug").notNull().unique(),
  displayOrder: integer("display_order").default(0),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").default(true),
});

// ── Products ─────────────────────────────────────────────────────────
export const products = pgTable("products", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(),
  nameEn: text("name_en"),
  nameFr: text("name_fr"),
  descriptionEn: text("description_en"),
  descriptionFr: text("description_fr"),
  priceXaf: integer("price_xaf").notNull(),
  strikePriceXaf: integer("strike_price_xaf"),
  pvPoints: integer("pv_points").default(0),
  categoryId: uuid("category_id").references(() => productCategories.id),
  category: text("category"),
  images: text("images").array().default(sql`'{}'::text[]`),
  stock: integer("stock").default(0),
  isActive: boolean("is_active").default(true),
  isFeatured: boolean("is_featured").default(false),
  featuredOrder: integer("featured_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Blog Categories / Posts ─────────────────────────────────────────
export const blogCategories = pgTable("blog_categories", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
});

export const blogPosts = pgTable("blog_posts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  titleFr: text("title_fr"),
  body: text("body").notNull(),
  excerpt: text("excerpt"),
  author: text("author"),
  image: text("image"),
  category: text("category"),
  categoryId: uuid("category_id").references(() => blogCategories.id),
  status: text("status").default("draft"),
  publishedAt: timestamp("published_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Events ───────────────────────────────────────────────────────────
export const events = pgTable("events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  startAt: timestamp("start_at").notNull(),
  endAt: timestamp("end_at"),
  location: text("location"),
  capacity: integer("capacity"),
  description: text("description"),
  image: text("image"),
  registrants: text("registrants").array().default(sql`'{}'::text[]`),
});

// ── Gallery ──────────────────────────────────────────────────────────
export const galleryAlbums = pgTable("gallery_albums", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  nameEn: text("name_en").notNull(),
  nameFr: text("name_fr"),
  displayOrder: integer("display_order").default(0),
});

export const galleryImages = pgTable("gallery_images", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  url: text("url").notNull(),
  album: text("album"),
  caption: text("caption"),
  captionEn: text("caption_en"),
  captionFr: text("caption_fr"),
  albumId: uuid("album_id").references(() => galleryAlbums.id, { onDelete: "set null" }),
  displayOrder: integer("display_order").default(0),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  fileSizeBytes: integer("file_size_bytes"),
  mimeType: text("mime_type"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Testimonials ─────────────────────────────────────────────────────
export const testimonials = pgTable("testimonials", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  rank: text("rank"),
  region: text("region"),
  quote: text("quote").notNull(),
  quoteFr: text("quote_fr"),
  videoUrl: text("video_url"),
  image: text("image"),
  isFeatured: boolean("is_featured").default(false),
  displayOrder: integer("display_order").default(0),
});

// ── Contact / Newsletter ─────────────────────────────────────────────
export const contactMessages = pgTable("contact_messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  subject: text("subject"),
  message: text("message").notNull(),
  spamFlagged: boolean("spam_flagged").default(false),
  status: text("status").default("unread"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  locale: text("locale").default("fr"),
  confirmed: boolean("confirmed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Profiles (app-level, keyed by Replit Auth users.id) ──────────────
export const profiles = pgTable("profiles", {
  id: varchar("id").primaryKey(),
  email: text("email").notNull(),
  phone: text("phone"),
  role: text("role").notNull().default("customer"),
  locale: text("locale").default("fr"),
  privacyAcceptedAt: timestamp("privacy_accepted_at"),
  privacyAcceptedVersion: text("privacy_accepted_version"),
  mustChangePassword: boolean("must_change_password").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Distributors / Wallets / MLM ─────────────────────────────────────
export const distributors = pgTable("distributors", {
  id: varchar("id").primaryKey(),
  distributorCode: text("distributor_code").notNull().unique(),
  sponsorId: text("sponsor_id"),
  placementId: text("placement_id"),
  rank: text("rank").default("bronze"),
  kycStatus: text("kyc_status").default("none"),
  pv: integer("pv").default(0),
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const wallets = pgTable("wallets", {
  id: varchar("id").primaryKey(),
  balanceXaf: integer("balance_xaf").default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const walletTransactions = pgTable(
  "wallet_transactions",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    walletId: varchar("wallet_id").notNull(),
    type: text("type").notNull(),
    amountXaf: integer("amount_xaf").notNull(),
    referenceId: text("reference_id"),
    description: text("description"),
    status: text("status").default("completed"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("idx_wallet_tx_wallet_id").on(table.walletId)]
);

export const commissions = pgTable(
  "commissions",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    distributorId: varchar("distributor_id").notNull(),
    orderId: text("order_id").notNull(),
    type: text("type").notNull(),
    level: integer("level").default(0),
    amountXaf: integer("amount_xaf").notNull(),
    status: text("status").default("completed"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("idx_commissions_distributor_id").on(table.distributorId)]
);

export const withdrawals = pgTable(
  "withdrawals",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    distributorId: varchar("distributor_id").notNull(),
    amountXaf: integer("amount_xaf").notNull(),
    method: text("method").notNull(),
    status: text("status").default("pending"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("idx_withdrawals_distributor_id").on(table.distributorId)]
);

// ── Orders / Payments ────────────────────────────────────────────────
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    orderId: text("order_id").notNull().unique(),
    userId: text("user_id").notNull(),
    amountXaf: integer("amount_xaf").notNull(),
    pvPoints: integer("pv_points").default(0),
    phone: text("phone"),
    provider: text("provider"),
    cart: jsonb("cart").default([]),
    status: text("status").default("pending"),
    transactionId: text("transaction_id"),
    mesombTransactionId: text("mesomb_transaction_id"),
    customerName: text("customer_name"),
    customerPhone: text("customer_phone"),
    deliveryAddress: text("delivery_address"),
    deliveryNotes: text("delivery_notes"),
    whatsappNotified: boolean("whatsapp_notified").notNull().default(false),
    whatsappNotifiedAt: timestamp("whatsapp_notified_at"),
    whatsappNotificationError: text("whatsapp_notification_error"),
    paidAt: timestamp("paid_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_orders_order_id").on(table.orderId),
    index("idx_orders_user_id").on(table.userId),
  ]
);

export const kycDocuments = pgTable(
  "kyc_documents",
  {
    id: text("id").primaryKey(),
    distributorId: varchar("distributor_id").notNull(),
    documentType: text("document_type"),
    fileUrl: text("file_url"),
    status: text("status").default("pending"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("idx_kyc_distributor_id").on(table.distributorId)]
);

export const processedPayments = pgTable("processed_payments", {
  orderId: text("order_id").primaryKey(),
  transactionId: text("transaction_id"),
  processedAt: timestamp("processed_at").defaultNow(),
});

export const mesombWebhookEvents = pgTable("mesomb_webhook_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: text("event_id").notNull().unique(),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").notNull(),
  receivedAt: timestamp("received_at").defaultNow(),
});

// ── Audit / Rate limiting ────────────────────────────────────────────
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  event: text("event"),
  payload: jsonb("payload"),
  adminEmail: text("admin_email"),
  action: text("action"),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const rateLimitEvents = pgTable(
  "rate_limit_events",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    bucket: text("bucket").notNull(),
    identifier: text("identifier").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("rate_limit_events_lookup_idx").on(table.bucket, table.identifier, table.createdAt)]
);

// ── Site settings / CMS ──────────────────────────────────────────────
export const siteSettings = pgTable("site_settings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: varchar("updated_by").references(() => users.id),
});

export const homepageSections = pgTable("homepage_sections", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sectionKey: text("section_key").notNull().unique(),
  content: jsonb("content").notNull().default({}),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: varchar("updated_by").references(() => users.id),
});

export const pageSections = pgTable(
  "page_sections",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    pageKey: text("page_key").notNull(),
    sectionKey: text("section_key").notNull(),
    content: jsonb("content").notNull().default({}),
    displayOrder: integer("display_order").default(0),
    updatedAt: timestamp("updated_at").defaultNow(),
    updatedBy: varchar("updated_by").references(() => users.id),
  },
  (table) => [index("page_sections_page_key_idx").on(table.pageKey)]
);

// ── FAQ ──────────────────────────────────────────────────────────────
export const faqCategories = pgTable("faq_categories", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  nameEn: text("name_en").notNull(),
  nameFr: text("name_fr"),
  displayOrder: integer("display_order").default(0),
});

export const faqs = pgTable("faqs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  categoryId: uuid("category_id").references(() => faqCategories.id, { onDelete: "set null" }),
  questionEn: text("question_en").notNull(),
  questionFr: text("question_fr"),
  answerEn: text("answer_en").notNull(),
  answerFr: text("answer_fr"),
  displayOrder: integer("display_order").default(0),
  isPublished: boolean("is_published").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ── Hero carousel ─────────────────────────────────────────────────────
export const heroCarousel = pgTable("hero_carousel", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  imageUrl: text("image_url").notNull(),
  titleEn: text("title_en"),
  titleFr: text("title_fr"),
  subtitleEn: text("subtitle_en"),
  subtitleFr: text("subtitle_fr"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Appointments ──────────────────────────────────────────────────────
export const appointmentTypes = pgTable("appointment_types", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  nameEn: text("name_en").notNull(),
  nameFr: text("name_fr"),
  durationMinutes: integer("duration_minutes").default(30),
  descriptionEn: text("description_en"),
  descriptionFr: text("description_fr"),
  isActive: boolean("is_active").default(true),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const appointments = pgTable("appointments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  appointmentTypeId: uuid("appointment_type_id").references(() => appointmentTypes.id),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone"),
  email: text("email"),
  serviceType: text("service_type"),
  appointmentDate: timestamp("appointment_date"),
  preferredDate: text("preferred_date"),
  preferredTime: text("preferred_time"),
  notes: text("notes"),
  message: text("message"),
  status: text("status").default("requested"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Media library (replaces Supabase Storage) ─────────────────────────
export const mediaFiles = pgTable("media_files", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  bucket: text("bucket").notNull(),
  folder: text("folder").default(""),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  dataBase64: text("data_base64").notNull(),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const eventRegistrations = pgTable("event_registrations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: uuid("event_id").references(() => events.id).notNull(),
  userId: varchar("user_id").references(() => users.id),
  status: text("status").default("registered"),
});
