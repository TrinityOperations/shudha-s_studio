"use client";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/t";
import { WIZARD_STEP_COUNT } from "@/lib/validators/brief";

type Props = {
  step: number;
  completedThrough: number;
  onGoTo: (step: number) => void;
};

export function stepTitleKey(step: number): MessageKey {
  return `wizard.step${step}.title` as MessageKey;
}

/** "Step n of 7" with numbered dots; completed steps are buttons that jump back (PW-53). */
export function StepIndicator({ step, completedThrough, onGoTo }: Props) {
  const t = useT();
  const steps = Array.from({ length: WIZARD_STEP_COUNT }, (_, i) => i + 1);
  return (
    <nav aria-label={t("wizard.progress")} className="space-y-2">
      <p className="text-muted-foreground text-sm" aria-live="polite">
        {t("wizard.stepOf", { n: step, total: WIZARD_STEP_COUNT })}
      </p>
      <ol className="flex gap-1.5">
        {steps.map((n) => {
          const done = n <= completedThrough && n !== step;
          const base =
            "flex size-8 items-center justify-center rounded-full border text-xs font-medium";
          if (done) {
            return (
              <li key={n}>
                <button
                  type="button"
                  onClick={() => onGoTo(n)}
                  aria-label={t("wizard.goToStep", { n, title: t(stepTitleKey(n)) })}
                  className={`${base} border-primary bg-primary/15 text-foreground hover:bg-primary/25 focus-visible:ring-ring/50 outline-none focus-visible:ring-3`}
                >
                  {n}
                </button>
              </li>
            );
          }
          return (
            <li key={n}>
              <span
                aria-current={n === step ? "step" : undefined}
                className={`${base} ${
                  n === step
                    ? "border-primary bg-primary text-primary-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {n}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
