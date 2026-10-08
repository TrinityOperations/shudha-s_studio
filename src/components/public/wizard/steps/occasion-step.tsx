"use client";
import { ChoiceChips, type ChipOption } from "@/components/public/wizard/choice-chips";
import {
  CHOICE_OTHER,
  type WizardAction,
  type WizardState,
} from "@/components/public/wizard/wizard-state";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n/client";
import type { WizardTerm } from "./product-type-step";

type Props = {
  state: WizardState;
  dispatch: (action: WizardAction) => void;
  occasions: WizardTerm[];
  localise: (en: string, bn: string | null) => string;
};

export function OccasionStep({ state, dispatch, occasions, localise }: Props) {
  const t = useT();
  const options: ChipOption[] = [
    ...occasions.map((o) => ({ value: o.slug, label: localise(o.name, o.nameBn) })),
    { value: CHOICE_OTHER, label: t("wizard.step2.other") },
  ];
  return (
    <div className="space-y-6">
      <ChoiceChips
        name="occasion"
        legend={t("wizard.step2.title")}
        hint={t("wizard.step2.hint")}
        options={options}
        value={state.occasionChoice}
        onChange={(choice) =>
          dispatch({
            type: "occasion",
            choice,
            label: occasions.find((o) => o.slug === choice)?.name ?? "",
          })
        }
      />
      {state.occasionChoice === CHOICE_OTHER ? (
        <Field className="max-w-md">
          <FieldLabel htmlFor="occasionOther">{t("wizard.step2.otherLabel")}</FieldLabel>
          <Input
            id="occasionOther"
            maxLength={80}
            autoFocus
            value={state.occasionOther}
            onChange={(e) => dispatch({ type: "occasionOther", text: e.target.value })}
          />
        </Field>
      ) : null}
    </div>
  );
}
