import { NextResponse } from "next/server";

import { consumeAbcOAuthAttempt } from "@/lib/abc-supply/attempts";
import { saveAbcConnection } from "@/lib/abc-supply/connections";
import { exchangeAbcAuthorizationCode } from "@/lib/abc-supply/oauth";

export const runtime = "nodejs";
export const preferredRegion = "iad1";

function returnToAvantia(result: string) {
  return NextResponse.redirect(`https://build.avantiap.com/account/abc?abc=${encodeURIComponent(result)}`);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("error")) return returnToAvantia("denied");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) return returnToAvantia("invalid-flow");
  try {
    const attempt = await consumeAbcOAuthAttempt({ state });
    await saveAbcConnection(attempt.userId, await exchangeAbcAuthorizationCode({ code, verifier: attempt.verifier }));
    return returnToAvantia("connected");
  } catch (error) {
    console.error("ABC OAuth callback failed", error instanceof Error ? error.message : "Unknown error");
    return returnToAvantia("connection-failed");
  }
}
