import { vi } from "vitest";

/**
 * Minimal Drizzle stand-in for action tests. Every builder method returns the same chainable
 * object; awaiting it resolves with the next queued result (default []). `transaction(fn)` runs
 * `fn` with the same mock so code using `tx` is exercised too.
 */
export function createDbMock() {
  const results: unknown[] = [];
  const calls: { method: string; args: unknown[] }[] = [];

  const chain: Record<string, unknown> = {};
  const methods = [
    "select",
    "from",
    "where",
    "leftJoin",
    "groupBy",
    "orderBy",
    "limit",
    "insert",
    "values",
    "returning",
    "onConflictDoNothing",
    "onConflictDoUpdate",
    "update",
    "set",
    "delete",
  ];
  for (const method of methods) {
    chain[method] = vi.fn((...args: unknown[]) => {
      calls.push({ method, args });
      return chain;
    });
  }
  chain.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(results.length ? results.shift() : []).then(resolve, reject);

  const query = {
    products: { findFirst: vi.fn(), findMany: vi.fn() },
    productImages: { findFirst: vi.fn(), findMany: vi.fn() },
    categories: { findMany: vi.fn() },
    occasions: { findMany: vi.fn() },
    tags: { findMany: vi.fn() },
  };

  const db = {
    ...chain,
    query,
    transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(db)),
  };

  return {
    db,
    query,
    calls,
    /** Queue results for successive awaited builder chains, in execution order. */
    queueResults(...items: unknown[]) {
      results.push(...items);
    },
    reset() {
      results.length = 0;
      calls.length = 0;
      for (const method of methods) (chain[method] as ReturnType<typeof vi.fn>).mockClear();
      for (const entity of Object.values(query))
        for (const fn of Object.values(entity)) fn.mockReset();
      db.transaction.mockClear();
    },
    methodCalls(method: string) {
      return calls.filter((c) => c.method === method).map((c) => c.args);
    },
  };
}

export type DbMock = ReturnType<typeof createDbMock>;
