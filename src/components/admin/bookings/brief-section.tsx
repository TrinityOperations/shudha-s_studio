import Image from "next/image";
import type { CustomOrderBrief } from "@/db/schema";
import { BOOKING_UPLOADS_BUCKET } from "@/lib/booking/defaults";
import { getT } from "@/lib/i18n";
import type { MessageKey, T } from "@/lib/i18n/t";
import { createSignedStorageUrl } from "@/lib/storage.server";

export const SIGNED_URL_SECONDS = 600;

/** Pure: label/value rows for whatever the brief contains (OD-26). Exported for tests. */
export function briefRows(
  brief: CustomOrderBrief | null | undefined,
  t: T,
): { label: string; value: string }[] {
  if (!brief) return [];
  const rows: { label: string; value: string }[] = [];
  const add = (key: MessageKey, value: string | number | undefined | null) => {
    if (value !== undefined && value !== null && String(value).trim() !== "")
      rows.push({ label: t(key), value: String(value) });
  };
  if (brief.orderFor)
    add(
      "admin.bookings.brief.orderFor",
      brief.orderFor === "business"
        ? t("admin.bookings.brief.business")
        : t("admin.bookings.brief.personal"),
    );
  add("admin.bookings.brief.businessName", brief.businessName);
  add("admin.bookings.brief.productType", brief.productType);
  add("admin.bookings.brief.occasion", brief.occasion);
  add("admin.bookings.brief.names", brief.details?.names);
  add("admin.bookings.brief.dates", brief.details?.dates);
  add("admin.bookings.brief.message", brief.details?.message);
  add("admin.bookings.brief.language", brief.details?.language);
  add("admin.bookings.brief.quantity", brief.quantity);
  add("admin.bookings.brief.neededBy", brief.neededBy);
  return rows;
}

export async function BriefSection({ brief }: { brief: CustomOrderBrief | null }) {
  const t = await getT();
  const rows = briefRows(brief, t);
  const photos = brief?.photoPaths ?? [];
  const signed = await Promise.all(
    photos.map((path) => createSignedStorageUrl(BOOKING_UPLOADS_BUCKET, path, SIGNED_URL_SECONDS)),
  );

  return (
    <section className="space-y-3" aria-labelledby="brief-heading">
      <h2 id="brief-heading" className="text-lg font-semibold">
        {t("admin.bookings.detail.brief")}
      </h2>
      {rows.length === 0 && photos.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("admin.bookings.detail.noBrief")}</p>
      ) : (
        <>
          <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {rows.map((row) => (
              <div key={row.label}>
                <dt className="text-muted-foreground text-sm">{row.label}</dt>
                <dd className="whitespace-pre-line">{row.value}</dd>
              </div>
            ))}
          </dl>
          {photos.length ? (
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm">{t("admin.bookings.brief.photos")}</p>
              <ul className="flex flex-wrap gap-2">
                {photos.map((path, i) =>
                  signed[i] ? (
                    <li key={path}>
                      <a href={signed[i]!} target="_blank" rel="noopener noreferrer">
                        <Image
                          src={signed[i]!}
                          alt=""
                          width={120}
                          height={120}
                          unoptimized
                          className="size-24 rounded-md object-cover"
                        />
                      </a>
                    </li>
                  ) : null,
                )}
              </ul>
              <p className="text-muted-foreground text-xs">
                {t("admin.bookings.detail.imageExpires")}
              </p>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
