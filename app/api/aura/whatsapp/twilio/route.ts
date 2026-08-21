import { after } from "next/server";

import {
  processTwilioWhatsAppWebhook,
  verifyTwilioWhatsAppRequest,
} from "@/lib/aura/twilio-whatsapp";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function twimlResponse(status = 200) {
  return new Response("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response></Response>", {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/xml; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const params = new URLSearchParams(rawBody);
  if (!verifyTwilioWhatsAppRequest(request.url, request.headers.get("x-twilio-signature"), params)) {
    return twimlResponse(401);
  }

  after(async () => {
    await processTwilioWhatsAppWebhook(params);
  });
  return twimlResponse();
}
