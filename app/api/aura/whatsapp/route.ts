import { after } from "next/server";

import {
  buildAuraPreview,
  cancelAuraIntakeByCode,
  confirmAuraIntakeByCode,
  createAuraIntake,
  transcribeAuraAudio,
} from "@/lib/aura/intake";
import {
  downloadWhatsAppMedia,
  getWhatsAppMedia,
  getWhatsAppMessageText,
  isAuraAllowedSender,
  parseWhatsAppMessages,
  sendAuraWhatsAppText,
  storeInboundAuraWhatsApp,
  type WhatsAppInboundMessage,
  verifyWhatsAppSignature,
} from "@/lib/aura/whatsapp";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function textResponse(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const expectedToken = process.env.AURA_WHATSAPP_VERIFY_TOKEN;

  if (mode === "subscribe" && expectedToken && token === expectedToken && challenge) {
    return textResponse(challenge);
  }
  return textResponse("Forbidden", 403);
}

async function replySafely(to: string, body: string) {
  try {
    return await sendAuraWhatsAppText(to, body);
  } catch {
    return { sent: false as const, reason: "send_failed" as const };
  }
}

async function handleCommand(message: WhatsAppInboundMessage, text: string) {
  const match = /^(CONFIRM|CANCEL)\s+([A-Z0-9]{4,12})$/i.exec(text.trim());
  if (!match) return false;
  const [, command, code] = match;

  if (command.toUpperCase() === "CONFIRM") {
    const result = await confirmAuraIntakeByCode(code);
    if (result.ok) {
      await replySafely(message.from, "Saved in Aura. The contact, lead, and tasks are now available on your website.");
    } else {
      await replySafely(message.from, "Aura could not find an active draft with that confirmation code.");
    }
    return true;
  }

  const result = await cancelAuraIntakeByCode(code);
  await replySafely(
    message.from,
    result.ok ? "Cancelled. Aura did not save the draft." : "Aura could not cancel that draft.",
  );
  return true;
}

async function processInboundMessage(message: WhatsAppInboundMessage) {
  if (!message.id || !message.from) return;

  let messageText = getWhatsAppMessageText(message);
  const media = getWhatsAppMedia(message);

  if (!isAuraAllowedSender(message.from)) {
    await storeInboundAuraWhatsApp(message, messageText, media);
    return;
  }

  if (await handleCommand(message, messageText)) return;

  let image: { data: Uint8Array; mediaType: string } | undefined;
  if (media) {
    try {
      const downloaded = await downloadWhatsAppMedia(media.id);
      if (media.kind === "audio") {
        const transcript = await transcribeAuraAudio(downloaded.data);
        messageText = [messageText, transcript].filter(Boolean).join("\n").trim();
      } else {
        image = { data: downloaded.data, mediaType: downloaded.mediaType };
      }
    } catch {
      await replySafely(message.from, "Aura could not read that attachment. Please resend it with a short text description.");
      return;
    }
  }

  if (!messageText && !image) {
    await replySafely(message.from, "Aura currently accepts text, voice notes, and images. Please resend the information in one of those formats.");
    return;
  }

  try {
    const intake = await createAuraIntake({
      externalMessageId: message.id,
      senderPhone: message.from,
      messageType: message.type,
      messageText,
      rawPayload: message,
      image,
    });
    if (intake.status === "confirmed") {
      await replySafely(message.from, "This Aura item was already confirmed and saved.");
      return;
    }
    await replySafely(message.from, buildAuraPreview(intake.proposal, intake.code));
  } catch {
    await replySafely(message.from, "Aura could not prepare that item. Nothing was saved. Please try again with a shorter message.");
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!verifyWhatsAppSignature(rawBody, request.headers.get("x-hub-signature-256"))) {
    return textResponse("Invalid signature", 401);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return textResponse("Invalid JSON", 400);
  }

  const messages = parseWhatsAppMessages(payload);
  if (messages.length > 0) {
    after(async () => {
      await Promise.allSettled(messages.map((message) => processInboundMessage(message)));
    });
  }
  return textResponse("EVENT_RECEIVED");
}
