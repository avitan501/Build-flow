import { NextResponse } from "next/server";

import { callAbcBridge } from "@/lib/abc-supply/bridge";
import { requireAdminProfile } from "@/lib/auth";
import { captureOperationalError } from "@/lib/monitoring/capture-operational-error";

export const runtime = "nodejs";
export const preferredRegion = "iad1";

export async function GET() {
  await requireAdminProfile();
  try {
    const payload = await callAbcBridge({ action: "branches", state: "NY" });
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    await captureOperationalError(error, {
      feature: "supplier-pricing",
      operation: "list-branches",
      provider: "abc-supply",
      safeCode: "abc-branches-failed",
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ABC New York branch lookup failed." },
      { status: 502, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
}
