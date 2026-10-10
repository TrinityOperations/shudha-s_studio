import "server-only";
import { randomUUID } from "node:crypto";
import type { GallerySubmission } from "@/db/schema";
import { GALLERY_IMAGES_BUCKET } from "@/lib/home";
import { processProductImage } from "@/lib/images";
import {
  copyStorageObject,
  removeStorageObjects,
  storageObjectExists,
  uploadStorageObject,
} from "@/lib/storage.server";

// Files behind the gallery actions (slice #12). Not a "use server" file.
// Pending and hidden photos live only in the PRIVATE bucket; approved ones get a copy in the
// PUBLIC bucket under a fresh folder per approval, so a browser never serves a stale cached file.

export const GALLERY_PENDING_BUCKET = "gallery-pending";
export const GALLERY_PUBLIC_BUCKET = GALLERY_IMAGES_BUCKET;

export type PhotoPaths = { full: string; thumb: string };

export function pendingPaths(id: string): PhotoPaths {
  return { full: `${id}/full.webp`, thumb: `${id}/thumb.webp` };
}

/** Re-encodes (sharp drops EXIF, including GPS) and stores full + thumb in the private bucket. */
export async function storePendingPhoto(id: string, input: Buffer): Promise<PhotoPaths> {
  const paths = pendingPaths(id);
  const processed = await processProductImage(input);
  const written: string[] = [];
  try {
    await uploadStorageObject(GALLERY_PENDING_BUCKET, paths.full, processed.full, "image/webp");
    written.push(paths.full);
    await uploadStorageObject(GALLERY_PENDING_BUCKET, paths.thumb, processed.thumb, "image/webp");
  } catch (error) {
    await removeStorageObjects(GALLERY_PENDING_BUCKET, written).catch(() => undefined);
    throw error;
  }
  return paths;
}

/** Approval: copies the private pair into a new public folder. Returns the public paths. */
export async function publishPhoto(
  row: Pick<GallerySubmission, "id" | "imagePath" | "thumbPath">,
): Promise<PhotoPaths> {
  const folder = `${row.id}/${randomUUID()}`;
  const target = { full: `${folder}/full.webp`, thumb: `${folder}/thumb.webp` };
  await copyStorageObject(
    GALLERY_PENDING_BUCKET,
    row.imagePath,
    target.full,
    GALLERY_PUBLIC_BUCKET,
  );
  try {
    await copyStorageObject(
      GALLERY_PENDING_BUCKET,
      row.thumbPath,
      target.thumb,
      GALLERY_PUBLIC_BUCKET,
    );
  } catch (error) {
    await removeStorageObjects(GALLERY_PUBLIC_BUCKET, [target.full]).catch(() => undefined);
    throw error;
  }
  return target;
}

/**
 * Before the public files go, make sure a private copy exists. Rows seeded straight into the
 * public bucket (the demo content) have no pending copy: copy the public files in and return the
 * new private paths; otherwise return the row's own.
 */
export async function ensurePrivateCopy(
  row: Pick<
    GallerySubmission,
    "id" | "imagePath" | "thumbPath" | "publicImagePath" | "publicThumbPath"
  >,
): Promise<PhotoPaths> {
  if (await storageObjectExists(GALLERY_PENDING_BUCKET, row.imagePath)) {
    return { full: row.imagePath, thumb: row.thumbPath };
  }
  if (!row.publicImagePath || !row.publicThumbPath) {
    return { full: row.imagePath, thumb: row.thumbPath };
  }
  const paths = pendingPaths(row.id);
  await copyStorageObject(
    GALLERY_PUBLIC_BUCKET,
    row.publicImagePath,
    paths.full,
    GALLERY_PENDING_BUCKET,
  );
  await copyStorageObject(
    GALLERY_PUBLIC_BUCKET,
    row.publicThumbPath,
    paths.thumb,
    GALLERY_PENDING_BUCKET,
  );
  return paths;
}

/** Removes the public pair; a missing object is not an error. */
export async function removePublicFiles(
  row: Pick<GallerySubmission, "publicImagePath" | "publicThumbPath">,
): Promise<void> {
  const paths = [row.publicImagePath, row.publicThumbPath].filter((p): p is string => !!p);
  if (paths.length) await removeStorageObjects(GALLERY_PUBLIC_BUCKET, paths).catch(() => undefined);
}

/** Removes everything a row owns in both buckets; missing objects are not an error. */
export async function removeAllFiles(
  row: Pick<GallerySubmission, "imagePath" | "thumbPath" | "publicImagePath" | "publicThumbPath">,
): Promise<void> {
  await Promise.all([
    removeStorageObjects(GALLERY_PENDING_BUCKET, [row.imagePath, row.thumbPath]).catch(
      () => undefined,
    ),
    removePublicFiles(row),
  ]);
}
