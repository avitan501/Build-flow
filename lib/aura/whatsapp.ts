import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { storeAuraCommunication } from "@/lib/aura/communications";

export type WhatsAppInboundMessage = {
  id: string;
  from: string;
  timestamp?: string;
  type: string;
  text?: { body?: string };
  image?: { id?: string; mime_type?: string; caption?: string };
  audio?: { id?: string; mime_type?: string; voice?: boolean };
  document?: { id?: string; mime_type?: string; filename?: string; caption?: string };
  button?: { text?: string; payload?: string };
  interactive?: {
    type?: string;
    button_reply?: { id?: string; title?: string };
    list_reply?: { id?: string; title?: string; description?: string };
  };
};

type WhatsAppWebhookPayload = {
  object?: string;
  entry?: Array<{
    changes?: Array<{
      field?: string;
      value?: {
        metadata?: { display_phone_number?: string; phone_number_id?: string };
        messages?: WhatsAppInboundMessage[];
      };
    }>;
  }>;
};

function normalizeDigits(value: string) {
  return value.replace(/[^0-9]/g, "");
}

export function isAuraAllowedSender(phone: string) {
  const allowed = (process.env.AURA_WHATSAPP_ALLOWED_NUMBERS || "")
    .split(",")
    .map(normalizeDigits)
    .filter(Boolean);
  return allowed.length > 0 && allowed.includes(normalizeDigits(phone));
}

export function verifyWhatsAppSignature(rawBody: string, signatureHeader: string | null) {
  const secret = process.env.AURA_WHATSAPP_APP_SECRET;
  if (!secret || !signatureHeader?.startsWith("sha256=")) return false;
  const supplied = signatureHeader.slice("sha256=".length);
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const suppliedBuffer = Buffer.from(supplied, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return suppliedBuffer.length === expectedBuffer.length && timingSafeEqual(suppliedBuffer, expectedBuffer);
}

export function parseWhatsAppMessages(payload: unknown) {
  const parsed = payload as WhatsAppWebhookPayload;
  if (parsed?.object !== "whatsapp_business_account") return [] as WhatsAppInboundMessage[];
  const messages: WhatsAppInboundMessage[] = [];
  for (const entry of parsed.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== "messages") continue;
      messages.push(...(change.value?.messages || []));
    }
  }
  return messages;
}

export function getWhatsAppMessageText(message: WhatsAppInboundMessage) {
  if (message.type === "text") return message.text?.body?.trim() || "";
  if (message.type === "button") return message.button?.text?.trim() || message.button?.payload?.trim() || "";
  if (message.type === "interactive") {
    return (
      message.interactive?.button_reply?.title?.trim() ||
      message.interactive?.list_reply?.title?.trim() ||
      ""
    );
  }
  if (message.type === "image") return message.image?.caption?.trim() || "";
  if (message.type === "document") return message.document?.caption?.trim() || message.document?.filename?.trim() || "";
  return "";
}

export function getWhatsAppMedia(message: WhatsAppInboundMessage) {
  if (message.type === "image" && message.image?.id) {
    return { id: message.image.id, mediaType: message.image.mime_type || "image/jpeg", kind: "image" as const };
  }
  if (message.type === "audio" && message.audio?.id) {
    return { id: message.audio.id, mediaType: message.audio.mime_type || "audio/ogg", kind: "audio" as const };
  }
  return null;
}

function getMetaConfig() {
  const version = process.env.AURA_WHATSAPP_GRAPH_VERSION;
  const phoneNumberId = process.env.AURA_WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.AURA_WHATSAPP_ACCESS_TOKEN;
  if (!version || !phoneNumberId || !accessToken) return null;
  return { version, phoneNumberId, accessToken };
}

export function canSendAuraWhatsApp() {
  return Boolean(getMetaConfig());
}

export async function sendAuraWhatsAppText(to: string, body: string) {
  const config = getMetaConfig();
  if (!config) return { sent: false as const, reason: "not_configured" as const };
  const response = await fetch(
    `https://graph.facebook.com/${encodeURIComponent(config.version)}/${encodeURIComponent(config.phoneNumberId)}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: normalizeDigits(to),
        type: "text",
        text: { preview_url: false, body: body.slice(0, 4096) },
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`WhatsApp send failed with HTTP ${response.status}.`);
  }
  const result = (await response.json()) as { messages?: Array<{ id?: string }> };
  return { sent: true as const, messageId: result.messages?.[0]?.id || null };
}

export async function storeInboundAuraWhatsApp(
  message: WhatsAppInboundMessage,
  body: string,
  media: ReturnType<typeof getWhatsAppMedia>,
) {
  const timestamp = Number(message.timestamp);
  await storeAuraCommunication({
    provider: "whatsapp",
    channel: "whatsapp",
    externalActivityId: message.id,
    direction: "incoming",
    counterpartyPhone: message.from,
    body: body || null,
    status: "received",
    occurredAt: Number.isFinite(timestamp) && timestamp > 0 ? new Date(timestamp * 1000).toISOString() : undefined,
    media: media ? [{ type: media.mediaType }] : [],
  });
}

export async function downloadWhatsAppMedia(mediaId: string) {
  const config = getMetaConfig();
  if (!config) throw new Error("WhatsApp media download is not configured.");
  const metadataResponse = await fetch(
    `https://graph.facebook.com/${encodeURIComponent(config.version)}/${encodeURIComponent(mediaId)}`,
    { headers: { Authorization: `Bearer ${config.accessToken}` }, cache: "no-store" },
  );
  if (!metadataResponse.ok) throw new Error(`WhatsApp media metadata failed with HTTP ${metadataResponse.status}.`);
  const metadata = (await metadataResponse.json()) as { url?: string; mime_type?: string; file_size?: number };
  if (!metadata.url) throw new Error("WhatsApp media URL was missing.");
  if (metadata.file_size && metadata.file_size > 20 * 1024 * 1024) throw new Error("WhatsApp media exceeds the 20 MB Aura limit.");

  const mediaResponse = await fetch(metadata.url, {
    headers: { Authorization: `Bearer ${config.accessToken}` },
    cache: "no-store",
  });
  if (!mediaResponse.ok) throw new Error(`WhatsApp media download failed with HTTP ${mediaResponse.status}.`);
  const contentLength = Number(mediaResponse.headers.get("content-length") || 0);
  if (contentLength > 20 * 1024 * 1024) throw new Error("WhatsApp media exceeds the 20 MB Aura limit.");
  const data = new Uint8Array(await mediaResponse.arrayBuffer());
  if (data.byteLength > 20 * 1024 * 1024) throw new Error("WhatsApp media exceeds the 20 MB Aura limit.");
  return { data, mediaType: metadata.mime_type || mediaResponse.headers.get("content-type") || "application/octet-stream" };
}
