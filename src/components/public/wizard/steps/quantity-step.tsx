"use client";
import type { WizardAction, WizardState } from "@/components/public/wizard/wizard-state";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n/client";
import { quantityStepSchema } from "@/lib/validators/brief";

type Props = { state: WizardState; dispatch: (action: WizardAction) => void };

export function QuantityStep({ state, dispatch }: Props) {
  const t = useT();
  const parsed = quantityStepSchema(state.today).safeParse({
    quantity: state.quantity,
    neededBy: state.neededBy,
  });
  const issue = (field: string) =>
    parsed.success ? null : (parsed.error.issues.find((i) => i.path[0] === field) ?? null);
  const quantityError = issue("quantity");
  const neededByError = issue("neededBy");

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold tracking-tight">{t("wizard.step6.title")}</h2>
      <FieldGroup>
        <Field className="max-w-xs" data-invalid={!!quantityError || undefined}>
          <FieldLabel htmlFor="quantity">{t("wizard.step6.quantity")}</FieldLabel>
          <Input
            id="quantity"
            type="number"
            inputMode="numeric"
            min={1}
            max={1000}
            step={1}
            aria-invalid={!!quantityError || undefined}
            value={state.quantity}
            onChange={(e) => dispatch({ type: "quantity", value: e.target.value })}
          />
          {quantityError ? <FieldError>{t("errors.range")}</FieldError> : null}
        </Field>
        <Field className="max-w-xs" data-invalid={!!neededByError || undefined}>
          <FieldLabel htmlFor="neededBy">{t("wizard.step6.neededBy")}</FieldLabel>
          <Input
            id="neededBy"
            type="date"
            min={state.today}
            aria-describedby="neededBy-hint"
            aria-invalid={!!neededByError || undefined}
            value={state.neededBy}
            onChange={(e) => dispatch({ type: "neededBy", value: e.target.value })}
          />
          <FieldDescription id="neededBy-hint">{t("wizard.step6.neededByHint")}</FieldDescription>
          {neededByError ? (
            <FieldError>
              {t(neededByError.message === "errors.datePast" ? "errors.datePast" : "errors.date")}
            </FieldError>
          ) : null}
        </Field>
      </FieldGroup>
    </div>
  );
}
