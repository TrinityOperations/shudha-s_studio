import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env.public";
import { serverEnv } from "@/lib/env";

let client: SupabaseClient | undefined;

/**
 * Service-role client for Storage operations from server actions. Bypasses RLS and bucket
 * policies. Never import from a client component and never return it (or its key) from an action.
 */
export function createAdminClient(): SupabaseClient {
  client ??= createClient(publicEnv.supabaseUrl, serverEnv().SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}
