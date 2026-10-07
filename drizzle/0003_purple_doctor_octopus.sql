ALTER TABLE "bookings" ADD COLUMN "locale" text DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_locale" CHECK ("bookings"."locale" in ('en', 'bn'));