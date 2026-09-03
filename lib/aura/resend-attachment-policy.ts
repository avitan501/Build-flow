export const AURA_EMAIL_ATTACHMENT_MAX_BYTES = 25 * 1024 * 1024;
export const AURA_EMAIL_ATTACHMENT_MAX_COUNT = 10;

const ALLOWED_ATTACHMENT_TYPES = new Set([
  "application/pdf",
  "text/csv",
  "text/plain",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function safeAuraEmailAttachmentName(value: unknown) {
  return (typeof value === "string" ? value.trim().slice(0, 255) : "")
    .normalize("NFC")
    .replace(/[\\/\u0000-\u001f\u007f]/g, "_")
    .trim()
    .slice(0, 220) || "attachment";
}

export function auraEmailAttachmentStorageName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(-180) || "attachment";
}

export function isTrustedResendAttachmentDownloadUrl(value: unknown) {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "inbound-cdn.resend.com";
  } catch {
    return false;
  }
}

export function parseSafeResendAttachment(value: unknown) {
  const item = (value || {}) as Record<string, unknown>;
  const id = typeof item.id === "string" ? item.id.trim().slice(0, 160) : "";
  const name = safeAuraEmailAttachmentName(item.filename);
  const type = typeof item.content_type === "string" ? item.content_type.trim().toLowerCase().slice(0, 160) : "";
  const size = Number(item.size);
  const downloadUrl = typeof item.download_url === "string" ? item.download_url.trim().slice(0, 4_000) : "";
  if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) return null;
  if (!ALLOWED_ATTACHMENT_TYPES.has(type)) return null;
  if (!Number.isSafeInteger(size) || size <= 0 || size > AURA_EMAIL_ATTACHMENT_MAX_BYTES) return null;
  if (!isTrustedResendAttachmentDownloadUrl(downloadUrl)) return null;
  return { id, name, type, size, downloadUrl };
}
