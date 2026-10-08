"use client";
import { ChoiceChips } from "@/components/public/wizard/choice-chips";
import type { WizardAction, WizardState } from "@/components/public/wizard/wizard-state";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n/client";

type Props = { state: WizardState; dispatch: (action: WizardAction) => void };

export function OrderForStep({ state, dispatch }: Props) {
  const t = useT();
  const business = state.orderFor === "business";
  const tooShort =
    business && state.businessName.trim().length > 0 && state.businessName.trim().length < 2;
  return (
    <div className="space-y-6">
      <ChoiceChips
        name="orderFor"
        legend={t("wizard.step3.title")}
        options={[
          {
            value: "personal",
            label: t("wizard.step3.personal"),
            hint: t("wizard.step3.personalHint"),
          },
          {
            value: "business",
            label: t("wizard.step3.business"),
            hint: t("wizard.step3.businessHint"),
          },
        ]}
        value={state.orderFor}
        onChange={(value) =>
          dispatch({ type: "orderFor", value: value === "business" ? "business" : "personal" })
        }
      />
      {business ? (
        <Field className="max-w-md" data-invalid={tooShort || undefined}>
          <FieldLabel htmlFor="businessName">{t("wizard.step3.businessName")}</FieldLabel>
          <Input
            id="businessName"
            autoComplete="organization"
            maxLength={120}
            autoFocus
            aria-invalid={tooShort || undefined}
            value={state.businessName}
            onChange={(e) => dispatch({ type: "businessName", value: e.target.value })}
          />
          {tooShort ? <FieldError>{t("errors.tooShort")}</FieldError> : null}
        </Field>
      ) : null}
    </div>
  );
}
