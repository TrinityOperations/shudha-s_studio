/**
 * PW-38: in-memory sliding window per client key. Per server instance, so it is a speed bump
 * behind Turnstile, not the main defence (DECISIONS.md 2026-10-08). Expired entries are pruned on
 * every call so memory cannot grow without bound.
 */
export const RATE_LIMIT_MAX_ATTEMPTS = 5;
export const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

const attempts = new Map<string, number[]>();

export type RateLimitResult = { allowed: boolean; retryAfterMs: number };

function prune(now: number, windowMs: number) {
  for (const [key, times] of attempts) {
    const fresh = times.filter((t) => t > now - windowMs);
    if (fresh.length === 0) attempts.delete(key);
    else attempts.set(key, fresh);
  }
}

/** Records an attempt for `key` unless the window is already full. */
export function checkRateLimit(
  key: string,
  now: number = Date.now(),
  { limit = RATE_LIMIT_MAX_ATTEMPTS, windowMs = RATE_LIMIT_WINDOW_MS } = {},
): RateLimitResult {
  prune(now, windowMs);
  const times = attempts.get(key) ?? [];
  if (times.length >= limit) {
    return { allowed: false, retryAfterMs: Math.max(0, times[0] + windowMs - now) };
  }
  times.push(now);
  attempts.set(key, times);
  return { allowed: true, retryAfterMs: 0 };
}

/** Test helper. */
export function resetRateLimit() {
  attempts.clear();
}

/** Test helper: number of keys currently tracked. */
export function rateLimitSize() {
  return attempts.size;
}
