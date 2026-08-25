import { NextResponse } from "next/server";

import { requireAdminProfile } from "@/lib/auth";
import { callAbcBridge } from "@/lib/abc-supply/bridge";

export const runtime = "nodejs";
export const preferredRegion = "iad1";

export async function GET() {
  await requireAdminProfile();
  try {
    const payload = await callAbcBridge({ action: "accounts" });
    const accounts = Array.isArray(payload) ? payload : payload?.accounts;
    if (!Array.isArray(accounts) || accounts.length === 0) {
      return NextResponse.json({ error: "ABC Sandbox did not return an enrolled Ship-To account. Ask ABC to attach its test account to AvantiaBuild Source System ID 798." }, { status: 502, headers: { "Cache-Control": "no-store, max-age=0" } });
    }
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "ABC account lookup failed." }, { status: 502, headers: { "Cache-Control": "no-store, max-age=0" } });
  }
}
