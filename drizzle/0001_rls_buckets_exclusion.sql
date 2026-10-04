-- Hand-written migration for what Drizzle's schema API cannot express.
-- Keep in sync with the notes at the top of src/db/schema.ts.

-- 1. Row Level Security on every table, with no policies (deny-all for the anon and
--    authenticated roles via PostgREST). The app talks to Postgres directly through Drizzle
--    as the table owner, which is not subject to RLS. Supabase is used for Auth and Storage only.
ALTER TABLE "availability_rules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "blocked_periods" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "booking_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bookings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "contact_messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "faqs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "gallery_submissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "occasions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "product_images" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "product_occasions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "product_tags" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "product_view_stats" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "site_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tags" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "testimonials" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

-- 2. No two active bookings may overlap in time (PW-32). Half-open range [starts_at, ends_at)
--    so a booking ending at 10:00 and one starting at 10:00 do not collide.
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_no_overlap"
  EXCLUDE USING gist (tstzrange("starts_at", "ends_at", '[)') WITH &&)
  WHERE ("status" <> 'cancelled');--> statement-breakpoint

-- 3. Storage buckets. Uploads always go through server actions using the service role,
--    so no storage policies are needed for anon writes. Public buckets are readable by URL.
--    gallery-pending holds customer submissions until the owner approves them (PW-72),
--    after which the files are copied into gallery-images.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES
  ('product-images',  'product-images',  true,  10485760, ARRAY['image/jpeg','image/png','image/webp','image/avif']),
  ('site-images',     'site-images',     true,  10485760, ARRAY['image/jpeg','image/png','image/webp','image/avif','image/svg+xml']),
  ('gallery-images',  'gallery-images',  true,  10485760, ARRAY['image/jpeg','image/png','image/webp','image/avif']),
  ('gallery-pending', 'gallery-pending', false, 10485760, ARRAY['image/jpeg','image/png','image/webp','image/avif']),
  ('booking-uploads', 'booking-uploads', false, 10485760, ARRAY['image/jpeg','image/png','image/webp','image/avif','application/pdf'])
ON CONFLICT (id) DO NOTHING;
