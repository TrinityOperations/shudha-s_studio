import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { runReminderJob } from "@/lib/booking/reminders";
import { serverEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

function authorised(request: Request, secret: string): boolean {
  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * PW-36: day-before reminders. Called hourly by netlify/functions/reminders.mts with
 * `Authorization: Bearer <CRON_SECRET>`. GET is allowed too so it can be triggered by hand.
 */
async function handle(request: Request) {
  const secret = serverEnv().CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not set" }, { status: 503 });
  if (!authorised(request, secret))
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const result = await runReminderJob();
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  return handle(request);
}

export async function GET(request: Request) {
  return handle(request);
}
