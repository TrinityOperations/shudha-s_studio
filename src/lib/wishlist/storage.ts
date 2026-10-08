import { SLUG_PATTERN } from "@/lib/validators/products";

// PW-60: the wishlist lives in the browser only, as product slugs (never ids). One versioned
// localStorage key; every access is guarded because private windows and blocked site data can
// throw, in which case the list lives in memory for the page session.

export const WISHLIST_STORAGE_KEY = "shudhas-studio:wishlist";
export const WISHLIST_MAX = 50;
const VERSION = 1;

type Persisted = { v: typeof VERSION; slugs: string[] };
type Listener = () => void;

const EMPTY: readonly string[] = Object.freeze([]);
let snapshot: readonly string[] = EMPTY;
let loaded = false;
let storageAvailable: boolean | null = null;
const listeners = new Set<Listener>();

function storage(): Storage | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    if (storageAvailable === null) {
      const probe = `${WISHLIST_STORAGE_KEY}:probe`;
      window.localStorage.setItem(probe, "1");
      window.localStorage.removeItem(probe);
      storageAvailable = true;
    }
    return storageAvailable ? window.localStorage : null;
  } catch {
    storageAvailable = false;
    return null;
  }
}

/** Pure: keeps valid, unique slugs in order, capped at the maximum. Exported for tests. */
export function sanitiseSlugs(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of input) {
    if (typeof item !== "string" || !SLUG_PATTERN.test(item) || seen.has(item)) continue;
    seen.add(item);
    out.push(item);
    if (out.length >= WISHLIST_MAX) break;
  }
  return out;
}

/** Pure: the stored JSON, or an empty list for anything malformed. Exported for tests. */
export function parseStored(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as Partial<Persisted> | null;
    if (!data || typeof data !== "object" || data.v !== VERSION) return [];
    return sanitiseSlugs(data.slugs);
  } catch {
    return [];
  }
}

function read(): string[] {
  const store = storage();
  if (!store) return [...snapshot];
  try {
    return parseStored(store.getItem(WISHLIST_STORAGE_KEY));
  } catch {
    return [...snapshot];
  }
}

function sameList(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((slug, i) => slug === b[i]);
}

function emit() {
  for (const listener of listeners) listener();
}

function load() {
  if (loaded) return;
  loaded = true;
  snapshot = read();
}

function commit(next: string[]) {
  const clean = sanitiseSlugs(next);
  if (sameList(clean, snapshot)) return;
  snapshot = clean;
  const store = storage();
  if (store) {
    try {
      const value: Persisted = { v: VERSION, slugs: clean };
      store.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(value));
    } catch {
      storageAvailable = false;
    }
  }
  emit();
}

function onStorageEvent(event: StorageEvent) {
  if (event.key !== null && event.key !== WISHLIST_STORAGE_KEY) return;
  const next = read();
  if (sameList(next, snapshot)) return;
  snapshot = next;
  emit();
}

/** For useSyncExternalStore: a stable array reference until the list changes. */
export function getSnapshot(): readonly string[] {
  load();
  return snapshot;
}

/** The server (and the first client render) always see an empty list, so hydration matches. */
export function getServerSnapshot(): readonly string[] {
  return EMPTY;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  if (listeners.size === 1 && typeof window !== "undefined") {
    window.addEventListener("storage", onStorageEvent);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && typeof window !== "undefined") {
      window.removeEventListener("storage", onStorageEvent);
    }
  };
}

/** False when localStorage threw: the list only lasts for this page session (shown on /wishlist). */
export function isPersistent(): boolean {
  return storage() !== null;
}

export function has(slug: string): boolean {
  return getSnapshot().includes(slug);
}

/** Returns false when the list is full. */
export function add(slug: string): boolean {
  const current = getSnapshot();
  if (current.includes(slug)) return true;
  if (current.length >= WISHLIST_MAX) return false;
  commit([...current, slug]);
  return true;
}

export function remove(slug: string): void {
  commit(getSnapshot().filter((s) => s !== slug));
}

/** Returns the new state: true when the slug is now saved. */
export function toggle(slug: string): boolean {
  if (has(slug)) {
    remove(slug);
    return false;
  }
  return add(slug);
}

/** Adds every slug not already saved, in order, up to the cap. Returns how many were added. */
export function merge(slugs: string[]): number {
  const current = getSnapshot();
  const next = sanitiseSlugs([...current, ...slugs]);
  commit(next);
  return next.length - current.length;
}

/** Keeps only the given slugs (used after the server reports which ones still exist). */
export function prune(keep: string[]): number {
  const current = getSnapshot();
  const next = current.filter((slug) => keep.includes(slug));
  commit(next);
  return current.length - next.length;
}

export function clear(): void {
  commit([]);
}

/** Test hook: forget everything, including whether storage was found to work. */
export function resetWishlistStore(): void {
  snapshot = EMPTY;
  loaded = false;
  storageAvailable = null;
  listeners.clear();
}
