import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabasePublicEnv, hasSupabasePublicEnv } from "@/lib/supabase/env";

const PROTECTED_PATH_PREFIXES = [
  "/dashboard",
  "/projects",
  "/orders",
  "/quotes",
  "/upload",
  "/materials",
  "/takeoff-review",
  "/admin",
  "/owner",
];

const CLIENT_HOME_REDIRECT_PATHS = new Set(["/dashboard"]);

const AUTH_PAGES = new Set(["/login", "/signup"]);

function isProtectedPath(pathname: string) {
  if (pathname === "/projects") return false;
  if (pathname === "/projects/new") return false;
  return PROTECTED_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function sanitizeNextPath(value: string | null | undefined) {
  if (!value) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  return value;
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const { pathname, search } = request.nextUrl;

  if (!hasSupabasePublicEnv()) {
    if (!isProtectedPath(pathname)) return response;

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  const { url, anonKey } = getSupabasePublicEnv();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, cacheHeaders) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
        Object.entries(cacheHeaders).forEach(([name, value]) => {
          response.headers.set(name, value);
        });
      },
    },
  });

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const isSignedIn = Boolean(!claimsError && claimsData?.claims?.sub);

  function redirectWithAuthState(url: URL) {
    const redirectResponse = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    for (const name of ["cache-control", "expires", "pragma"]) {
      const value = response.headers.get(name);
      if (value) redirectResponse.headers.set(name, value);
    }
    return redirectResponse;
  }

  if (!isSignedIn && isProtectedPath(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return redirectWithAuthState(loginUrl);
  }

  if (isSignedIn && AUTH_PAGES.has(pathname)) {
    const nextPath = sanitizeNextPath(request.nextUrl.searchParams.get("next")) ?? "/";
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = nextPath;
    redirectUrl.search = "";

    if (nextPath.includes("?")) {
      const [targetPath, targetSearch = ""] = nextPath.split("?");
      redirectUrl.pathname = targetPath;
      redirectUrl.search = targetSearch ? `?${targetSearch}` : "";
    }

    return redirectWithAuthState(redirectUrl);
  }

  if (isSignedIn && CLIENT_HOME_REDIRECT_PATHS.has(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    redirectUrl.search = "";
    return redirectWithAuthState(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
