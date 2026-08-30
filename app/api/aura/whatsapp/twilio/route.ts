import { processAuraOwnerCommand } from "@/lib/aura/owner-command";
import {
  canUseTwilioWhatsApp,
  processTwilioWhatsAppWebhook,
  verifyTwilioWhatsAppRequest,
} from "@/lib/aura/twilio-whatsapp";
import { notifyManagersSafely } from "@/lib/manager-push-notifications";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function escapeXml(value: string) {
  return value.replace(/[<>&"']/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[character] || character);
}

function twimlResponse(status = 200, message = "") {
  const body = message ? `<Response><Message>${escapeXml(message.slice(0, 3900))}</Message></Response>` : "<Response></Response>";
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>${body}`, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/xml; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function forwardToSecureAuraBroker(request: Request, signature: string, rawBody: string) {
  const { url, anonKey } = getSupabasePublicEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceRoleKey) return false;

  const response = await fetch(`${url}/functions/v1/aura-messaging-broker?mode=twilio-webhook`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "x-avantia-canonical-url": request.url,
      "x-twilio-signature": signature,
    },
    body: rawBody,
    cache: "no-store",
  });
  return response.ok;
}

export async function POST(request: Request) {
  const signature = request.headers.get("x-twilio-signature");
  if (!signature) return twimlResponse(401);
  const rawBody = await request.text();
  const params = new URLSearchParams(rawBody);

  let storedByBroker = false;
  if (canUseTwilioWhatsApp()) {
    if (!verifyTwilioWhatsAppRequest(request.url, signature, params)) return twimlResponse(401);
    try {
      storedByBroker = await forwardToSecureAuraBroker(request, signature, rawBody);
    } catch {
      // The verified local persistence path remains available if the broker is
      // temporarily unavailable. Shadow analysis must never block WhatsApp.
      storedByBroker = false;
    }
  } else {
    try {
      storedByBroker = await forwardToSecureAuraBroker(request, signature, rawBody);
    } catch {
      return twimlResponse(503);
    }
    if (!storedByBroker) return twimlResponse(401);
  }

  try {
    if (!storedByBroker) await processTwilioWhatsAppWebhook(params);

    const from = (params.get("From") || "").replace(/^whatsapp:/i, "");
    const body = (params.get("Body") || "").trim();
    const externalMessageId = params.get("MessageSid") || params.get("SmsSid") || "";
    if (from && body && externalMessageId) {
      await notifyManagersSafely({
        eventType: "call_message",
        title: "New WhatsApp message",
        body: `${from} · ${body.slice(0, 160)}`,
        href: "/admin/communications?channel=whatsapp",
        tag: `avantia-whatsapp-${externalMessageId}`,
      });
    }
    const reply = await processAuraOwnerCommand({
      from,
      body,
      externalMessageId,
      rawPayload: Object.fromEntries(params.entries()),
    });
    return twimlResponse(200, reply || "");
  } catch {
    return twimlResponse(503);
  }
}
