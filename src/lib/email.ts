import "server-only";
import { render } from "@react-email/components";
import type { ReactElement } from "react";
import { Resend } from "resend";
import { serverEnv } from "@/lib/env";

export type EmailAttachment = { filename: string; content: string | Buffer; contentType: string };

export type SendEmailInput = {
  to: string;
  subject: string;
  react: ReactElement;
  /** Plain-text alternative; derived from `react` when omitted. */
  text?: string;
  attachments?: EmailAttachment[];
  replyTo?: string;
  /** For the dry-run log line only. */
  templateName?: string;
};

export type SendEmailResult =
  { ok: true; id?: string; dryRun?: true } | { ok: false; error: string };

/**
 * Dry run (log, don't send) when EMAIL_DRY_RUN=1, under NODE_ENV=test, or when RESEND_API_KEY is
 * not a real "re_…" key, so a dev project never emails anyone by accident (DECISIONS.md 2026-10-08).
 */
export function isEmailDryRun(): boolean {
  const env = serverEnv();
  return (
    env.EMAIL_DRY_RUN === "1" ||
    process.env.NODE_ENV === "test" ||
    !env.RESEND_API_KEY.startsWith("re_")
  );
}

let client: Resend | undefined;

/** Never throws: callers decide what a failed email means (usually: log and carry on). */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  try {
    const env = serverEnv();
    if (isEmailDryRun()) {
      console.info(
        `[email] dry run: to=${input.to} subject="${input.subject}" template=${input.templateName ?? "unknown"}`,
      );
      return { ok: true, dryRun: true };
    }
    const text = input.text ?? (await render(input.react, { plainText: true }));
    client ??= new Resend(env.RESEND_API_KEY);
    const { data, error } = await client.emails.send({
      from: env.EMAIL_FROM,
      to: input.to,
      subject: input.subject,
      react: input.react,
      text,
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
      ...(input.attachments?.length
        ? {
            attachments: input.attachments.map((a) => ({
              filename: a.filename,
              content: a.content,
              contentType: a.contentType,
            })),
          }
        : {}),
    });
    if (error) {
      console.error(
        `[email] send failed: to=${input.to} subject="${input.subject}" ${error.message}`,
      );
      return { ok: false, error: error.message };
    }
    return { ok: true, id: data?.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[email] send threw: to=${input.to} ${message}`);
    return { ok: false, error: message };
  }
}
