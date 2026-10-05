import "server-only";

type Entry = { count: number; resetsAt: number };
const globalRateLimits = globalThis as unknown as { __bookingRateLimits?: Map<string, Entry> };
const entries = globalRateLimits.__bookingRateLimits ?? new Map<string, Entry>();
if (process.env.NODE_ENV !== "production") globalRateLimits.__bookingRateLimits = entries;

export function checkBookingRateLimit(key: string, now = Date.now()) {
  const windowMs = 15 * 60 * 1000;
  const limit = 5;
  const current = entries.get(key);
  if (!current || current.resetsAt <= now) {
    entries.set(key, { count: 1, resetsAt: now + windowMs });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

export function clearBookingRateLimits() {
  entries.clear();
}
