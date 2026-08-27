import { NextResponse } from "next/server";

import { getAbcBridgeCallbackUrl } from "@/lib/abc-supply/bridge";

export const runtime = "nodejs";
export const preferredRegion = "iad1";

function accountRedirect(request: Request, result: string) {
  return NextResponse.redirect(new URL(`/account/abc?abc=${encodeURIComponent(result)}`, request.url));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (!url.searchParams.get("error") && (!url.searchParams.get("code") || !url.searchParams.get("state"))) {
    return accountRedirect(request, "invalid-flow");
  }
  try {
    // ABC is registered to this stable production alias. The bridge owns the
    // one-time state, PKCE exchange, and encrypted token storage, so callback
    // completion must not depend on a browser cookie for this separate host.
    const callbackParams = new URLSearchParams();
    for (const name of ["error", "error_description", "code", "state"]) {
      const value = url.searchParams.get(name);
      if (value) callbackParams.set(name, value);
    }
    return NextResponse.redirect(getAbcBridgeCallbackUrl(callbackParams), 307);
  } catch {
    return accountRedirect(request, "connection-failed");
  }
}
