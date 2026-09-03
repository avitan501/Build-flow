import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeAuraEmail, normalizeAuraPhone } from "@/lib/aura/identity";

export { normalizeAuraEmail, normalizeAuraPhone } from "@/lib/aura/identity";

export type AuraMessageChannel = "sms" | "whatsapp" | "email";

type CommunicationInput = {
  provider: "quo" | "whatsapp" | "gmail" | "manual";
  channel: "call" | "sms" | "whatsapp" | "email" | "note";
  externalActivityId: string;
  direction: "incoming" | "outgoing" | "internal";
  counterpartyPhone?: string | null;
  counterpartyEmail?: string | null;
  businessPhone?: string | null;
  subject?: string | null;
  body?: string | null;
  status?: string | null;
  media?: Array<{ url?: string; type?: string; name?: string; size?: number; storagePath?: string; providerAttachmentId?: string; duration?: number }>;
  occurredAt?: string;
  mailboxAddress?: string | null;
  messageId?: string | null;
  inReplyTo?: string | null;
};

async function contactForIdentity(phone: string | null, email: string | null) {
  if (!phone && !email) return null;
  const supabase = createAdminClient();
  let query = supabase.from("aura_contacts").select("id");
  query = phone ? query.eq("normalized_phone", phone) : query.ilike("email", email!);
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(`Unable to match Aura contact: ${error.message}`);
  return data?.id || null;
}

export async function storeAuraCommunication(input: CommunicationInput) {
  const supabase = createAdminClient();
  const counterpartyPhone = input.counterpartyPhone ? normalizeAuraPhone(input.counterpartyPhone) : null;
  const counterpartyEmail = input.counterpartyEmail ? normalizeAuraEmail(input.counterpartyEmail) : null;
  const contactId = await contactForIdentity(counterpartyPhone, counterpartyEmail);
  const occurredAt = input.occurredAt || new Date().toISOString();
  const { data, error } = await supabase.from("aura_communications").upsert(
    {
      provider: input.provider,
      channel: input.channel,
      external_activity_id: input.externalActivityId,
      contact_id: contactId,
      direction: input.direction,
      counterparty_phone: counterpartyPhone,
      counterparty_email: counterpartyEmail,
      business_phone: input.businessPhone ? normalizeAuraPhone(input.businessPhone) : null,
      subject: input.subject || null,
      body: input.body || null,
      media: input.media || [],
      status: input.status || null,
      occurred_at: occurredAt,
      last_event_at: occurredAt,
      mailbox_address: input.mailboxAddress ? normalizeAuraEmail(input.mailboxAddress) : null,
      message_id: input.messageId?.trim().slice(0, 500) || null,
      in_reply_to: input.inReplyTo?.trim().slice(0, 500) || null,
    },
    { onConflict: "provider,external_activity_id" },
  ).select("id").single<{ id: string }>();
  if (error) throw new Error(`Unable to save Aura communication: ${error.message}`);
  return data.id;
}

export async function updateAuraCommunicationStatus(
  provider: CommunicationInput["provider"],
  externalActivityId: string,
  status: string,
) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("aura_communications")
    .update({ status, last_event_at: new Date().toISOString() })
    .eq("provider", provider)
    .eq("external_activity_id", externalActivityId);
  if (error) throw new Error(`Unable to update Aura communication: ${error.message}`);
}

export async function updateAuraCommunicationMedia(
  communicationId: string,
  media: NonNullable<CommunicationInput["media"]>,
) {
  const { error } = await createAdminClient()
    .from("aura_communications")
    .update({ media })
    .eq("id", communicationId);
  if (error) throw new Error(`Unable to save Aura communication attachments: ${error.message}`);
}

function quoConfig() {
  const apiKey = process.env.AURA_QUO_API_KEY;
  const from = normalizeAuraPhone(process.env.AURA_QUO_FROM_NUMBER || "");
  if (!apiKey || !from) return null;
  return { apiKey, from };
}

export function canSendAuraQuoText() {
  return Boolean(quoConfig());
}

export async function sendAuraQuoText(toValue: string, contentValue: string) {
  const config = quoConfig();
  if (!config) throw new Error("Q U O sending is not configured.");
  const to = normalizeAuraPhone(toValue);
  const content = contentValue.trim().slice(0, 1600);
  if (!to || !content) throw new Error("Enter a valid phone number and message.");

  const response = await fetch("https://api.openphone.com/v1/messages", {
    method: "POST",
    headers: {
      Authorization: config.apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content, from: config.from, to: [to] }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Q U O message failed with HTTP ${response.status}.`);
  const result = (await response.json()) as { data?: { id?: string; status?: string; createdAt?: string } };
  const externalId = result.data?.id || `quo-out-${crypto.randomUUID()}`;
  await storeAuraCommunication({
    provider: "quo",
    channel: "sms",
    externalActivityId: externalId,
    direction: "outgoing",
    counterpartyPhone: to,
    businessPhone: config.from,
    body: content,
    status: result.data?.status || "queued",
    occurredAt: result.data?.createdAt,
  });
  return { id: externalId };
}

function emailConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL?.trim() || "Avantia Build <office@build.avantiap.com>";
  if (!apiKey) return null;
  return { apiKey, from };
}

export function canSendAuraEmail() {
  return Boolean(emailConfig());
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] || character);
}

export async function sendAuraEmail(toValue: string, subjectValue: string, bodyValue: string) {
  const config = emailConfig();
  if (!config) throw new Error("Email sending is not configured.");
  const to = normalizeAuraEmail(toValue);
  const subject = subjectValue.trim().slice(0, 200) || "Message from Avantia Build";
  const body = bodyValue.trim().slice(0, 10_000);
  if (!to || !body) throw new Error("Enter a valid email address and message.");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.from,
      to: [to],
      subject,
      text: body,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033"><p>${escapeHtml(body).replaceAll("\n", "<br />")}</p><p style="margin-top:24px;color:#667085">Avantia Build · (347) 937-8665</p></div>`,
      reply_to: "office@build.avantiap.com",
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Email failed with HTTP ${response.status}.`);
  const result = (await response.json()) as { id?: string };
  const externalId = result.id || `email-out-${crypto.randomUUID()}`;
  await storeAuraCommunication({
    provider: "manual",
    channel: "email",
    externalActivityId: externalId,
    direction: "outgoing",
    counterpartyEmail: to,
    subject,
    body,
    status: "sent",
  });
  return { id: externalId };
}
