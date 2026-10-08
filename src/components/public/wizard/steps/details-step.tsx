"use client";
import { ChoiceChips } from "@/components/public/wizard/choice-chips";
import type { WizardAction, WizardState } from "@/components/public/wizard/wizard-state";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/lib/i18n/client";
import { BRIEF_LANGUAGES } from "@/lib/validators/brief";

type Props = { state: WizardState; dispatch: (action: WizardAction) => void };

export function DetailsStep({ state, dispatch }: Props) {
  const t = useT();
  const { details } = state;
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-semibold tracking-tight">{t("wizard.step4.title")}</h2>
        <p className="text-muted-foreground mt-1 text-sm">{t("wizard.step4.hint")}</p>
      </header>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="names">{t("wizard.step4.names")}</FieldLabel>
          <Input
            id="names"
            maxLength={500}
            value={details.names}
            onChange={(e) => dispatch({ type: "details", patch: { names: e.target.value } })}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="dates">{t("wizard.step4.dates")}</FieldLabel>
          <Input
            id="dates"
            maxLength={200}
            aria-describedby="dates-hint"
            value={details.dates}
            onChange={(e) => dispatch({ type: "details", patch: { dates: e.target.value } })}
          />
          <FieldDescription id="dates-hint">{t("wizard.step4.datesHint")}</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="message">{t("wizard.step4.message")}</FieldLabel>
          <Textarea
            id="message"
            rows={4}
            maxLength={2000}
            value={details.message}
            onChange={(e) => dispatch({ type: "details", patch: { message: e.target.value } })}
          />
        </Field>
        <ChoiceChips
          compact
          name="language"
          legend={t("wizard.step4.language")}
          options={BRIEF_LANGUAGES.map((value) => ({
            value,
            label:
              value === "en"
                ? t("common.english")
                : value === "bn"
                  ? t("common.bengali")
                  : t("wizard.step4.languageBoth"),
          }))}
          value={details.language}
          onChange={(value) =>
            dispatch({
              type: "details",
              patch: { language: value === "bn" ? "bn" : value === "both" ? "both" : "en" },
            })
          }
        />
      </FieldGroup>
    </div>
  );
}
