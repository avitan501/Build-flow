export type MaterialListAttachment = {
  file_name: string
  file_path: string
  file_type: string | null
  file_size: number | null
}

export const MAX_ATTACHMENT_COUNT = 8
export const MAX_ATTACHMENT_SCAN_COUNT = 12
export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024
export const MAX_TOTAL_ATTACHMENT_BYTES = 32 * 1024 * 1024

const supportedImageTypes = new Set([
  "image/gif",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
])

function normalizedMimeType(value: unknown) {
  const mimeType = String(value ?? "").trim().toLowerCase().split(";", 1)[0]
  return mimeType === "image/jpg" ? "image/jpeg" : mimeType
}

function inferredMimeType(fileName: string) {
  const extension = fileName.trim().toLowerCase().match(/\.([a-z0-9]+)$/)?.[1]
  if (extension === "pdf") return "application/pdf"
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg"
  if (extension === "png") return "image/png"
  if (extension === "webp") return "image/webp"
  if (extension === "gif") return "image/gif"
  return ""
}

export function attachmentMimeType(attachment: MaterialListAttachment) {
  const declared = normalizedMimeType(attachment.file_type)
  if (declared === "application/pdf" || supportedImageTypes.has(declared)) return declared
  return inferredMimeType(attachment.file_name)
}

export function materialListAttachmentCandidates(attachments: MaterialListAttachment[]) {
  return attachments
    .filter((attachment) => Boolean(attachmentMimeType(attachment)))
    .filter((attachment) => attachment.file_size === null || (
      Number.isFinite(attachment.file_size)
      && Number(attachment.file_size) > 0
      && Number(attachment.file_size) <= MAX_ATTACHMENT_BYTES
    ))
    .slice(0, MAX_ATTACHMENT_SCAN_COUNT)
}

export function canAddMaterialListAttachment(currentCount: number, currentBytes: number, nextBytes: number) {
  return Number.isFinite(nextBytes)
    && nextBytes > 0
    && nextBytes <= MAX_ATTACHMENT_BYTES
    && currentCount < MAX_ATTACHMENT_COUNT
    && currentBytes + nextBytes <= MAX_TOTAL_ATTACHMENT_BYTES
}
