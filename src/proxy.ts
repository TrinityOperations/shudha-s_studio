import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env.public";
import { isOwnerEmail } from "@/lib/owner";

const LOGIN_PATH = "/admin/login";

/**
 * Next.js 16 proxy (formerly middleware). Refreshes the Supabase session cookie and keeps
 * non-owners out of /admin. This is the first gate only: every admin page and action also
 * calls requireOwner() (src/lib/auth.ts).
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // getUser() validates the token with Supabase Auth on every admin request. Fine for one owner.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isOwner = !!user && isOwnerEmail(user.email);
  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === LOGIN_PATH;

  if (!isOwner && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    url.search = "";
    url.searchParams.set("next", pathname);
    return withCookies(NextResponse.redirect(url), response);
  }

  if (isOwner && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return withCookies(NextResponse.redirect(url), response);
  }

  return response;
}

/** Carry refreshed session cookies over to a redirect response. */
function withCookies(target: NextResponse, source: NextResponse) {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
  return target;
}

export const config = {
  matcher: ["/admin/:path*"],
};
