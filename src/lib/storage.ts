import { publicEnv } from "@/lib/env.public";

// Client-safe helpers. Server-side storage operations live in storage.server.ts.
export const PRODUCT_IMAGES_BUCKET = "product-images";

export function publicStorageUrl(bucket: string, path: string): string {
  return `${publicEnv.supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}

export function productImageUrl(path: string): string {
  return publicStorageUrl(PRODUCT_IMAGES_BUCKET, path);
}
