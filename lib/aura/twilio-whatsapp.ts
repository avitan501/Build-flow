import "server-only";

import twilio from "twilio";

import {
  normalizeAuraPhone,
  storeAuraCommunication,
  updateAuraCommunicationStatus,
} from "@/lib/aura/communications";
import { PRODUCTION_SITE_ORIGIN } from "@/lib/site-url";

const TWILIO_WHATSAPP_WEBHOOK_PATH = "/api/aura/whatsapp/twilio";

function withoutWhatsAppPrefix(value: string) {
  return value.replace(/^whatsapp:/i, "");
}

export function getTwilioWhatsAppConfig() {
  const accountSid = process.env.AURA_TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.AURA_TWILIO_AUTH_TOKEN?.trim();
  const from = normalizeAuraPhone(process.env.AURA_TWILIO_WHATSAPP_FROM || "");
  if (!accountSid || !authToken || !from) return null;
  return { accountSid, authToken, from };
}

export function canUseTwilioWhatsApp() {
  return Boolean(getTwilioWhatsAppConfig());
}

export function verifyTwilioWhatsAppRequest(
  requestUrl: string,
  signature: string | null,
  params: URLSearchParams,
) {
  const config = getTwilioWhatsAppConfig();
  if (!config || !signature) return false;
  const canonicalUrl = process.env.AURA_TWILIO_WHATSAPP_WEBHOOK_URL?.trim() || requestUrl;
  return twilio.validateRequest(config.authToken, signature, canonicalUrl, Object.fromEntries(params));
}

export async function sendTwilioWhatsAppText(toValue: string, bodyValue: string) {
  const config = getTwilioWhatsAppConfig();
  if (!config) return { sent: false as const, reason: "not_configured" as const };
  const to = normalizeAuraPhone(toValue);
  const body = bodyValue.trim().slice(0, 1600);
  if (!to || !body) throw new Error("Enter a valid WhatsApp number and message.");

  const client = twilio(config.accountSid, config.authToken);
  const message = await client.messages.create({
    from: `whatsapp:${config.from}`,
    to: `whatsapp:${to}`,
    body,
    statusCallback: `${PRODUCTION_SITE_ORIGIN}${TWILIO_WHATSAPP_WEBHOOK_PATH}`,
  });
  return { sent: true as const, messageId: message.sid || null };
}

export async function processTwilioWhatsAppWebhook(params: URLSearchParams) {
  const messageSid = params.get("MessageSid") || params.get("SmsSid");
  if (!messageSid) return;

  const messageStatus = params.get("MessageStatus") || params.get("SmsStatus");
  const body = params.get("Body")?.trim() || "";
  const from = normalizeAuraPhone(withoutWhatsAppPrefix(params.get("From") || ""));
  const to = normalizeAuraPhone(withoutWhatsAppPrefix(params.get("To") || ""));
  const numMedia = Math.max(0, Number(params.get("NumMedia") || 0));

  if (!body && numMedia === 0 && messageStatus) {
    await updateAuraCommunicationStatus("whatsapp", messageSid, messageStatus);
    return;
  }

  const media = Array.from({ length: Math.min(numMedia, 10) }, (_, index) => ({
    url: params.get(`MediaUrl${index}`) || undefined,
    type: params.get(`MediaContentType${index}`) || undefined,
  }));

  await storeAuraCommunication({
    provider: "whatsapp",
    channel: "whatsapp",
    externalActivityId: messageSid,
    direction: "incoming",
    counterpartyPhone: from,
    businessPhone: to,
    body: body || null,
    status: messageStatus || "received",
    media,
  });
}
