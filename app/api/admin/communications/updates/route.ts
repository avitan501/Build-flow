import { NextResponse } from "next/server";

import { getSessionWithProfile } from "@/lib/auth";
import { normalizeAuraCommunications } from "@/lib/aura/dashboard";
import { loadAuraCommunicationLinks } from "@/lib/aura/email-links";
import { managerCapabilities } from "@/lib/owner-identity";
import { createAdminClient } from "@/lib/supabase/admin";

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
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const access = managerCapabilities({
    email: session.user.email || session.profile?.email,
    role: session.profile?.role,
    approvalStatus: session.profile?.approval_status,
    isActive: session.profile?.is_active,
  });
  if (!access.customers) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const cursor = safeCursor(new URL(request.url).searchParams.get("after"));
  if (!cursor) return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("aura_communications")
    .select("id, contact_id, provider, channel, direction, counterparty_phone, counterparty_email, subject, body, summary, transcript, next_steps, media, status, duration_seconds, occurred_at, last_event_at, mailbox_address, message_id, in_reply_to, read_at")
    .gt("last_event_at", cursor)
    .order("last_event_at", { ascending: true })
    .limit(250);

  if (error)
    return NextResponse.json(
      { error: "Communication updates are temporarily unavailable." },
      { status: 503 },
    );

  const normalized = normalizeAuraCommunications(data);
  const links = await loadAuraCommunicationLinks(normalized.map((communication) => communication.id), admin);
  const linksByCommunication = new Map<string, typeof links>();
  for (const link of links)
    linksByCommunication.set(link.communication_id, [...(linksByCommunication.get(link.communication_id) ?? []), link]);
  const communications = normalized.map((communication) => ({
    ...communication,
    links: linksByCommunication.get(communication.id) ?? communication.links ?? [],
  }));
  const nextCursor = communications.reduce(
    (latest, item) => item.last_event_at && item.last_event_at > latest ? item.last_event_at : latest,
    cursor,
  );
  const response = NextResponse.json({ communications, cursor: nextCursor });
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Server-Timing", `communications-delta;dur=${Math.round(performance.now() - startedAt)}`);
  return response;
}
