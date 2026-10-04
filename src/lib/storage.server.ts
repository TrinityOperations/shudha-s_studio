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

export async function copyStorageObject(bucket: string, from: string, to: string): Promise<void> {
  const { error } = await createAdminClient().storage.from(bucket).copy(from, to);
  if (error) throw new StorageError(`copy ${bucket}/${from} → ${to}: ${error.message}`);
}
