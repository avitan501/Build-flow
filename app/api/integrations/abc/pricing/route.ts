import { NextResponse } from "next/server";

import { requireAdminProfile, requireSignedInProfile } from "@/lib/auth";
import { callAbcBridge } from "@/lib/abc-supply/bridge";

export const runtime = "nodejs";
export const preferredRegion = "iad1";

export async function POST(request: Request) {
  const connectedUser = new URL(request.url).searchParams.get("mode") === "connected-user";
  if (connectedUser) await requireSignedInProfile(); else await requireAdminProfile();
  try {
    const pricing = await request.json();
    if (!pricing || typeof pricing !== "object") {
      return NextResponse.json({ error: "Check the ABC pricing fields." }, { status: 400 });
    }
    const payload = await callAbcBridge({ action: "pricing", pricing: { ...pricing, serviceFeePercent: 0 }, connectionMode: connectedUser ? "connected-user" : "automatic" });
    if (!payload?.pricing || typeof payload.pricing !== "object") {
      return NextResponse.json({ error: "ABC Sandbox did not return a pricing result." }, { status: 502, headers: { "Cache-Control": "no-store, max-age=0" } });
    }
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "ABC pricing request failed." }, { status: 502, headers: { "Cache-Control": "no-store, max-age=0" } });
  }
}
