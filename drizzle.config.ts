import { readFileSync } from "node:fs";
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });

// Migrations need a session connection. DATABASE_URL is Supabase's transaction pooler
// (port 6543) for the app at runtime; DIRECT_DATABASE_URL is the session pooler (port 5432).
// If DIRECT_DATABASE_URL is unset we derive it by swapping the port, so a fresh clone still works.
function migrationUrl(): string {
  if (process.env.DIRECT_DATABASE_URL) return process.env.DIRECT_DATABASE_URL;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Set DIRECT_DATABASE_URL (or DATABASE_URL) in .env.local");
  const parsed = new URL(url);
  if (parsed.hostname.endsWith(".pooler.supabase.com") && parsed.port === "6543") {
    parsed.port = "5432";
    return parsed.toString();
  }
  return url;
}

// drizzle-kit ignores `ssl` when `dbCredentials.url` is set, so the URL is split into fields.
// Same verified TLS as src/db/index.ts: Supabase's poolers chain to Supabase's own root CA, and
// the project enforces SSL, so an unencrypted connection is refused outright.
function migrationCredentials() {
  const url = new URL(migrationUrl());
  return {
    host: url.hostname,
    port: Number(url.port || 5432),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1) || "postgres",
    ssl: { ca: readFileSync("certs/supabase-ca.crt", "utf8"), rejectUnauthorized: true },
  };
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: migrationCredentials(),
  strict: true,
  verbose: true,
});
