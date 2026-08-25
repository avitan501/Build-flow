import { NextResponse } from "next/server";

import { callAbcBridge } from "@/lib/abc-supply/bridge";
import { requireSignedInProfile } from "@/lib/auth";

export const runtime = "nodejs";
export const preferredRegion = "iad1";

function accountRedirect(request: Request, result: string) {
  return NextResponse.redirect(new URL(`/account/abc?abc=${encodeURIComponent(result)}`, request.url));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("error")) return accountRedirect(request, "denied");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) return accountRedirect(request, "invalid-flow");
  try {
    await requireSignedInProfile();
    await callAbcBridge({ action: "finishOAuth", code, state });
    return accountRedirect(request, "connected");
  } catch {
    return accountRedirect(request, "connection-failed");
  }
}
