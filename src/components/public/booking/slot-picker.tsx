"use client";
import { useState } from "react";
import { useT } from "@/lib/i18n/client";

export type SlotDayOption = {
  /** "yyyy-MM-dd" in Melbourne */
  date: string;
  /** e.g. "Wed 15 Jul" */
  label: string;
  slots: { start: string; label: string }[];
};

type Props = {
  days: SlotDayOption[];
  value: string;
  onChange: (start: string) => void;
  invalid?: boolean;
  describedBy?: string;
};

/**
 * PW-31: dates with at least one free slot in a scrollable row, then the times for the chosen
 * date as visually hidden native radios with visible labels (arrow keys move between times).
 */
export function SlotPicker({ days, value, onChange, invalid, describedBy }: Props) {
  const t = useT();
  const dateOfValue = days.find((day) => day.slots.some((slot) => slot.start === value))?.date;
  const [selectedDate, setSelectedDate] = useState(dateOfValue ?? days[0]?.date ?? "");
  const activeDate = dateOfValue ?? selectedDate;
  const day = days.find((d) => d.date === activeDate) ?? days[0];

  if (!day) return <p className="text-muted-foreground text-sm">{t("booking.form.noSlots")}</p>;

  return (
    <div className="space-y-4">
      <div role="group" aria-label={t("booking.form.date")}>
        <p className="mb-2 text-sm font-medium">{t("booking.form.date")}</p>
        <ul className="flex gap-2 overflow-x-auto pb-2">
          {days.map((d) => {
            const active = d.date === day.date;
            return (
              <li key={d.date} className="shrink-0">
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setSelectedDate(d.date);
                    if (d.date !== dateOfValue) onChange("");
                  }}
                  className={`focus-visible:ring-ring/50 rounded-lg border px-3 py-2 text-sm whitespace-nowrap outline-none focus-visible:ring-3 ${
                    active ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"
                  }`}
                >
                  {d.label}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <fieldset aria-invalid={invalid || undefined} aria-describedby={describedBy}>
        <legend className="mb-2 text-sm font-medium">{t("booking.form.slot")}</legend>
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {day.slots.map((slot) => {
            const id = `slot-${slot.start.replace(/[^0-9]/g, "")}`;
            const checked = slot.start === value;
            return (
              <li key={slot.start}>
                <input
                  id={id}
                  type="radio"
                  name="slot"
                  value={slot.start}
                  checked={checked}
                  onChange={() => onChange(slot.start)}
                  className="peer sr-only"
                />
                <label
                  htmlFor={id}
                  className="peer-focus-visible:ring-ring/50 peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground hover:bg-muted block cursor-pointer rounded-lg border px-2 py-2 text-center text-sm peer-focus-visible:ring-3"
                >
                  {slot.label}
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>
    </div>
  );
}
