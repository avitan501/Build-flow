import { NextResponse } from "next/server";

import { callAbcBridge } from "@/lib/abc-supply/bridge";
import { requireAdminProfile, requireSignedInProfile } from "@/lib/auth";

export const runtime = "nodejs";
export const preferredRegion = "iad1";

export async function POST(request: Request) {
  const connectedUser = new URL(request.url).searchParams.get("mode") === "connected-user";
  if (connectedUser) await requireSignedInProfile(); else await requireAdminProfile();
  try {
    const body = await request.json() as { query?: unknown; shipToNumber?: unknown; branchNumber?: unknown };
    const query = String(body.query || "").trim();
    const shipToNumber = String(body.shipToNumber || "").trim();
    const branchNumber = String(body.branchNumber || "").trim();
    if (query.length < 2 || !shipToNumber || !branchNumber) {
      return NextResponse.json({ error: "Select a Ship-To account and its branch, then enter at least two letters." }, { status: 400 });
    }
    const payload = await callAbcBridge({ action: "searchItems", query, shipToNumber, branchNumber, connectionMode: connectedUser ? "connected-user" : "automatic" });
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ABC product search failed." },
      { status: 502, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
}
