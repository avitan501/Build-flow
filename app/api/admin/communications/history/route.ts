import { NextResponse } from "next/server";

import { getSessionWithProfile } from "@/lib/auth";
import {
  loadCommunicationHistoryPage,
} from "@/lib/aura/communication-history";
import { parseCommunicationHistoryCursor } from "@/lib/aura/communication-history-cursor";
import { managerCapabilities } from "@/lib/owner-identity";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VALID_CHANNELS = new Set(["all", "call", "sms", "whatsapp", "email"]);

export async function GET(request: Request) {
  const startedAt = performance.now();
  const session = await getSessionWithProfile();
  if (!session.user || !session.supabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const access = managerCapabilities({
    email: session.user.email || session.profile?.email,
    role: session.profile?.role,
    approvalStatus: session.profile?.approval_status,
    isActive: session.profile?.is_active,
  });
  if (!access.customers) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parameters = new URL(request.url).searchParams;
  const cursor = parameters.get("cursor");
  if (cursor && !parseCommunicationHistoryCursor(cursor))
    return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
  const requestedChannel = parameters.get("channel") || "all";
  if (!VALID_CHANNELS.has(requestedChannel))
    return NextResponse.json({ error: "Invalid channel" }, { status: 400 });
  const requestedLimit = Number(parameters.get("limit") || 80);
  if (!Number.isFinite(requestedLimit))
    return NextResponse.json({ error: "Invalid limit" }, { status: 400 });

  try {
    const page = await loadCommunicationHistoryPage({
      cursor,
      pageSize: requestedLimit,
      channel: requestedChannel === "all" ? null : requestedChannel,
      phone: parameters.get("phone"),
      email: parameters.get("email"),
      query: parameters.get("q"),
    }, session.supabase);
    const response = NextResponse.json(page);
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Server-Timing", `communications-history;dur=${Math.round(performance.now() - startedAt)}`);
    return response;
  } catch {
    return NextResponse.json(
      { error: "Communication history is temporarily unavailable." },
      { status: 503 },
    );
  }
}
