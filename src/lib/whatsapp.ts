/**
 * WhatsApp click-to-chat helpers (SRS PW-30, PW-34, PW-35, PW-47, OD-24).
 * We only build `wa.me` links; the app never calls a WhatsApp or Meta API (DECISIONS 2026-10-07).
 * Pure functions, safe on client and server.
 */

/**
 * Normalises a phone number to the international digits-only form `wa.me` needs
 * (e.g. "0412 345 678" → "61412345678", "+880 1711-123456" → "8801711123456").
 * Local numbers are assumed to be Australian. Returns null when the result can't be a valid number.
 */
export function normaliseWhatsAppNumber(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!/^[+\d\s\-().]+$/.test(trimmed)) return null;

  let digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+")) {
    // Already international.
  } else if (digits.startsWith("00")) {
    digits = digits.slice(2);
  } else if (digits.length === 10 && digits.startsWith("0")) {
    // Australian number with the trunk 0: 04xx xxx xxx or 0X xxxx xxxx.
    digits = `61${digits.slice(1)}`;
  } else if (digits.length === 9 && digits.startsWith("4")) {
    // Australian mobile typed without the leading 0.
    digits = `61${digits}`;
  }

  // E.164 allows at most 15 digits; anything under 8 is not a real international number.
  if (digits.length < 8 || digits.length > 15 || digits.startsWith("0")) return null;
  return digits;
}

/** Click-to-chat link, optionally with a prefilled message. Null when the number is invalid. */
export function whatsappLink(number: string | null | undefined, message?: string): string | null {
  const normalised = normaliseWhatsAppNumber(number);
  if (!normalised) return null;
  const text = message?.trim();
  return text
    ? `https://wa.me/${normalised}?text=${encodeURIComponent(text)}`
    : `https://wa.me/${normalised}`;
}
