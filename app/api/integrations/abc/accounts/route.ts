import { NextResponse } from "next/server";

import { callAbcBridge } from "@/lib/abc-supply/bridge";

export const runtime = "nodejs";
export const preferredRegion = "iad1";

export async function GET() {
  try {
    const payload = await callAbcBridge({ action: "accounts" });
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "ABC account lookup failed." }, { status: 502, headers: { "Cache-Control": "no-store, max-age=0" } });
  }
}
