import { notifyManagersSafely } from "@/lib/manager-push-notifications";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

type TwoChatCallPayload = {
  uuid?: string;
  direction?: "I" | "O";
  status?: string;
  from?: string;
  to_number?: string;
  duration?: number;
  recording_url?: string;
};

function response(body: string, status: number) {
  return new Response(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("token") || "";
  if (!/^[a-f0-9]{64}$/i.test(token)) return response("Invalid webhook token", 401);
  const rawBody = await request.text();
  let payload: TwoChatCallPayload;
  try { payload = JSON.parse(rawBody) as TwoChatCallPayload; } catch { return response("Invalid JSON", 400); }
  if (!payload.uuid) return response("Call ID is required", 400);

  const { url, anonKey } = getSupabasePublicEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceRoleKey) return response("Service unavailable", 503);
  const brokerResponse = await fetch(`${url}/functions/v1/aura-messaging-broker?mode=2chat-call-webhook`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      "x-avantia-2chat-token": token,
    },
    body: rawBody,
    cache: "no-store",
  });
  if (!brokerResponse.ok) return response("Event rejected", brokerResponse.status === 401 ? 401 : 503);

  const incoming = payload.direction === "I";
  const completed = ["completed", "missed", "failed"].includes(payload.status?.toLowerCase() || "");
  const counterparty = incoming ? payload.from : payload.to_number;
  if (incoming || completed) {
    await notifyManagersSafely({
      eventType: "call_message",
      title: incoming && !completed ? "Incoming business call" : payload.recording_url ? "Call recording ready" : "Business call updated",
      body: `${counterparty || "Unknown number"}${payload.duration ? ` · ${payload.duration}s` : ""}`,
      href: `/admin/communications?channel=call&q=${encodeURIComponent(counterparty || "")}`,
      tag: `avantia-2chat-call-${payload.uuid}-${payload.status || "update"}`,
    });
  }
  return response("EVENT_RECEIVED", 200);
}
