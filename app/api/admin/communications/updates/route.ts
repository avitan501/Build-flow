import { NextResponse } from "next/server";

import { getSessionWithProfile } from "@/lib/auth";
import { normalizeAuraCommunications } from "@/lib/aura/dashboard";
import { managerCapabilities } from "@/lib/owner-identity";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function safeCursor(value: string | null) {
  if (!value) return new Date(Date.now() - 60_000).toISOString();
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return null;
  return new Date(Math.max(time, Date.now() - 24 * 60 * 60 * 1000)).toISOString();
}

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

  const cursor = safeCursor(new URL(request.url).searchParams.get("after"));
  if (!cursor) return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });

  const { data, error } = await session.supabase.functions.invoke<{
    ok?: boolean;
    communications?: unknown[];
  }>("aura-messaging-broker", {
    body: { action: "load_communication_updates", after: cursor },
  });

  if (error || !data?.ok)
    return NextResponse.json(
      { error: "Communication updates are temporarily unavailable." },
      { status: 503 },
    );

  const communications = normalizeAuraCommunications(data.communications);
  const nextCursor = communications.reduce(
    (latest, item) => item.last_event_at && item.last_event_at > latest ? item.last_event_at : latest,
    cursor,
  );
  const response = NextResponse.json({ communications, cursor: nextCursor });
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Server-Timing", `communications-delta;dur=${Math.round(performance.now() - startedAt)}`);
  return response;
}
