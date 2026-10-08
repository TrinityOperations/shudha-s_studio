import { Badge } from "@/components/ui/badge";
import type { BookingStatus } from "@/db/schema";
import type { T } from "@/lib/i18n/t";

const VARIANT = {
  new: "default",
  confirmed: "secondary",
  done: "outline",
  cancelled: "destructive",
} as const satisfies Record<BookingStatus, string>;

export function StatusBadge({ status, t }: { status: BookingStatus; t: T }) {
  return (
    <Badge variant={VARIANT[status]} data-testid="booking-status">
      {t(`admin.bookings.status.${status}`)}
    </Badge>
  );
}
