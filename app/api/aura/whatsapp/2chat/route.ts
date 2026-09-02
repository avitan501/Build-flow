import { processAuraOwnerCommand } from "@/lib/aura/owner-command";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

type TwoChatWebhookPayload = {
  id?: string;
  uuid?: string;
  sent_by?: string;
  remote_phone_number?: string;
  message?: { text?: string };
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

async function forwardToSecureAuraBroker(rawBody: string, token: string) {
  const { url, anonKey } = getSupabasePublicEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceRoleKey) return false;

  const brokerResponse = await fetch(`${url}/functions/v1/aura-messaging-broker?mode=2chat-webhook`, {
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
  return brokerResponse.ok;
}

export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("token") || "";
  if (!/^[a-f0-9]{64}$/i.test(token)) return response("Invalid webhook token", 401);

  const rawBody = await request.text();
  let payload: TwoChatWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as TwoChatWebhookPayload;
  } catch {
    return response("Invalid JSON", 400);
  }

  try {
    if (!await forwardToSecureAuraBroker(rawBody, token)) return response("Invalid webhook token", 401);

    const incoming = payload.sent_by === "user";
    const from = payload.remote_phone_number || "";
    const body = payload.message?.text?.trim() || "";
    const externalMessageId = payload.uuid || payload.id || "";
    if (incoming && from && externalMessageId) {
      if (body) {
        await processAuraOwnerCommand({
          from,
          body,
          externalMessageId,
          rawPayload: payload,
        });
      }
    }
    return response("EVENT_RECEIVED", 200);
  } catch {
    return response("Processing failed", 503);
  }
}
