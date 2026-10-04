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

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: migrationUrl() },
  strict: true,
  verbose: true,
});
