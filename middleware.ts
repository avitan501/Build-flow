import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabasePublicEnv } from "@/lib/supabase/env";

const PROTECTED_PATH_PREFIXES = [
  "/dashboard",
  "/projects",
  "/orders",
  "/quotes",
  "/upload",
  "/materials",
  "/takeoff-review",
  "/admin",
];

const CLIENT_HOME_REDIRECT_PATHS = new Set(["/dashboard"]);

const AUTH_PAGES = new Set(["/login", "/signup"]);

function isProtectedPath(pathname: string) {
  return PROTECTED_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function sanitizeNextPath(value: string | null | undefined) {
  if (!value) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  return value;
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const { url, anonKey } = getSupabasePublicEnv();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  if (!user && isProtectedPath(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (user && AUTH_PAGES.has(pathname)) {
    const nextPath = sanitizeNextPath(request.nextUrl.searchParams.get("next")) ?? "/";
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = nextPath;
    redirectUrl.search = "";

    if (nextPath.includes("?")) {
      const [targetPath, targetSearch = ""] = nextPath.split("?");
      redirectUrl.pathname = targetPath;
      redirectUrl.search = targetSearch ? `?${targetSearch}` : "";
    }

    return NextResponse.redirect(redirectUrl);
  }

  if (user && CLIENT_HOME_REDIRECT_PATHS.has(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
