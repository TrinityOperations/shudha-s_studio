"use client";
import { useEffect, useReducer, useState } from "react";
import type { BookingSummary } from "@/actions/booking";
import { BookingConfirmation } from "@/components/public/booking/booking-confirmation";
import type { SlotDayOption } from "@/components/public/booking/slot-picker";
import { Button } from "@/components/ui/button";
import type { ConsultationType } from "@/db/schema";
import { useLocale, useT } from "@/lib/i18n/client";
import { WIZARD_STEP_COUNT } from "@/lib/validators/brief";
import { BriefSummary } from "./brief-summary";
import { StepIndicator } from "./step-indicator";
import { BookStep } from "./steps/book-step";
import { DetailsStep } from "./steps/details-step";
import { OccasionStep } from "./steps/occasion-step";
import { OrderForStep } from "./steps/order-for-step";
import { PhotosStep } from "./steps/photos-step";
import { ProductTypeStep, type WizardTerm } from "./steps/product-type-step";
import { QuantityStep } from "./steps/quantity-step";
import { initialWizardState, isStepValid, wizardReducer, type WizardState } from "./wizard-state";

type Props = {
  today: string;
  categories: WizardTerm[];
  occasions: WizardTerm[];
  product: { slug: string; title: string; titleBn: string | null } | null;
  days: SlotDayOption[];
  consultationTypes: ConsultationType[];
  whatsappUrl?: string | null;
};

type HistoryState = { wizardStep?: number } | null;

/**
 * PW-50..PW-53: seven steps in one reducer; each step change is a history entry so the browser's
 * Back button walks the steps too. Nothing is stored anywhere until the final submit.
 */
export function CustomOrderWizard({
  today,
  categories,
  occasions,
  product,
  days,
  consultationTypes,
  whatsappUrl = null,
}: Props) {
  const t = useT();
  const locale = useLocale();
  const [state, dispatch] = useReducer(wizardReducer, { today, product }, (init) =>
    initialWizardState(init.today, init.product),
  );
  const [booked, setBooked] = useState<{
    summary: BookingSummary;
    name: string;
    brief: WizardState;
  } | null>(null);

  // Keep the history in step with the reducer, and the reducer in step with the Back button.
  useEffect(() => {
    const current = (window.history.state as HistoryState)?.wizardStep;
    if (current === undefined) {
      window.history.replaceState({ ...window.history.state, wizardStep: state.step }, "");
    } else if (current !== state.step) {
      window.history.pushState({ ...window.history.state, wizardStep: state.step }, "");
    }
  }, [state.step]);

  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      const target = (event.state as HistoryState)?.wizardStep;
      if (typeof target === "number") dispatch({ type: "goTo", step: target });
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    document.getElementById("wizard-step")?.focus({ preventScroll: false });
  }, [state.step]);

  const localise = (en: string, bn: string | null) => (locale === "bn" && bn ? bn : en);

  if (booked) {
    return (
      <div className="space-y-8">
        <BookingConfirmation
          summary={booked.summary}
          name={booked.name}
          whatsappUrl={whatsappUrl}
          onReset={() => {
            setBooked(null);
            dispatch({ type: "reset" });
          }}
        />
        <BriefSummary state={booked.brief} />
      </div>
    );
  }

  const canNext = isStepValid(state, state.step);

  return (
    <div className="space-y-8">
      <StepIndicator
        step={state.step}
        completedThrough={state.completedThrough}
        onGoTo={(step) => dispatch({ type: "goTo", step })}
      />

      <div id="wizard-step" tabIndex={-1} className="outline-none">
        {state.step === 1 ? (
          <ProductTypeStep
            state={state}
            dispatch={dispatch}
            categories={categories}
            product={product}
            localise={localise}
          />
        ) : null}
        {state.step === 2 ? (
          <OccasionStep
            state={state}
            dispatch={dispatch}
            occasions={occasions}
            localise={localise}
          />
        ) : null}
        {state.step === 3 ? <OrderForStep state={state} dispatch={dispatch} /> : null}
        {state.step === 4 ? <DetailsStep state={state} dispatch={dispatch} /> : null}
        {state.step === 5 ? <PhotosStep state={state} dispatch={dispatch} /> : null}
        {state.step === 6 ? <QuantityStep state={state} dispatch={dispatch} /> : null}
        {state.step === WIZARD_STEP_COUNT ? (
          <BookStep
            state={state}
            days={days}
            consultationTypes={consultationTypes}
            onBack={() => dispatch({ type: "back" })}
            onBooked={(summary, name) => setBooked({ summary, name, brief: state })}
          />
        ) : null}
      </div>

      {state.step < WIZARD_STEP_COUNT ? (
        <div className="flex flex-wrap gap-2">
          {state.step > 1 ? (
            <Button type="button" variant="outline" onClick={() => dispatch({ type: "back" })}>
              {t("wizard.back")}
            </Button>
          ) : null}
          <Button type="button" disabled={!canNext} onClick={() => dispatch({ type: "next" })}>
            {t("wizard.next")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
