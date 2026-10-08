import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  add,
  clear,
  getServerSnapshot,
  getSnapshot,
  has,
  isPersistent,
  merge,
  parseStored,
  prune,
  remove,
  resetWishlistStore,
  sanitiseSlugs,
  subscribe,
  toggle,
  WISHLIST_MAX,
  WISHLIST_STORAGE_KEY,
} from "./storage";

/** A localStorage stand-in; `throwing` imitates a private window that refuses writes. */
function fakeStorage(throwing = false) {
  const data = new Map<string, string>();
  const guard = () => {
    if (throwing) throw new DOMException("QuotaExceededError");
  };
  return {
    data,
    getItem: (key: string) => (guard(), data.get(key) ?? null),
    setItem: (key: string, value: string) => (guard(), void data.set(key, value)),
    removeItem: (key: string) => (guard(), void data.delete(key)),
  };
}

type Win = { localStorage: unknown; addEventListener: unknown; removeEventListener: unknown };
let storageListener: ((event: { key: string | null }) => void) | null = null;

function installWindow(localStorage: unknown) {
  const win: Win = {
    localStorage,
    addEventListener: (_: string, fn: (event: { key: string | null }) => void) => {
      storageListener = fn;
    },
    removeEventListener: () => {
      storageListener = null;
    },
  };
  vi.stubGlobal("window", win);
}

beforeEach(() => {
  resetWishlistStore();
  storageListener = null;
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("parseStored / sanitiseSlugs", () => {
  it("accepts the versioned shape and ignores anything else", () => {
    expect(parseStored(null)).toEqual([]);
    expect(parseStored("{not json")).toEqual([]);
    expect(parseStored(JSON.stringify({ v: 2, slugs: ["a"] }))).toEqual([]);
    expect(parseStored(JSON.stringify(["a", "b"]))).toEqual([]);
    expect(
      parseStored(JSON.stringify({ v: 1, slugs: ["eid-mug", "Bad Slug", 3, "eid-mug"] })),
    ).toEqual(["eid-mug"]);
  });

  it("caps at the maximum", () => {
    const many = Array.from({ length: WISHLIST_MAX + 5 }, (_, i) => `p-${i}`);
    expect(sanitiseSlugs(many)).toHaveLength(WISHLIST_MAX);
  });
});

describe("store with working localStorage", () => {
  it("adds, toggles, removes, merges, prunes and clears, persisting each change", () => {
    const storage = fakeStorage();
    installWindow(storage);
    expect(getServerSnapshot()).toEqual([]);
    expect(getSnapshot()).toEqual([]);

    expect(add("eid-mug")).toBe(true);
    expect(add("eid-mug")).toBe(true);
    expect(has("eid-mug")).toBe(true);
    expect(toggle("frame")).toBe(true);
    expect(toggle("eid-mug")).toBe(false);
    expect(getSnapshot()).toEqual(["frame"]);
    expect(JSON.parse(storage.data.get(WISHLIST_STORAGE_KEY)!)).toEqual({
      v: 1,
      slugs: ["frame"],
    });

    expect(merge(["frame", "lamp", "nope!", "cup"])).toBe(2);
    expect(getSnapshot()).toEqual(["frame", "lamp", "cup"]);
    expect(prune(["cup", "ghost"])).toBe(2);
    expect(getSnapshot()).toEqual(["cup"]);
    remove("cup");
    expect(getSnapshot()).toEqual([]);
    add("x");
    clear();
    expect(getSnapshot()).toEqual([]);
    expect(isPersistent()).toBe(true);
  });

  it("refuses the 51st entry", () => {
    installWindow(fakeStorage());
    for (let i = 0; i < WISHLIST_MAX; i++) expect(add(`p-${i}`)).toBe(true);
    expect(add("one-more")).toBe(false);
    expect(getSnapshot()).toHaveLength(WISHLIST_MAX);
  });

  it("reads what another visit stored and keeps the snapshot reference stable", () => {
    const storage = fakeStorage();
    storage.data.set(WISHLIST_STORAGE_KEY, JSON.stringify({ v: 1, slugs: ["frame"] }));
    installWindow(storage);
    const first = getSnapshot();
    expect(first).toEqual(["frame"]);
    expect(getSnapshot()).toBe(first);
    add("frame");
    expect(getSnapshot()).toBe(first);
  });

  it("notifies subscribers and picks up changes made in another tab", () => {
    const storage = fakeStorage();
    installWindow(storage);
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);
    add("frame");
    expect(listener).toHaveBeenCalledTimes(1);

    storage.data.set(WISHLIST_STORAGE_KEY, JSON.stringify({ v: 1, slugs: ["frame", "lamp"] }));
    storageListener!({ key: "something-else" });
    expect(listener).toHaveBeenCalledTimes(1);
    storageListener!({ key: WISHLIST_STORAGE_KEY });
    expect(listener).toHaveBeenCalledTimes(2);
    expect(getSnapshot()).toEqual(["frame", "lamp"]);

    unsubscribe();
    expect(storageListener).toBeNull();
  });
});

describe("store without localStorage", () => {
  it("falls back to memory when storage throws and reports it", () => {
    installWindow(fakeStorage(true));
    expect(isPersistent()).toBe(false);
    expect(add("frame")).toBe(true);
    expect(getSnapshot()).toEqual(["frame"]);
    remove("frame");
    expect(getSnapshot()).toEqual([]);
  });

  it("works on the server with no window at all", () => {
    vi.stubGlobal("window", undefined);
    expect(getSnapshot()).toEqual([]);
    expect(isPersistent()).toBe(false);
    const unsubscribe = subscribe(() => {});
    unsubscribe();
  });
});
