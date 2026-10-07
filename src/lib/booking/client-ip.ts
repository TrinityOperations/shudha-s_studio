/**
 * Rate-limit key for the booking action (PW-38). Netlify sets x-nf-client-connection-ip; behind
 * other proxies the last x-forwarded-for entry is the one added by the nearest trusted hop.
 */
export function clientIpFromHeaders(headers: Headers): string {
  const netlify = headers.get("x-nf-client-connection-ip")?.trim();
  if (netlify) return netlify;
  const forwarded = headers
    .get("x-forwarded-for")
    ?.split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return forwarded?.at(-1) || "unknown";
}
