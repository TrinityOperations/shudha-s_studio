import "server-only";
import { createElement } from "react";
import { getGeneralSettings } from "@/db/queries/settings";
import type { GallerySubmission } from "@/db/schema";
import { OwnerGalleryEmail } from "@/emails/owner-new-gallery-photo";
import { sendEmail, type SendEmailResult } from "@/lib/email";
import { serverEnv } from "@/lib/env";
import { publicEnv } from "@/lib/env.public";
import { createT, getMessages } from "@/lib/i18n/t";

/** The owner reads her dashboard in English; the template supports bn for later. */
const OWNER_LOCALE = "en" as const;

export async function sendGallerySubmittedEmail(
  submission: Pick<GallerySubmission, "firstName" | "note">,
): Promise<SendEmailResult> {
  const settings = await getGeneralSettings();
  const t = createT(getMessages(OWNER_LOCALE));
  return sendEmail({
    to: serverEnv().OWNER_EMAIL,
    subject: t("admin.gallery.email.subject"),
    templateName: "owner-new-gallery-photo",
    react: createElement(OwnerGalleryEmail, {
      locale: OWNER_LOCALE,
      studioName: settings.studioName,
      firstName: submission.firstName,
      note: submission.note,
      reviewUrl: `${publicEnv.siteUrl}/admin/gallery`,
    }),
  });
}
