import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  AURA_EMAIL_ATTACHMENT_MAX_BYTES,
  AURA_EMAIL_ATTACHMENT_MAX_COUNT,
  auraEmailAttachmentStorageName,
  parseSafeResendAttachment,
} from "@/lib/aura/resend-attachment-policy";

export { safeAuraEmailAttachmentName } from "@/lib/aura/resend-attachment-policy";

export const AURA_EMAIL_ATTACHMENT_BUCKET = "supplier-quotes";

type ResendAttachmentList = {
  data?: unknown;
};

export type AuraStoredEmailAttachment = {
  url: string;
  type: string;
  name: string;
  size: number;
  storagePath: string;
  providerAttachmentId: string;
};

export async function persistAuraResendAttachments(input: {
  apiKey: string;
  emailId: string;
  communicationId: string;
  fetcher?: typeof fetch;
}) {
  const fetcher = input.fetcher ?? fetch;
  const emailId = encodeURIComponent(input.emailId);
  const response = await fetcher(`https://api.resend.com/emails/receiving/${emailId}/attachments`, {
    headers: { Authorization: `Bearer ${input.apiKey}` },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Unable to retrieve received email attachments: HTTP ${response.status}.`);

  const payload = (await response.json()) as ResendAttachmentList;
  const rawAttachments = Array.isArray(payload.data) ? payload.data.slice(0, AURA_EMAIL_ATTACHMENT_MAX_COUNT) : [];
  const attachments = rawAttachments.map(parseSafeResendAttachment).filter((item): item is NonNullable<typeof item> => Boolean(item));
  if (!attachments.length) return [] as AuraStoredEmailAttachment[];
  const totalSize = attachments.reduce((sum, item) => sum + item.size, 0);
  if (totalSize > AURA_EMAIL_ATTACHMENT_MAX_BYTES) throw new Error("Received email attachments exceed the safe total size.");

  const storage = createAdminClient().storage.from(AURA_EMAIL_ATTACHMENT_BUCKET);
  const stored: AuraStoredEmailAttachment[] = [];
  for (const attachment of attachments) {
    const download = await fetcher(attachment.downloadUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    if (!download.ok) throw new Error(`Unable to download received email attachment: HTTP ${download.status}.`);
    const contentLength = Number(download.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > attachment.size) throw new Error("Received email attachment size did not match its verified metadata.");
    const bytes = await download.arrayBuffer();
    if (bytes.byteLength !== attachment.size || bytes.byteLength > AURA_EMAIL_ATTACHMENT_MAX_BYTES) throw new Error("Received email attachment size did not match its verified metadata.");
    const storagePath = `inbound-email/${input.communicationId}/${attachment.id}-${auraEmailAttachmentStorageName(attachment.name)}`;
    const { error } = await storage.upload(storagePath, bytes, {
      contentType: attachment.type,
      upsert: true,
    });
    if (error) throw new Error(`Unable to preserve received email attachment: ${error.message}`);
    stored.push({
      url: `/api/aura/attachments/${input.communicationId}/${attachment.id}`,
      type: attachment.type,
      name: attachment.name,
      size: attachment.size,
      storagePath,
      providerAttachmentId: attachment.id,
    });
  }
  return stored;
}
