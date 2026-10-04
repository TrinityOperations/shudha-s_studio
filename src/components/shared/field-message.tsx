"use client";
import type { FieldError as RhfFieldError } from "react-hook-form";
import { FieldError } from "@/components/ui/field";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/t";

/** Renders a React Hook Form error whose message is an i18n key (see validators/common.ts). */
export function FieldMessage({ error, id }: { error?: RhfFieldError; id?: string }) {
  const t = useT();
  if (!error?.message) return null;
  return <FieldError id={id}>{t(error.message as MessageKey)}</FieldError>;
}
