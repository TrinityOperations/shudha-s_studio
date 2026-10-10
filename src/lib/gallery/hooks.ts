import type { GallerySubmission } from "@/db/schema";
import { sendGallerySubmittedEmail } from "./emails";

/**
 * PW-72: after a customer photo is stored as pending, tell the owner. Runs inside after(), and
 * nothing here throws: a mail problem is logged and can never undo a submission.
 *
 * Slice #14 adds the owner's push notification here, next to the email.
 */
export async function onGallerySubmitted(submission: GallerySubmission): Promise<void> {
  try {
    const result = await sendGallerySubmittedEmail(submission);
    if (!result.ok) {
      console.error(`[gallery] owner email failed for ${submission.id}: ${result.error}`);
    }
    // #14: push notification to the owner's devices goes here.
  } catch (error) {
    console.error(`[gallery] onGallerySubmitted failed for ${submission.id}`, error);
  }
}
