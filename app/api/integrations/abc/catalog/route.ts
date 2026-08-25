import { NextResponse } from "next/server";

import { callAbcBridge } from "@/lib/abc-supply/bridge";
import { requireAdminProfile } from "@/lib/auth";

export const runtime = "nodejs";
export const preferredRegion = "iad1";

export async function POST(request: Request) {
  await requireAdminProfile();
  try {
    const body = await request.json() as { query?: unknown; branchNumber?: unknown };
    const query = String(body.query || "").trim();
    const branchNumber = String(body.branchNumber || "").trim();
    if (query.length < 2 || !branchNumber) {
      return NextResponse.json({ error: "Select a branch and enter at least two letters." }, { status: 400 });
    }
    const payload = await callAbcBridge({ action: "searchItems", query, branchNumber });
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ABC product search failed." },
      { status: 502, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
}
