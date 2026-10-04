import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { serverEnv } from "@/lib/env";
import * as schema from "./schema";

// One pool per process, reused across dev hot reloads. node-postgres queues queries that exceed
// `max` instead of pipelining them onto busy sockets, which Supabase's transaction pooler (6543)
// cannot handle (see DECISIONS.md, 2026-10-05).
const globalForDb = globalThis as unknown as { __pool?: Pool };

// Supabase's poolers present certificates signed by Supabase's own root CA (not a public one), so
// the chain is verified against the committed copy. No fallback: a missing file is a setup error.
const CA_PATH = "certs/supabase-ca.crt";

function readSupabaseCa(): string {
  const path = resolve(process.cwd(), CA_PATH);
  try {
    return readFileSync(path, "utf8");
  } catch (error) {
    throw new Error(
      `Supabase CA certificate not found at ${path}. It is committed as ${CA_PATH}; ` +
        "download it again from Supabase → Project Settings → Database → SSL if it is missing.",
      { cause: error },
    );
  }
}

function createPool() {
  const env = serverEnv();
  return new Pool({
    connectionString: env.DATABASE_URL,
    // Lower on Netlify via DB_POOL_MAX: each function instance gets its own pool.
    max: env.DB_POOL_MAX ?? 10,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 10_000,
    ssl: { ca: readSupabaseCa(), rejectUnauthorized: true },
  });
}

const pool = globalForDb.__pool ?? createPool();
if (process.env.NODE_ENV !== "production") globalForDb.__pool = pool;

export const db = drizzle(pool, { schema });
export type Db = typeof db;
export { schema };
