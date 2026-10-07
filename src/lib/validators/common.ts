import { z } from "zod";
import { locales } from "@/lib/i18n/locale";
import { normaliseWhatsAppNumber } from "@/lib/whatsapp";

// Convention: every validation message is an i18n key from src/lib/i18n/en.json.
// Clients render `t(error.message)`; servers return the key in ActionResult.

export const turnstileTokenSchema = z.string().min(1, "errors.turnstile");

export const localeSchema = z.enum(locales);

/**
 * A WhatsApp number as typed by a person (Australian local or international).
 * Output is the normalised digits-only form used in `wa.me` links and stored in the database.
 */
export const whatsappNumberSchema = z
  .string()
  .trim()
  .min(1, "errors.required")
  .transform((value, ctx) => {
    const normalised = normaliseWhatsAppNumber(value);
    if (!normalised) {
      ctx.addIssue({ code: "custom", message: "errors.whatsappNumber" });
      return z.NEVER;
    }
    return normalised;
  });

/** Relative admin path for post-login redirects. Never an absolute URL. */
export const adminNextPathSchema = z
  .string()
  .regex(/^\/admin(\/[\w\-/]*)?$/)
  .optional();
