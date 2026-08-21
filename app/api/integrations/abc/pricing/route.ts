import { NextResponse } from "next/server";

import { requireAdminProfile } from "@/lib/auth";
import { callAbcBridge } from "@/lib/abc-supply/bridge";

export const runtime = "nodejs";
export const preferredRegion = "iad1";

export async function POST(request: Request) {
  await requireAdminProfile();
  try {
    const pricing = await request.json();
    const payload = await callAbcBridge({ action: "pricing", pricing });
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "ABC pricing request failed." }, { status: 502, headers: { "Cache-Control": "no-store, max-age=0" } });
  }
}
