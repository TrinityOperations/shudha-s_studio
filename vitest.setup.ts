import { vi } from "vitest";

// `server-only` throws when imported outside a React Server Component bundle.
vi.mock("server-only", () => ({}));

// Deterministic env for unit tests. Never real values.
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "anon-key";
process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ??= "1x00000000000000000000AA";
process.env.NEXT_PUBLIC_SITE_URL ??= "http://localhost:3000";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "service-role-key";
process.env.DATABASE_URL ??= "postgres://user:pass@localhost:5432/test";
process.env.RESEND_API_KEY ??= "re_test";
process.env.TURNSTILE_SECRET_KEY ??= "1x0000000000000000000000000000000AA";
process.env.OWNER_EMAIL ??= "Owner@Example.com";
