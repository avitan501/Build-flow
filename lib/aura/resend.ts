import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { storeAuraCommunication } from "@/lib/aura/communications";

type ResendReceivedEvent = {
  type?: string;
  created_at?: string;
  data?: {
    email_id?: string;
    created_at?: string;
    from?: string;
    to?: string[];
    subject?: string;
    attachments?: Array<{ filename?: string; content_type?: string }>;
  };
};

function signatureKey(secret: string) {
  const encoded = secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret;
  try {
    return Buffer.from(encoded, "base64");
  } catch {
    return null;
  }
}

export function verifyAuraResendWebhook(rawBody: string, headers: Headers) {
  const secret = process.env.AURA_RESEND_WEBHOOK_SECRET;
  const id = headers.get("svix-id");
  const timestamp = headers.get("svix-timestamp");
  const signature = headers.get("svix-signature");
  if (!secret || !id || !timestamp || !signature) return false;

  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds) || Math.abs(Date.now() / 1000 - timestampSeconds) > 300) return false;
  const key = signatureKey(secret);
  if (!key?.length) return false;
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${rawBody}`).digest();

  return signature.split(" ").some((candidate) => {
    const [version, encoded] = candidate.split(",", 2);
    if (version !== "v1" || !encoded) return false;
    try {
      const supplied = Buffer.from(encoded, "base64");
      return supplied.length === expected.length && timingSafeEqual(supplied, expected);
    } catch {
      return false;
    }
  });
}

function stripHtml(value: string) {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function storeAuraResendEvent(payload: unknown) {
  const event = payload as ResendReceivedEvent;
  if (event.type !== "email.received" || !event.data?.email_id || !event.data.from) return false;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Resend receiving is not configured.");

  const response = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(event.data.email_id)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Unable to retrieve received email: HTTP ${response.status}.`);
  const email = (await response.json()) as { text?: string | null; html?: string | null };
  const attachmentNames = (event.data.attachments || []).map((attachment) => attachment.filename).filter(Boolean);
  const body = (email.text?.trim() || (email.html ? stripHtml(email.html) : "")).slice(0, 20_000);

  await storeAuraCommunication({
    provider: "manual",
    channel: "email",
    externalActivityId: event.data.email_id,
    direction: "incoming",
    counterpartyEmail: event.data.from,
    subject: event.data.subject || null,
    body: [body, attachmentNames.length ? `Attachments: ${attachmentNames.join(", ")}` : ""].filter(Boolean).join("\n\n"),
    status: "received",
    occurredAt: event.data.created_at || event.created_at,
    media: (event.data.attachments || []).map((attachment) => ({ type: attachment.content_type })),
  });
  return true;
}
