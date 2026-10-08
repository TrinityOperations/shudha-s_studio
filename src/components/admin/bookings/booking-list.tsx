import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdminBookingPage, AdminBookingRow } from "@/db/queries/bookings";
import { getT } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n/t";
import { formatMelbourne } from "@/lib/time";
import { adminBookingsHref, type AdminBookingListParams } from "./list-params";
import { StatusBadge } from "./status-badge";

/** Name with the business marker (decision: corporate enquiries stand out before opening). */
export async function CustomerCell({ row }: { row: AdminBookingRow }) {
  const t = await getT();
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Link
        href={`/admin/bookings/${row.id}`}
        className="font-medium underline-offset-4 hover:underline"
      >
        {row.customerName}
      </Link>
      {row.isBusiness ? (
        <Badge variant="outline" title={row.businessName ?? undefined}>
          {t("admin.bookings.brief.business")}
        </Badge>
      ) : null}
    </span>
  );
}

export async function BookingRows({ rows }: { rows: AdminBookingRow[] }) {
  const t = await getT();
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("admin.bookings.col.when")}</TableHead>
            <TableHead>{t("admin.bookings.col.customer")}</TableHead>
            <TableHead>{t("admin.bookings.col.type")}</TableHead>
            <TableHead>{t("admin.bookings.col.product")}</TableHead>
            <TableHead>{t("admin.bookings.col.status")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-muted-foreground py-10 text-center">
                {t("admin.bookings.empty")}
              </TableCell>
            </TableRow>
          ) : null}
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="whitespace-nowrap">
                <Link
                  href={`/admin/bookings/${row.id}`}
                  className="underline-offset-4 hover:underline"
                >
                  {formatMelbourne(row.startsAt, "EEE d MMM, h:mm aaa")}
                </Link>
              </TableCell>
              <TableCell>
                <CustomerCell row={row} />
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {t(`booking.type.${row.consultationType}` as MessageKey)}
              </TableCell>
              <TableCell>
                {row.productTitle ?? <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell>
                <StatusBadge status={row.status} t={t} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export async function BookingList({
  page,
  params,
}: {
  page: AdminBookingPage;
  params: AdminBookingListParams;
}) {
  const t = await getT();
  return (
    <div className="space-y-4">
      <BookingRows rows={page.items} />
      {page.pageCount > 1 ? (
        <nav
          aria-label={t("catalogue.pagination.label")}
          className="flex items-center justify-between"
        >
          {page.page > 1 ? (
            <Link
              href={adminBookingsHref(params, { page: page.page - 1 })}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              {t("catalogue.pagination.previous")}
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted-foreground text-sm">
            {t("admin.bookings.pagination.page", { page: page.page, total: page.pageCount })}
          </span>
          {page.page < page.pageCount ? (
            <Link
              href={adminBookingsHref(params, { page: page.page + 1 })}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              {t("catalogue.pagination.next")}
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  );
}
