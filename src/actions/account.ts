"use server";

import { z } from "zod";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { accountPasswordSchema, type AccountPasswordValues } from "@/lib/validators/settings";

/** OD-34: the owner changes her own password. The login email is an environment setting. */
export async function changePassword(input: AccountPasswordValues): Promise<ActionResult> {
  const parsed = accountPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return fail("errors.invalidInput", z.flattenError(parsed.error).fieldErrors);
  }
  await requireOwner();
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    console.error("[account] password change failed", error.message);
    return fail("errors.passwordChangeFailed");
  }
  return ok();
}
