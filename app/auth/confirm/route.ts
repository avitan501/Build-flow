import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

function safeNext(value: string | null) {
  if (!value?.startsWith("/") || value.startsWith("//")) return "/requests";
  return value.startsWith("/requests") ? value : "/requests";
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(requestUrl.searchParams.get("next"));
  const supabase = await createClient();
  const before = await supabase.auth.getUser();

  if (!tokenHash || type !== "magiclink") {
    return NextResponse.redirect(new URL("/requests?access=invalid", requestUrl.origin));
  }

  const verified = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (verified.error || !verified.data.user) {
    return NextResponse.redirect(new URL("/requests?access=expired", requestUrl.origin));
  }

  const destination = new URL(next, requestUrl.origin);
  if (before.data.user && before.data.user.id !== verified.data.user.id) {
    destination.searchParams.set("account", "switched");
  }
  return NextResponse.redirect(destination);
}
