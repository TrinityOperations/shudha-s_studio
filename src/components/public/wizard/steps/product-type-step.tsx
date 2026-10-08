"use client";
import { ChoiceChips, type ChipOption } from "@/components/public/wizard/choice-chips";
import {
  CHOICE_OTHER,
  PRODUCT_CHOICE_PRESELECTED,
  type WizardAction,
  type WizardState,
} from "@/components/public/wizard/wizard-state";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n/client";

export type WizardTerm = { slug: string; name: string; nameBn: string | null };

type Props = {
  state: WizardState;
  dispatch: (action: WizardAction) => void;
  categories: WizardTerm[];
  /** The product the wizard started from (PW-51), if any */
  product: { slug: string; title: string; titleBn: string | null } | null;
  localise: (en: string, bn: string | null) => string;
};

export function ProductTypeStep({ state, dispatch, categories, product, localise }: Props) {
  const t = useT();
  const options: ChipOption[] = [
    ...(product
      ? [{ value: PRODUCT_CHOICE_PRESELECTED, label: localise(product.title, product.titleBn) }]
      : []),
    ...categories.map((c) => ({ value: c.slug, label: localise(c.name, c.nameBn) })),
    { value: CHOICE_OTHER, label: t("wizard.step1.other") },
  ];
  // The brief stores the English name so the owner always reads the same words.
  const englishLabel = (value: string) =>
    value === PRODUCT_CHOICE_PRESELECTED
      ? (product?.title ?? "")
      : (categories.find((c) => c.slug === value)?.name ?? "");

  return (
    <div className="space-y-6">
      <ChoiceChips
        name="productType"
        legend={t("wizard.step1.title")}
        hint={t("wizard.step1.hint")}
        options={options}
        value={state.productChoice}
        onChange={(choice) =>
          dispatch({ type: "productType", choice, label: englishLabel(choice) })
        }
      />
      {state.productChoice === CHOICE_OTHER ? (
        <Field className="max-w-md">
          <FieldLabel htmlFor="productOther">{t("wizard.step1.otherLabel")}</FieldLabel>
          <Input
            id="productOther"
            maxLength={80}
            autoFocus
            value={state.productOther}
            onChange={(e) => dispatch({ type: "productOther", text: e.target.value })}
          />
        </Field>
      ) : null}
    </div>
  );
}
