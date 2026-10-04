import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/owner";

export const LOGIN_PATH = "/admin/login";

/** The signed-in owner, or null. Memoised per request. */
export const getOwner = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isOwnerEmail(user.email)) return null;
  return user;
});

/**
 * Call at the top of every admin page, layout and admin server action.
 * proxy.ts is the first line of defence; this is the real one.
 */
export async function requireOwner() {
  const owner = await getOwner();
  if (!owner) redirect(LOGIN_PATH);
  return owner;
}
