"use client";
import { useSyncExternalStore } from "react";
import { getServerSnapshot, getSnapshot, subscribe } from "./storage";

/** The saved slugs; `[]` on the server and during hydration, the real list right after. */
export function useWishlist(): readonly string[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

const noop = () => () => {};

/** True once the component runs in the browser, so "empty" can be told apart from "not read yet". */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}
