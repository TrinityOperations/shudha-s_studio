import { z } from "zod";
import { locales } from "@/lib/i18n/locale";

// Convention: every validation message is an i18n key from src/lib/i18n/en.json.
// Clients render `t(error.message)`; servers return the key in ActionResult.

export const turnstileTokenSchema = z.string().min(1, "errors.turnstile");

export const localeSchema = z.enum(locales);

/** Relative admin path for post-login redirects. Never an absolute URL. */
export const adminNextPathSchema = z
  .string()
  .regex(/^\/admin(\/[\w\-/]*)?$/)
  .optional();
