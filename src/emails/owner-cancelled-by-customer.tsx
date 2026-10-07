import { OwnerBookingEmail } from "./owner-new-booking";
import type { OwnerEmailProps } from "./types";

export const ownerCancelledSubject = "emails.ownerCancelled.subject" as const;

/** PW-37: the customer used their link to cancel. Same layout as the new-booking email. */
export function OwnerCancelledByCustomerEmail(props: Omit<OwnerEmailProps, "variant">) {
  return <OwnerBookingEmail {...props} variant="cancelled" />;
}
