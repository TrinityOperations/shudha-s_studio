"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { LOCALE_COOKIE } from "@/lib/i18n/locale";
import { localeSchema } from "@/lib/validators/common";

const ONE_YEAR = 60 * 60 * 24 * 365;

/** Persists the visitor's language choice (PW-80). Public, so no owner check. */
export async function setLocale(input: string): Promise<ActionResult> {
  const parsed = localeSchema.safeParse(input);
  if (!parsed.success) return fail("errors.invalidInput");

  (await cookies()).set(LOCALE_COOKIE, parsed.data, {
    path: "/",
    maxAge: ONE_YEAR,
    sameSite: "lax",
  });

  revalidatePath("/", "layout");
  return ok();
}
