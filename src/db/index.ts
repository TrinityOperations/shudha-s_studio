import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { serverEnv } from "@/lib/env";
import * as schema from "./schema";

// One connection pool per process. Supabase's transaction pooler needs prepare: false.
const globalForDb = globalThis as unknown as { __sql?: ReturnType<typeof postgres> };

const client =
  globalForDb.__sql ??
  postgres(serverEnv().DATABASE_URL, {
    prepare: false,
    max: 5,
    idle_timeout: 20,
  });

if (process.env.NODE_ENV !== "production") globalForDb.__sql = client;

export const db = drizzle(client, { schema });
export type Db = typeof db;
export { schema };
