"use client";
import type { BookingSummary } from "@/actions/booking";
import { Button, buttonVariants } from "@/components/ui/button";
import { useLocale, useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/t";

type Props = {
  summary: BookingSummary;
  name: string;
  onReset: () => void;
  /** Studio WhatsApp link (PW-34); null when the owner has not set a number */
  whatsappUrl?: string | null;
};

/** PW-34 (screen half): shown in place of the form; details never go in the URL. */
export function BookingConfirmation({ summary, name, onReset, whatsappUrl = null }: Props) {
  const t = useT();
  const locale = useLocale();
  const product =
    locale === "bn" && summary.productTitleBn ? summary.productTitleBn : summary.productTitle;

  return (
    <section
      aria-live="polite"
      className="bg-muted/30 space-y-6 rounded-xl border p-6"
      data-testid="booking-confirmation"
    >
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">{t("booking.confirmation.title")}</h2>
        <p>{t("booking.confirmation.intro", { name })}</p>
      </header>
      <dl className="grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground text-sm">{t("booking.confirmation.date")}</dt>
          <dd className="font-medium">{summary.date}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-sm">{t("booking.confirmation.time")}</dt>
          <dd className="font-medium">{summary.time}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-sm">{t("booking.confirmation.type")}</dt>
          <dd className="font-medium">
            {t(`booking.type.${summary.consultationType}` as MessageKey)}
          </dd>
        </div>
        {product ? (
          <div>
            <dt className="text-muted-foreground text-sm">{t("booking.confirmation.product")}</dt>
            <dd className="font-medium">{product}</dd>
          </div>
        ) : null}
      </dl>
      {summary.wishlistCount ? (
        <p className="text-sm" data-testid="confirmation-wishlist">
          {t("wishlist.attached", { count: summary.wishlistCount })}
        </p>
      ) : null}
      <p className="text-sm">{t("booking.confirmation.next")}</p>
      <div className="flex flex-wrap gap-2">
        {whatsappUrl ? (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants()}
            data-testid="confirmation-whatsapp"
          >
            {t("common.messageOnWhatsApp")}
          </a>
        ) : null}
        <Button type="button" variant="outline" onClick={onReset}>
          {t("booking.confirmation.another")}
        </Button>
      </div>
    </section>
  );
}
