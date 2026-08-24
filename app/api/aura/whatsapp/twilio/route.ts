import { processAuraOwnerCommand } from "@/lib/aura/owner-command";
import {
  processTwilioWhatsAppWebhook,
  verifyTwilioWhatsAppRequest,
} from "@/lib/aura/twilio-whatsapp";
import { notifyManagersSafely } from "@/lib/manager-push-notifications";

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

export async function POST(request: Request) {
  const signature = request.headers.get("x-twilio-signature");
  if (!signature) return twimlResponse(401);
  const rawBody = await request.text();
  const params = new URLSearchParams(rawBody);
  if (!verifyTwilioWhatsAppRequest(request.url, signature, params)) return twimlResponse(401);

  try {
    await processTwilioWhatsAppWebhook(params);

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
