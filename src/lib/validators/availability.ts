import { z } from "zod";
import { consultationTypeSchema } from "./booking";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
/** What an <input type="datetime-local"> submits, seconds optional. Interpreted as Melbourne wall-clock. */
const DATETIME_LOCAL_PATTERN = /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

export const weekdayHoursSchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    active: z.boolean(),
    startTime: z.string().regex(TIME_PATTERN, "errors.datetime"),
    endTime: z.string().regex(TIME_PATTERN, "errors.datetime"),
  })
  .refine((day) => !day.active || day.startTime < day.endTime, {
    message: "errors.endBeforeStart",
    path: ["endTime"],
  });

/** OD-21: one row per weekday, Sunday first. */
export const weeklyHoursSchema = z.object({
  days: z.array(weekdayHoursSchema).length(7, "errors.invalidInput"),
});
export type WeeklyHoursInput = z.infer<typeof weeklyHoursSchema>;

const range = (min: number, max: number) =>
  z.number("errors.range").int("errors.range").min(min, "errors.range").max(max, "errors.range");

export const bookingSettingsSchema = z.object({
  slotMinutes: range(15, 120),
  bufferMinutes: range(0, 60),
  horizonDays: range(7, 90),
  minNoticeHours: range(0, 168),
  consultationTypes: z.array(consultationTypeSchema).min(1, "errors.typeRequired"),
});
export type BookingSettingsInput = z.infer<typeof bookingSettingsSchema>;

export const blockedPeriodSchema = z
  .object({
    startsAt: z.string().regex(DATETIME_LOCAL_PATTERN, "errors.datetime"),
    endsAt: z.string().regex(DATETIME_LOCAL_PATTERN, "errors.datetime"),
    reason: z.string().trim().max(200, "errors.tooLong"),
  })
  .refine((v) => v.startsAt.slice(0, 16) < v.endsAt.slice(0, 16), {
    message: "errors.endBeforeStart",
    path: ["endsAt"],
  });
export type BlockedPeriodInput = z.infer<typeof blockedPeriodSchema>;

export const blockedPeriodIdSchema = z.uuid("errors.invalidInput");
