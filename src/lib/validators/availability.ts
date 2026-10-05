import { z } from "zod";
import { consultationTypeEnum } from "@/db/schema";

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "errors.invalidInput");

export const weeklyAvailabilityRuleSchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    active: z.boolean(),
    startTime: timeSchema,
    endTime: timeSchema,
  })
  .refine((value) => !value.active || value.startTime < value.endTime, {
    message: "availability.errors.timeOrder",
    path: ["endTime"],
  });

export const availabilitySettingsSchema = z.object({
  slotMinutes: z.number().int().min(15).max(180),
  bufferMinutes: z.number().int().min(0).max(120),
  horizonDays: z.number().int().min(1).max(365),
  minNoticeHours: z.number().int().min(0).max(720),
  consultationTypes: z.array(z.enum(consultationTypeEnum.enumValues)).min(1, "errors.required"),
  rules: z.array(weeklyAvailabilityRuleSchema).length(7),
});

export const blockedPeriodSchema = z
  .object({
    startsAt: z.string().min(1, "errors.required"),
    endsAt: z.string().min(1, "errors.required"),
    reason: z.string().trim().max(200, "errors.tooLong"),
  })
  .refine((value) => value.startsAt < value.endsAt, {
    message: "availability.errors.timeOrder",
    path: ["endsAt"],
  });

export const blockedPeriodIdSchema = z.uuid();

export type AvailabilitySettingsInput = z.input<typeof availabilitySettingsSchema>;
export type AvailabilitySettings = z.output<typeof availabilitySettingsSchema>;
export type BlockedPeriodInput = z.input<typeof blockedPeriodSchema>;

export const defaultAvailabilitySettings: AvailabilitySettings = {
  slotMinutes: 30,
  bufferMinutes: 0,
  horizonDays: 28,
  minNoticeHours: 24,
  consultationTypes: ["in_person", "phone", "video"],
  rules: Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    active: weekday !== 0,
    startTime: "10:00",
    endTime: "18:00",
  })),
};
