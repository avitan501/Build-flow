import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

function sanitizeNextPath(value: string | null) {
  if (!value) return "/";
  if (!value.startsWith("/")) return "/";
  if (value.startsWith("//")) return "/";
  return value;
}

function buildLoginRedirect(origin: string, next: string, errorMessage: string) {
  const loginUrl = new URL("/login", origin);

  if (next !== "/") {
    loginUrl.searchParams.set("next", next);
  }

  loginUrl.searchParams.set("error", errorMessage);
  return loginUrl;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = sanitizeNextPath(requestUrl.searchParams.get("next"));
  const oauthError = requestUrl.searchParams.get("error_description") || requestUrl.searchParams.get("error");

  if (oauthError) {
    console.warn("Google OAuth callback returned an error", { error: oauthError, next });
    return NextResponse.redirect(buildLoginRedirect(requestUrl.origin, next, oauthError));
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }

    console.warn("Google OAuth session exchange failed", { error: error.message, next });
    return NextResponse.redirect(buildLoginRedirect(requestUrl.origin, next, error.message));
  }

  console.warn("Google OAuth callback missing code", { next });
  return NextResponse.redirect(buildLoginRedirect(requestUrl.origin, next, "Missing Google sign-in code. Please try again."));
}
