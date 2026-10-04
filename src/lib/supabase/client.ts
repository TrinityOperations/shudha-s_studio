"use client";
import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env.public";

// Browser client. Only needed for auth flows that must run client-side (e.g. magic-link
// callbacks in OD-01). All data access stays on the server.
export function createClient() {
  return createBrowserClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey);
}
