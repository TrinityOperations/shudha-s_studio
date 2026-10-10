"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import { contactMessages } from "@/db/schema";
import { getGeneralSettings } from "@/db/queries/settings";
import { OwnerContactEmail } from "@/emails/owner-contact-message";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { clientIpFromHeaders } from "@/lib/booking/client-ip";
import { checkRateLimit } from "@/lib/booking/rate-limit";
import { sendEmail } from "@/lib/email";
import { serverEnv } from "@/lib/env";
import { getT } from "@/lib/i18n";
import { verifyTurnstile } from "@/lib/turnstile";
import { whatsappLink } from "@/lib/whatsapp";
import { contactFormSchema } from "@/lib/validators/contact";

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

/**
 * PW-42: Turnstile → Zod → the shared rate limiter (own bucket) → store the message → email the
 * owner (dry run locally). A failed email never fails the submission: the row is the record.
 */
export async function submitContactMessage(formData: FormData): Promise<ActionResult> {
  const ip = clientIpFromHeaders(await headers());
  if (
    !(await verifyTurnstile(field(formData, "turnstileToken"), ip === "unknown" ? undefined : ip))
  ) {
    return fail("errors.turnstile");
  }

  const parsed = contactFormSchema.safeParse({
    name: field(formData, "name"),
    email: field(formData, "email"),
    phone: field(formData, "phone"),
    message: field(formData, "message"),
    turnstileToken: field(formData, "turnstileToken"),
  });
  if (!parsed.success) {
    return fail("errors.invalidInput", z.flattenError(parsed.error).fieldErrors);
  }
  const data = parsed.data;
  if (!checkRateLimit(`contact:${ip}`).allowed) return fail("errors.rateLimited");

  await db.insert(contactMessages).values({
    name: data.name,
    email: data.email,
    phone: data.phone || null,
    message: data.message,
  });

  const [settings, t] = await Promise.all([getGeneralSettings(), getT()]);
  const result = await sendEmail({
    to: serverEnv().OWNER_EMAIL,
    subject: t("contact.email.subject", { name: data.name }),
    replyTo: data.email,
    templateName: "owner-contact-message",
    react: OwnerContactEmail({
      studioName: settings.studioName,
      name: data.name,
      email: data.email,
      phone: data.phone,
      message: data.message,
      whatsappUrl: data.phone ? whatsappLink(data.phone) : null,
    }),
  });
  if (!result.ok) console.error("[contact] owner email failed", result.error);

  return ok();
}
