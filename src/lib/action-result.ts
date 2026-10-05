import type { MessageKey } from "@/lib/i18n/t";

export type FieldErrors = Record<string, string[] | undefined>;

/**
 * Every server action returns this. `error` and all field messages are i18n keys
 * so the client renders them through t().
 */
export type ActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: MessageKey; fieldErrors?: FieldErrors };

export function ok(): ActionResult<undefined>;
export function ok<T>(data: T): ActionResult<T>;
export function ok<T>(data?: T): ActionResult<T> {
  return { ok: true, data: data as T };
}

export function fail(error: MessageKey, fieldErrors?: FieldErrors): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}
