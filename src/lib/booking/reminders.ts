import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { listReminderCandidates } from "@/db/queries/bookings";
import { sendBookingEmail } from "./emails";

const HOUR_MS = 60 * 60 * 1000;
export const REMINDER_WINDOW_START_HOURS = 23;
export const REMINDER_WINDOW_END_HOURS = 25;

export type ReminderJobResult = { claimed: number; sent: number; failed: number };

/**
 * PW-36. Each candidate is claimed with a conditional UPDATE (reminder_sent_at IS NULL) before
 * anything is sent, so two overlapping runs can never both email the same customer. A failed send
 * releases the claim so the next hourly run retries; the 23–25 h window bounds the retries.
 */
export async function runReminderJob(now = new Date()): Promise<ReminderJobResult> {
  const from = new Date(now.getTime() + REMINDER_WINDOW_START_HOURS * HOUR_MS);
  const to = new Date(now.getTime() + REMINDER_WINDOW_END_HOURS * HOUR_MS);
  const result: ReminderJobResult = { claimed: 0, sent: 0, failed: 0 };

  for (const candidate of await listReminderCandidates(from, to)) {
    const [claimed] = await db
      .update(bookings)
      .set({ reminderSentAt: now })
      .where(and(eq(bookings.id, candidate.id), isNull(bookings.reminderSentAt)))
      .returning();
    if (!claimed) continue; // another run got it first
    result.claimed++;

    const sent = await sendBookingEmail("reminder", claimed);
    if (sent.ok) {
      result.sent++;
    } else {
      result.failed++;
      await db.update(bookings).set({ reminderSentAt: null }).where(eq(bookings.id, claimed.id));
    }
  }
  return result;
}
