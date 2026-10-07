/**
 * Drizzle schema: single source of truth for the database.
 * Conventions: uuid ids, timestamptz stored in UTC, Bengali content in sibling `_bn` columns,
 * optional starting price only (no cart, checkout or payment). Migrations: `pnpm db:generate` then
 * `pnpm db:migrate`.
 *
 * Not expressible in Drizzle and therefore kept in drizzle/0001_rls_buckets_exclusion.sql:
 * - Row Level Security on every table (deny-all; the app talks to Postgres directly)
 * - storage buckets
 * - bookings_no_overlap EXCLUDE constraint (PW-32)
 */
import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  time,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export const productStatusEnum = pgEnum("product_status", ["draft", "published", "archived"]);
export const bookingStatusEnum = pgEnum("booking_status", [
  "new",
  "confirmed",
  "done",
  "cancelled",
]);
export const consultationTypeEnum = pgEnum("consultation_type", ["in_person", "phone", "video"]);
export const gallerySubmissionStatusEnum = pgEnum("gallery_submission_status", [
  "pending",
  "approved",
  "hidden",
]);

export type ProductStatus = (typeof productStatusEnum.enumValues)[number];
export type BookingStatus = (typeof bookingStatusEnum.enumValues)[number];
export type ConsultationType = (typeof consultationTypeEnum.enumValues)[number];
export type GallerySubmissionStatus = (typeof gallerySubmissionStatusEnum.enumValues)[number];

// ---------------------------------------------------------------------------
// Shared column helpers
// ---------------------------------------------------------------------------
const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

// ---------------------------------------------------------------------------
// Taxonomy (OD-12, PW-03, PW-04, PW-11)
// ---------------------------------------------------------------------------
export const categories = pgTable("categories", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  nameBn: text("name_bn"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const occasions = pgTable("occasions", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  nameBn: text("name_bn"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const tags = pgTable("tags", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  nameBn: text("name_bn"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// ---------------------------------------------------------------------------
// Products (PW-21..23, OD-10..14, OD-18, OD-19, OD-36). Only an optional starting price (PW-14).
// ---------------------------------------------------------------------------
export type Personalisation = {
  /** Checklist of what can be personalised, e.g. ["name", "date", "photo"] (OD-14) */
  options: string[];
  /** Free-text notes shown on the product page (PW-22) */
  notes: string;
  notesBn?: string;
};

export const products = pgTable(
  "products",
  {
    id: id(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    titleBn: text("title_bn"),
    description: text("description").notNull().default(""),
    descriptionBn: text("description_bn"),
    materialNotes: text("material_notes"),
    materialNotesBn: text("material_notes_bn"),
    personalisation: jsonb("personalisation")
      .$type<Personalisation>()
      .notNull()
      .default({ options: [], notes: "" }),
    turnaroundDays: smallint("turnaround_days"),
    /** Optional starting price in whole AUD dollars, shown as "From $X"; null = not shown (OD-18) */
    priceFrom: integer("price_from"),
    /** Facebook, Instagram or YouTube link shown on the product page; stored as given (OD-19) */
    videoUrl: text("video_url"),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    status: productStatusEnum("status").notNull().default("draft"),
    featured: boolean("featured").notNull().default(false),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("products_status_featured_idx").on(t.status, t.featured),
    index("products_category_idx").on(t.categoryId),
    check("products_price_from_non_negative", sql`${t.priceFrom} >= 0`),
  ],
);

export const productImages = pgTable(
  "product_images",
  {
    id: id(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    /** Paths inside the `product-images` bucket: full (max 1600px) and 400px thumbnail */
    path: text("path").notNull(),
    thumbPath: text("thumb_path").notNull(),
    alt: text("alt").notNull(),
    altBn: text("alt_bn"),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("product_images_product_idx").on(t.productId, t.sortOrder)],
);

export const productOccasions = pgTable(
  "product_occasions",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    occasionId: uuid("occasion_id")
      .notNull()
      .references(() => occasions.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.productId, t.occasionId] })],
);

export const productTags = pgTable(
  "product_tags",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.productId, t.tagId] })],
);

/** Daily view buckets so "most viewed this week" (OD-40) is one query. */
export const productViewStats = pgTable(
  "product_view_stats",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    views: integer("views").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.productId, t.day] })],
);

// ---------------------------------------------------------------------------
// Availability (OD-21)
// ---------------------------------------------------------------------------
export const bookingSettings = pgTable(
  "booking_settings",
  {
    /** Single row, always id = 1 */
    id: integer("id").primaryKey().default(1),
    slotMinutes: integer("slot_minutes").notNull().default(30),
    bufferMinutes: integer("buffer_minutes").notNull().default(0),
    horizonDays: integer("horizon_days").notNull().default(60),
    minNoticeHours: integer("min_notice_hours").notNull().default(24),
    consultationTypes: consultationTypeEnum("consultation_types")
      .array()
      .notNull()
      .default(sql`'{in_person,phone,video}'::consultation_type[]`),
    updatedAt: updatedAt(),
  },
  (t) => [check("booking_settings_singleton", sql`${t.id} = 1`)],
);

export const availabilityRules = pgTable(
  "availability_rules",
  {
    id: id(),
    /** 0 = Sunday … 6 = Saturday, in Melbourne local time */
    weekday: smallint("weekday").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("availability_weekday_range", sql`${t.weekday} between 0 and 6`),
    check("availability_time_order", sql`${t.startTime} < ${t.endTime}`),
  ],
);

/** Holidays and ad-hoc blocked periods */
export const blockedPeriods = pgTable(
  "blocked_periods",
  {
    id: id(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    reason: text("reason"),
    createdAt: createdAt(),
  },
  (t) => [check("blocked_period_order", sql`${t.startsAt} < ${t.endsAt}`)],
);

// ---------------------------------------------------------------------------
// Bookings (PW-30..38, PW-52, PW-61, OD-20..26)
// ---------------------------------------------------------------------------
/** Structured brief from the custom-order wizard (PW-50..52) */
export type CustomOrderBrief = {
  productType?: string;
  occasion?: string;
  details?: {
    names?: string;
    dates?: string;
    message?: string;
    language?: "en" | "bn" | "both";
  };
  /** Paths inside the `booking-uploads` bucket */
  photoPaths?: string[];
  quantity?: number;
  /** ISO date (yyyy-mm-dd) */
  neededBy?: string;
};

export const bookings = pgTable(
  "bookings",
  {
    id: id(),
    status: bookingStatusEnum("status").notNull().default("new"),
    consultationType: consultationTypeEnum("consultation_type").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    customerName: text("customer_name").notNull(),
    customerPhone: text("customer_phone").notNull(),
    customerEmail: text("customer_email").notNull(),
    /** Language the customer booked in; every email to them is rendered in it (PW-34..37) */
    locale: text("locale").notNull().default("en"),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    message: text("message"),
    /** Path inside the `booking-uploads` bucket */
    referenceImagePath: text("reference_image_path"),
    brief: jsonb("brief").$type<CustomOrderBrief>(),
    wishlistProductIds: uuid("wishlist_product_ids")
      .array()
      .notNull()
      .default(sql`'{}'::uuid[]`),
    privateNotes: text("private_notes"),
    /** Secret in the reschedule/cancel link emailed to the customer (PW-37) */
    manageToken: uuid("manage_token").notNull().defaultRandom().unique(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    // Overlap prevention is the EXCLUDE constraint in the custom migration, not an index here.
    index("bookings_starts_at_idx").on(t.startsAt),
    index("bookings_status_starts_idx").on(t.status, t.startsAt),
    index("bookings_customer_email_idx").on(t.customerEmail),
    check("booking_time_order", sql`${t.startsAt} < ${t.endsAt}`),
    check("bookings_locale", sql`${t.locale} in ('en', 'bn')`),
  ],
);

// ---------------------------------------------------------------------------
// Content and settings (OD-30..35, PW-06, PW-42, PW-43, PW-70..72, OD-61)
// ---------------------------------------------------------------------------
/**
 * Key/value site content. Keys and their Zod schemas live in src/lib/validators/settings.ts
 * (e.g. "general", "home", "contact", "announcement", "theme").
 */
export const siteSettings = pgTable("site_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: updatedAt(),
});

export const faqs = pgTable("faqs", {
  id: id(),
  question: text("question").notNull(),
  questionBn: text("question_bn"),
  answer: text("answer").notNull(),
  answerBn: text("answer_bn"),
  sortOrder: integer("sort_order").notNull().default(0),
  published: boolean("published").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const testimonials = pgTable("testimonials", {
  id: id(),
  authorName: text("author_name").notNull(),
  quote: text("quote").notNull(),
  quoteBn: text("quote_bn"),
  /** Path inside the `site-images` bucket */
  photoPath: text("photo_path"),
  sortOrder: integer("sort_order").notNull().default(0),
  visible: boolean("visible").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/**
 * Customer photos. Uploaded into the private `gallery-pending` bucket; on approval the files
 * are copied to the public `gallery-images` bucket and the public* paths are filled in (PW-72).
 */
export const gallerySubmissions = pgTable(
  "gallery_submissions",
  {
    id: id(),
    imagePath: text("image_path").notNull(),
    thumbPath: text("thumb_path").notNull(),
    publicImagePath: text("public_image_path"),
    publicThumbPath: text("public_thumb_path"),
    firstName: text("first_name"),
    note: text("note"),
    consentGiven: boolean("consent_given").notNull(),
    status: gallerySubmissionStatusEnum("status").notNull().default("pending"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("gallery_consent_required", sql`${t.consentGiven} = true`),
    index("gallery_submissions_status_idx").on(t.status, t.createdAt),
  ],
);

export const contactMessages = pgTable("contact_messages", {
  id: id(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  message: text("message").notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: createdAt(),
});

/** Web Push subscriptions for the owner's PWA (OD-61) */
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: id(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  userAgent: text("user_agent"),
  createdAt: createdAt(),
});

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------
export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const occasionsRelations = relations(occasions, ({ many }) => ({
  productOccasions: many(productOccasions),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  productTags: many(productTags),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  images: many(productImages),
  productOccasions: many(productOccasions),
  productTags: many(productTags),
  bookings: many(bookings),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, { fields: [productImages.productId], references: [products.id] }),
}));

export const productOccasionsRelations = relations(productOccasions, ({ one }) => ({
  product: one(products, { fields: [productOccasions.productId], references: [products.id] }),
  occasion: one(occasions, { fields: [productOccasions.occasionId], references: [occasions.id] }),
}));

export const productTagsRelations = relations(productTags, ({ one }) => ({
  product: one(products, { fields: [productTags.productId], references: [products.id] }),
  tag: one(tags, { fields: [productTags.tagId], references: [tags.id] }),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  product: one(products, { fields: [bookings.productId], references: [products.id] }),
}));

// ---------------------------------------------------------------------------
// Row types
// ---------------------------------------------------------------------------
export type Category = typeof categories.$inferSelect;
export type Occasion = typeof occasions.$inferSelect;
export type Tag = typeof tags.$inferSelect;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type ProductImage = typeof productImages.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
export type BookingSettings = typeof bookingSettings.$inferSelect;
export type AvailabilityRule = typeof availabilityRules.$inferSelect;
export type BlockedPeriod = typeof blockedPeriods.$inferSelect;
export type Faq = typeof faqs.$inferSelect;
export type Testimonial = typeof testimonials.$inferSelect;
export type GallerySubmission = typeof gallerySubmissions.$inferSelect;
export type ContactMessage = typeof contactMessages.$inferSelect;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
