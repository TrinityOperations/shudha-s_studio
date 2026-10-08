"use client";

export type ChipOption = { value: string; label: string; hint?: string };

type Props = {
  name: string;
  legend: string;
  hint?: string;
  options: ChipOption[];
  value: string;
  onChange: (value: string) => void;
  /** Field-sized legend for a chip group inside a form, instead of the step heading. */
  compact?: boolean;
};

/**
 * A radio group rendered as wrapping chips (same visually hidden native radios as the slot
 * picker, so arrow keys move between choices and labels are large tap targets at 360px).
 */
export function ChoiceChips({ name, legend, hint, options, value, onChange, compact }: Props) {
  const hintId = hint ? `${name}-hint` : undefined;
  return (
    <fieldset aria-describedby={hintId}>
      <legend className={compact ? "text-sm font-medium" : "text-xl font-semibold tracking-tight"}>
        {legend}
      </legend>
      {hint ? (
        <p id={hintId} className="text-muted-foreground mt-1 text-sm">
          {hint}
        </p>
      ) : null}
      <ul className={`flex flex-wrap gap-2 ${compact ? "mt-2" : "mt-4"}`}>
        {options.map((option) => {
          const id = `${name}-${option.value}`;
          return (
            <li key={option.value} className={option.hint ? "w-full" : undefined}>
              <input
                id={id}
                type="radio"
                name={name}
                value={option.value}
                checked={value === option.value}
                onChange={() => onChange(option.value)}
                className="peer sr-only"
              />
              <label
                htmlFor={id}
                className="peer-focus-visible:ring-ring/50 peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground hover:bg-muted block cursor-pointer rounded-lg border px-4 py-2 text-sm peer-focus-visible:ring-3"
              >
                <span className="font-medium">{option.label}</span>
                {option.hint ? <span className="mt-0.5 block text-xs">{option.hint}</span> : null}
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
