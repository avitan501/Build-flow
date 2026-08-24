import { getSupabasePublicEnv } from "@/lib/supabase/env";
import {
  buildAuraPreview,
  cancelAuraIntakeByCode,
  confirmAuraIntakeByCode,
  createAuraIntake,
} from "@/lib/aura/intake";
import { notifyManagersSafely } from "@/lib/manager-push-notifications";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const OWNER_ADD_PHONE = process.env.AURA_OWNER_ADD_PHONE || "+13475675077";

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
  const { url, anonKey } = getSupabasePublicEnv();
  try {
    const response = await fetch(`${url}/functions/v1/aura-messaging-broker?mode=twilio-webhook`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Avantia-Canonical-Url": request.url,
        "X-Twilio-Signature": signature,
      },
      body: rawBody,
      cache: "no-store",
    });
    if (!response.ok) return twimlResponse(response.status);

    const params = new URLSearchParams(rawBody);
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
    if (from !== OWNER_ADD_PHONE || !body || !externalMessageId) return twimlResponse();

    const command = /^(CONFIRM|CANCEL)\s+([A-Z0-9]{4,12})$/i.exec(body);
    if (command) {
      const result = command[1].toUpperCase() === "CONFIRM"
        ? await confirmAuraIntakeByCode(command[2])
        : await cancelAuraIntakeByCode(command[2]);
      return twimlResponse(200, result.ok
        ? command[1].toUpperCase() === "CONFIRM" ? "Saved in Aura." : "Cancelled. Nothing was saved."
        : "Aura could not find an active draft with that code.");
    }

    if (!/^add(?:\s|:|-)/i.test(body)) return twimlResponse();
    const requestText = body.replace(/^add(?:\s|:|-)*/i, "").trim();
    if (!requestText) return twimlResponse(200, "Write ADD followed by the client, lead, task, or material request details.");
    const intake = await createAuraIntake({
      externalMessageId,
      senderPhone: from,
      messageType: "text",
      messageText: requestText,
      rawPayload: Object.fromEntries(params.entries()),
    });
    return twimlResponse(200, buildAuraPreview(intake.proposal, intake.code));
  } catch {
    return twimlResponse(503);
  }
}
