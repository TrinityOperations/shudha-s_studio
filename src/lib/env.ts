import { z } from "zod";

// Server-only env, validated once on first use (lazy so `next build` without secrets still works).
// Deliberately does not import `server-only`: drizzle.config.ts and db/seed.ts run under plain Node.
const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DIRECT_DATABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  TURNSTILE_SECRET_KEY: z.string().min(1),
  OWNER_EMAIL: z.email(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | undefined;

export function serverEnv(): ServerEnv {
  if (!cached) {
    const result = serverEnvSchema.safeParse(process.env);
    if (!result.success) {
      const missing = Object.keys(z.flattenError(result.error).fieldErrors).join(", ");
      throw new Error(`Missing or invalid server environment variables: ${missing}`);
    }
    cached = result.data;
  }
  return cached;
}
