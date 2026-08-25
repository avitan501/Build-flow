import { NextResponse } from "next/server";

import { callAbcBridge } from "@/lib/abc-supply/bridge";
import { requireSignedInProfile } from "@/lib/auth";

export const runtime = "nodejs";
export const preferredRegion = "iad1";

export async function GET(request: Request) {
  await requireSignedInProfile();
  try {
    const payload = await callAbcBridge({ action: "startOAuth" });
    const authorizationUrl = typeof payload?.authorizationUrl === "string" ? payload.authorizationUrl : "";
    if (!authorizationUrl.startsWith("https://")) throw new Error("ABC did not return a secure authorization address.");
    return NextResponse.redirect(authorizationUrl);
  } catch {
    return NextResponse.redirect(new URL("/account/abc?abc=connection-failed", request.url));
  }
}
