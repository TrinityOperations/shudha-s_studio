import "server-only";
import { randomUUID } from "node:crypto";
import { processProductImage } from "@/lib/images";
import { SITE_IMAGES_BUCKET } from "@/lib/home";
import { removeStorageObjects, uploadStorageObject } from "@/lib/storage.server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SiteImageSlot } from "@/lib/validators/settings";
import { HERO_VIDEO_MAX_BYTES, HERO_VIDEO_TYPE } from "@/lib/validators/site-images";

// Site-images helpers for the dashboard (slice #10). Not a "use server" file.

/** Runs a photo through the product pipeline (1600px full + 400px thumb, webp) into `site-images/<prefix>/`. */
export async function storeSiteImage(
  file: File,
  prefix: "home" | "testimonials",
  focus: { x: number; y: number },
): Promise<SiteImageSlot> {
  const key = randomUUID();
  const path = `${prefix}/${key}.webp`;
  const thumbPath = `${prefix}/${key}-thumb.webp`;
  const processed = await processProductImage(Buffer.from(await file.arrayBuffer()));
  const written: string[] = [];
  try {
    await uploadStorageObject(SITE_IMAGES_BUCKET, path, processed.full, "image/webp");
    written.push(path);
    await uploadStorageObject(SITE_IMAGES_BUCKET, thumbPath, processed.thumb, "image/webp");
  } catch (error) {
    await removeStorageObjects(SITE_IMAGES_BUCKET, written).catch(() => undefined);
    throw error;
  }
  return { path, thumbPath, focus, bucket: "site-images" };
}

/** A signed URL the browser uploads the hero video to directly (Netlify caps function bodies). */
export async function createHeroVideoUploadTarget(): Promise<{
  path: string;
  token: string;
  signedUrl: string;
}> {
  const path = `hero/${randomUUID()}.mp4`;
  const { data, error } = await createAdminClient()
    .storage.from(SITE_IMAGES_BUCKET)
    .createSignedUploadUrl(path);
  if (error || !data) throw new Error(`signed upload url: ${error?.message ?? "no data"}`);
  return { path, token: data.token, signedUrl: data.signedUrl };
}

export type StoredObjectInfo = { size: number; mimetype: string | null };

/** Metadata of one object, or null when it does not exist. */
export async function statSiteObject(path: string): Promise<StoredObjectInfo | null> {
  const slash = path.lastIndexOf("/");
  const folder = slash === -1 ? "" : path.slice(0, slash);
  const name = path.slice(slash + 1);
  const { data, error } = await createAdminClient()
    .storage.from(SITE_IMAGES_BUCKET)
    .list(folder, { search: name, limit: 10 });
  if (error) throw new Error(`list ${SITE_IMAGES_BUCKET}/${folder}: ${error.message}`);
  const object = data?.find((item) => item.name === name);
  if (!object) return null;
  const metadata = (object.metadata ?? {}) as { size?: number; mimetype?: string };
  return { size: metadata.size ?? 0, mimetype: metadata.mimetype ?? null };
}

/** True when the uploaded object is an mp4 within the limit. */
export function isAcceptableHeroVideo(info: StoredObjectInfo | null): boolean {
  return (
    !!info &&
    info.mimetype === HERO_VIDEO_TYPE &&
    info.size > 0 &&
    info.size <= HERO_VIDEO_MAX_BYTES
  );
}

/**
 * Removes objects under the editor's own prefixes that neither copy of the home key references.
 * Never looks outside those prefixes and never touches product-images.
 */
export async function removeUnreferencedSiteImages(
  prefixes: readonly string[],
  referenced: Set<string>,
): Promise<number> {
  const storage = createAdminClient().storage.from(SITE_IMAGES_BUCKET);
  const orphans: string[] = [];
  for (const prefix of prefixes) {
    const folder = prefix.replace(/\/$/, "");
    const { data, error } = await storage.list(folder, { limit: 1000 });
    if (error) throw new Error(`list ${SITE_IMAGES_BUCKET}/${folder}: ${error.message}`);
    for (const item of data ?? []) {
      if (!item.id) continue; // a sub-folder, not an object
      const path = `${folder}/${item.name}`;
      if (!referenced.has(path)) orphans.push(path);
    }
  }
  if (orphans.length) await removeStorageObjects(SITE_IMAGES_BUCKET, orphans);
  return orphans.length;
}
