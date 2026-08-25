import { NextResponse } from "next/server";

import { callAbcBridge } from "@/lib/abc-supply/bridge";
import { requireSignedInProfile } from "@/lib/auth";

export const runtime = "nodejs";
export const preferredRegion = "iad1";

export async function POST(request: Request) {
  await requireSignedInProfile();
  await callAbcBridge({ action: "disconnect" });
  return NextResponse.redirect(new URL("/account/abc?abc=disconnected", request.url), 303);
}
