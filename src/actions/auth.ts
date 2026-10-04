"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fail, type ActionResult } from "@/lib/action-result";
import { LOGIN_PATH } from "@/lib/auth";
import { isOwnerEmail } from "@/lib/owner";
import { createClient } from "@/lib/supabase/server";
import { verifyTurnstile } from "@/lib/turnstile";
import { loginSchema, type LoginInput } from "@/lib/validators/auth";

/** Email + password sign-in for the owner (OD-01). Redirects to /admin on success. */
export async function signIn(input: LoginInput): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return fail("errors.invalidInput", z.flattenError(parsed.error).fieldErrors);
  }
  const { email, password, turnstileToken, next } = parsed.data;

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim();
  if (!(await verifyTurnstile(turnstileToken, ip))) {
    return fail("errors.turnstile");
  }

  // Only the owner may sign in. Same error as a wrong password so nothing is revealed.
  if (!isOwnerEmail(email)) {
    return fail("errors.invalidCredentials");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return fail("errors.invalidCredentials");
  }

  redirect(next ?? "/admin");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(LOGIN_PATH);
}
