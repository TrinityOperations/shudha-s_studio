"use client";
import type { WizardState } from "@/components/public/wizard/wizard-state";
import { useT } from "@/lib/i18n/client";
import { formatCivilDate } from "@/lib/time";

/** Shown under the booking confirmation: what the customer told us, as sent to the studio. */
export function BriefSummary({ state }: { state: WizardState }) {
  const t = useT();
  const language =
    state.details.language === "bn"
      ? t("common.bengali")
      : state.details.language === "both"
        ? t("wizard.step4.languageBoth")
        : t("common.english");
  const rows: { label: string; value: string }[] = [
    { label: t("wizard.summary.productType"), value: state.productType },
    { label: t("wizard.summary.occasion"), value: state.occasion },
    {
      label: t("wizard.summary.orderFor"),
      value:
        state.orderFor === "business" ? t("wizard.step3.business") : t("wizard.step3.personal"),
    },
    { label: t("wizard.summary.businessName"), value: state.businessName },
    { label: t("wizard.summary.names"), value: state.details.names },
    { label: t("wizard.summary.dates"), value: state.details.dates },
    { label: t("wizard.summary.message"), value: state.details.message },
    { label: t("wizard.summary.language"), value: language },
    { label: t("wizard.summary.quantity"), value: state.quantity },
    {
      label: t("wizard.summary.neededBy"),
      value: state.neededBy && formatCivilDate(state.neededBy, t),
    },
    { label: t("wizard.summary.photos"), value: String(state.photos.length) },
  ].filter((row) => row.value.trim() !== "" && row.value !== "0");

  return (
    <section
      className="space-y-3"
      aria-labelledby="brief-summary-heading"
      data-testid="brief-summary"
    >
      <h2 id="brief-summary-heading" className="text-lg font-semibold">
        {t("wizard.summary.title")}
      </h2>
      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="text-muted-foreground text-sm">{row.label}</dt>
            <dd className="whitespace-pre-line">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
