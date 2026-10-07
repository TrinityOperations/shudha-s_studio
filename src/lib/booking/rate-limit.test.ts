import { beforeEach, describe, expect, it } from "vitest";
import { checkRateLimit, rateLimitSize, resetRateLimit } from "./rate-limit";

const HOUR = 60 * 60 * 1000;

beforeEach(() => resetRateLimit());

describe("checkRateLimit", () => {
  it("allows five attempts in an hour and refuses the sixth with a retry time", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 5; i++) expect(checkRateLimit("a", t0 + i * 1000).allowed).toBe(true);
    const sixth = checkRateLimit("a", t0 + 10_000);
    expect(sixth.allowed).toBe(false);
    expect(sixth.retryAfterMs).toBe(HOUR - 10_000);
  });

  it("slides: the oldest attempt expiring frees one more", () => {
    const t0 = 0;
    for (let i = 0; i < 5; i++) checkRateLimit("a", t0 + i * 1000);
    expect(checkRateLimit("a", t0 + HOUR - 1).allowed).toBe(false); // all five still inside the window
    expect(checkRateLimit("a", t0 + HOUR).allowed).toBe(true); // the attempt at 0 is exactly an hour old and expires
    expect(checkRateLimit("a", t0 + HOUR + 1).allowed).toBe(false); // five again
  });

  it("keys are independent", () => {
    for (let i = 0; i < 5; i++) checkRateLimit("a", i);
    expect(checkRateLimit("b", 10).allowed).toBe(true);
  });

  it("prunes expired keys on every call so the map does not grow", () => {
    for (let i = 0; i < 100; i++) checkRateLimit(`k${i}`, 0);
    expect(rateLimitSize()).toBe(100);
    checkRateLimit("fresh", HOUR + 1);
    expect(rateLimitSize()).toBe(1);
  });
});
