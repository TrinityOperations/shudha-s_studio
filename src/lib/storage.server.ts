import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageError";
    // Actions turn this into a generic i18n error; keep the real cause in the server log.
    console.error(`[storage] ${message}`);
  }
}

export async function uploadStorageObject(
  bucket: string,
  path: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  const { error } = await createAdminClient()
    .storage.from(bucket)
    .upload(path, body, { contentType, upsert: false, cacheControl: "31536000" });
  if (error) throw new StorageError(`upload ${bucket}/${path}: ${error.message}`);
}

export async function removeStorageObjects(bucket: string, paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await createAdminClient().storage.from(bucket).remove(paths);
  if (error) throw new StorageError(`remove from ${bucket}: ${error.message}`);
}

/** Copies within a bucket, or into `destinationBucket` when given (gallery approval, slice #12). */
export async function copyStorageObject(
  bucket: string,
  from: string,
  to: string,
  destinationBucket?: string,
): Promise<void> {
  const { error } = await createAdminClient()
    .storage.from(bucket)
    .copy(from, to, destinationBucket ? { destinationBucket } : undefined);
  const target = destinationBucket ? `${destinationBucket}/${to}` : to;
  if (error) throw new StorageError(`copy ${bucket}/${from} → ${target}: ${error.message}`);
}

/** Whether an object exists (a folder listing filtered by name; cheap and needs no download). */
export async function storageObjectExists(bucket: string, path: string): Promise<boolean> {
  const slash = path.lastIndexOf("/");
  const folder = slash === -1 ? "" : path.slice(0, slash);
  const name = path.slice(slash + 1);
  const { data, error } = await createAdminClient()
    .storage.from(bucket)
    .list(folder, { search: name, limit: 10 });
  if (error) throw new StorageError(`list ${bucket}/${folder}: ${error.message}`);
  return (data ?? []).some((item) => item.name === name);
}

/**
 * Short-lived URL for an object in a private bucket (e.g. booking-uploads). Generate per request
 * and never store it. Returns null (and logs) when the object is missing or Storage fails.
 */
export async function createSignedStorageUrl(
  bucket: string,
  path: string,
  expiresInSeconds: number,
): Promise<string | null> {
  const { data, error } = await createAdminClient()
    .storage.from(bucket)
    .createSignedUrl(path, expiresInSeconds);
  if (error || !data?.signedUrl) {
    console.error(`[storage] signed url for ${bucket}/${path}: ${error?.message ?? "no url"}`);
    return null;
  }
  return data.signedUrl;
}
