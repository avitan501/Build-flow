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

function getSafeErrorMessage(errorMessage: string) {
  const normalized = errorMessage.toLowerCase();

  if (normalized.includes("pkce") || normalized.includes("code verifier")) {
    return "That sign-in attempt expired. Start again on the login page.";
  }

  if (errorMessage.includes("Unable to exchange external code")) {
    return "Google sign-in reached Supabase, but Supabase could not exchange the Google code. Please try again.";
  }

  return errorMessage;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = sanitizeNextPath(requestUrl.searchParams.get("next"));
  const oauthError = requestUrl.searchParams.get("error_description") || requestUrl.searchParams.get("error");

  if (oauthError) {
    const safeError = getSafeErrorMessage(oauthError);
    console.warn("Google OAuth callback returned an error", { error: safeError, next });
    return NextResponse.redirect(buildLoginRedirect(requestUrl.origin, next, safeError));
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }

    const safeError = getSafeErrorMessage(error.message);
    console.warn("Google OAuth session exchange failed", { error: safeError, next });
    return NextResponse.redirect(buildLoginRedirect(requestUrl.origin, next, safeError));
  }

  console.warn("Google OAuth callback missing code", { next });
  return NextResponse.redirect(buildLoginRedirect(requestUrl.origin, next, "Missing Google sign-in code. Please try again."));
}
