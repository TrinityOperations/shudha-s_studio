import "server-only";
import { and, asc, eq, gte, lt, ne } from "drizzle-orm";
import { db, type Db } from "@/db";
import {
  availabilityRules,
  blockedPeriods,
  bookings,
  bookingSettings,
  products,
} from "@/db/schema";
import { generateSlots, type BookingSlot } from "@/lib/booking";
import {
  availabilitySettingsSchema,
  defaultAvailabilitySettings,
  type AvailabilitySettings,
} from "@/lib/validators/availability";

type Executor = Db | Parameters<Parameters<Db["transaction"]>[0]>[0];

export type BlockedPeriod = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  reason: string | null;
};

export async function getAvailabilitySettings(
  executor: Executor = db,
): Promise<AvailabilitySettings> {
  const [settingRows, rules] = await Promise.all([
    executor.select().from(bookingSettings).where(eq(bookingSettings.id, 1)).limit(1),
    executor.select().from(availabilityRules).orderBy(asc(availabilityRules.weekday)),
  ]);
  if (!rules.length) return defaultAvailabilitySettings;
  const row = settingRows[0];
  const parsed = availabilitySettingsSchema.safeParse({
    slotMinutes: row?.slotMinutes ?? defaultAvailabilitySettings.slotMinutes,
    bufferMinutes: row?.bufferMinutes ?? defaultAvailabilitySettings.bufferMinutes,
    horizonDays: row?.horizonDays ?? defaultAvailabilitySettings.horizonDays,
    minNoticeHours: row?.minNoticeHours ?? defaultAvailabilitySettings.minNoticeHours,
    consultationTypes: row?.consultationTypes ?? defaultAvailabilitySettings.consultationTypes,
    rules: Array.from({ length: 7 }, (_, weekday) => {
      const rule = rules.find((item) => item.weekday === weekday);
      return rule
        ? {
            weekday,
            active: rule.active,
            startTime: rule.startTime.slice(0, 5),
            endTime: rule.endTime.slice(0, 5),
          }
        : { ...defaultAvailabilitySettings.rules[weekday], active: false };
    }),
  });
  return parsed.success ? parsed.data : defaultAvailabilitySettings;
}

export async function listBlockedPeriods(executor: Executor = db): Promise<BlockedPeriod[]> {
  return executor
    .select({
      id: blockedPeriods.id,
      startsAt: blockedPeriods.startsAt,
      endsAt: blockedPeriods.endsAt,
      reason: blockedPeriods.reason,
    })
    .from(blockedPeriods)
    .orderBy(asc(blockedPeriods.startsAt));
}

export async function listBookingProducts() {
  return db
    .select({
      id: products.id,
      slug: products.slug,
      title: products.title,
      titleBn: products.titleBn,
    })
    .from(products)
    .where(eq(products.status, "published"))
    .orderBy(asc(products.title));
}

export async function getAvailableSlots(
  now = new Date(),
  executor: Executor = db,
): Promise<BookingSlot[]> {
  const settings = await getAvailabilitySettings(executor);
  const end = new Date(now.getTime() + (settings.horizonDays + 2) * 86_400_000);
  const [blocks, existing] = await Promise.all([
    executor
      .select({ startsAt: blockedPeriods.startsAt, endsAt: blockedPeriods.endsAt })
      .from(blockedPeriods)
      .where(and(lt(blockedPeriods.startsAt, end), gte(blockedPeriods.endsAt, now))),
    executor
      .select({ startsAt: bookings.startsAt, endsAt: bookings.endsAt })
      .from(bookings)
      .where(
        and(
          ne(bookings.status, "cancelled"),
          lt(bookings.startsAt, end),
          gte(bookings.endsAt, now),
        ),
      ),
  ]);
  return generateSlots({
    now,
    settings,
    rules: settings.rules,
    blockedPeriods: blocks,
    bookings: existing,
  });
}
