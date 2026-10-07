/**
 * Hourly trigger for the day-before reminders (PW-36). Calls the app's protected route with the
 * cron secret; the route does the work and is idempotent. NOTE: the project is not connected to
 * Netlify yet, so this scheduled function is untested there. It needs NEXT_PUBLIC_SITE_URL and
 * CRON_SECRET in the Netlify environment.
 */
export default async function reminders(): Promise<Response> {
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  const secret = process.env.CRON_SECRET;
  if (!site || !secret) {
    console.error("[reminders] NEXT_PUBLIC_SITE_URL or CRON_SECRET is not set");
    return new Response("not configured", { status: 500 });
  }
  const response = await fetch(`${site}/api/cron/reminders`, {
    method: "POST",
    headers: { authorization: `Bearer ${secret}` },
  });
  const body = await response.text();
  console.info(`[reminders] ${response.status} ${body}`);
  return new Response(body, { status: response.status });
}

export const config = { schedule: "@hourly" };
