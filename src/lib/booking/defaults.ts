import type { ConsultationType } from "@/db/schema";

/**
 * Defaults used until the client confirms her hours (SRS §9). Seeded once by src/db/seed.ts and
 * used at runtime only when the booking_settings row is missing. The owner changes them in
 * /admin/availability.
 */
export type BookingSettingsValues = {
  slotMinutes: number;
  bufferMinutes: number;
  horizonDays: number;
  minNoticeHours: number;
  consultationTypes: ConsultationType[];
};

export type AvailabilityRuleValues = {
  /** 0 = Sunday … 6 = Saturday, Melbourne local time */
  weekday: number;
  /** "HH:mm" wall-clock in Melbourne */
  startTime: string;
  endTime: string;
  active: boolean;
};

export const DEFAULT_BOOKING_SETTINGS: BookingSettingsValues = {
  slotMinutes: 30,
  bufferMinutes: 0,
  horizonDays: 28,
  minNoticeHours: 24,
  consultationTypes: ["in_person", "phone", "video"],
};

/** Monday to Saturday, 10:00–18:00. Sunday is absent (closed). */
export const DEFAULT_AVAILABILITY_RULES: AvailabilityRuleValues[] = [1, 2, 3, 4, 5, 6].map(
  (weekday) => ({ weekday, startTime: "10:00", endTime: "18:00", active: true }),
);

export const CONSULTATION_TYPES: ConsultationType[] = ["in_person", "phone", "video"];

/** Private bucket for customer reference images (PW-30). */
export const BOOKING_UPLOADS_BUCKET = "booking-uploads";
