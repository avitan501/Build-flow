import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { AURA_EMAIL_ATTACHMENT_BUCKET } from "@/lib/aura/resend-attachments";
import { safeAuraEmailAttachmentName } from "@/lib/aura/resend-attachment-policy";
import type { InboundSupplierQuoteAttachment } from "@/lib/supplier-quotes";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ATTACHMENT_ID_PATTERN = /^[a-zA-Z0-9_-]{1,160}$/;
const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "text/csv",
  "text/plain",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

type StoredAttachment = {
  type?: unknown;
  name?: unknown;
  size?: unknown;
  storagePath?: unknown;
  providerAttachmentId?: unknown;
};

type InboundCommunication = {
  id: string;
  direction: string | null;
  channel: string;
  counterparty_email: string | null;
  subject: string | null;
  media: StoredAttachment[] | string | null;
};

function mediaRows(value: InboundCommunication["media"]) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed as StoredAttachment[] : [];
  } catch {
    return [];
  }
}

export async function loadInboundSupplierQuoteAttachment(
  communicationId: string,
  attachmentId: string,
  options: { includeFile?: boolean } = {},
) {
  if (!UUID_PATTERN.test(communicationId) || !ATTACHMENT_ID_PATTERN.test(attachmentId)) return null;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("aura_communications")
    .select("id,direction,channel,counterparty_email,subject,media")
    .eq("id", communicationId)
    .eq("direction", "incoming")
    .eq("channel", "email")
    .maybeSingle<InboundCommunication>();
  if (error || !data) return null;

  const attachment = mediaRows(data.media).find((item) => item.providerAttachmentId === attachmentId);
  const storagePath = typeof attachment?.storagePath === "string" ? attachment.storagePath : "";
  const expectedPrefix = `inbound-email/${communicationId}/${attachmentId}-`;
  const mimeType = typeof attachment?.type === "string" ? attachment.type.trim().toLowerCase() : "";
  const size = Number(attachment?.size);
  if (
    !storagePath.startsWith(expectedPrefix)
    || storagePath.includes("..")
    || !ALLOWED_TYPES.has(mimeType)
    || !Number.isSafeInteger(size)
    || size <= 0
    || size > MAX_FILE_SIZE
  ) return null;

  const metadata: InboundSupplierQuoteAttachment = {
    communicationId,
    attachmentId,
    fileName: safeAuraEmailAttachmentName(attachment?.name),
    mimeType,
    size,
    senderEmail: String(data.counterparty_email || "").trim().slice(0, 200),
    subject: String(data.subject || "").trim().slice(0, 200),
  };
  if (!options.includeFile) return { metadata, file: null };

  const { data: storedFile, error: downloadError } = await admin.storage
    .from(AURA_EMAIL_ATTACHMENT_BUCKET)
    .download(storagePath);
  if (downloadError || !storedFile || storedFile.size !== size) return null;
  return {
    metadata,
    file: new File([await storedFile.arrayBuffer()], metadata.fileName, { type: metadata.mimeType }),
  };
}
