ALTER TABLE "products" ADD COLUMN "price_from" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "video_url" text;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_price_from_non_negative" CHECK ("products"."price_from" >= 0);