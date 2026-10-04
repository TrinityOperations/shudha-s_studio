// Pure helper shared by proxy.ts (Node runtime, no next/headers) and lib/auth.ts.
export function isOwnerEmail(
  email: string | null | undefined,
  ownerEmail: string | undefined = process.env.OWNER_EMAIL,
): boolean {
  if (!email || !ownerEmail) return false;
  return email.trim().toLowerCase() === ownerEmail.trim().toLowerCase();
}
