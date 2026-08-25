import { NextResponse } from "next/server";

import { callAbcBridge } from "@/lib/abc-supply/bridge";
import { requireAdminProfile } from "@/lib/auth";

export const runtime = "nodejs";
export const preferredRegion = "iad1";

export async function GET() {
  await requireAdminProfile();
  try {
    const payload = await callAbcBridge({ action: "branches", state: "NY" });
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ABC New York branch lookup failed." },
      { status: 502, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
}
