const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
])

const EXPECTED_MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}

export const REQUEST_ATTACHMENT_MAX_FILES = 10
export const REQUEST_ATTACHMENT_MAX_FILE_SIZE = 25 * 1024 * 1024

export type RequestAttachmentFileInput = {
  filename: string
  type: string
  size: number
}

export type RequestAttachmentStorageInfo = {
  size?: unknown
  contentType?: unknown
  metadata?: unknown
}

export function normalizeRequestAttachmentMimeType(value: unknown) {
  return typeof value === "string" ? value.split(";", 1)[0].trim().toLowerCase() : ""
}

export function validateRequestAttachmentFile(input: RequestAttachmentFileInput) {
  const filename = String(input.filename || "").trim()
  const type = normalizeRequestAttachmentMimeType(input.type)
  const size = Number(input.size)
  if (!filename || filename.length > 220 || !Number.isSafeInteger(size) || size <= 0) return "Choose a valid file."
  if (size > REQUEST_ATTACHMENT_MAX_FILE_SIZE) return "Keep each file under 25 MB."
  if (!ALLOWED_MIME_TYPES.has(type)) return "Add a PDF, JPG, PNG, WebP, DOCX, or XLSX file."
  const extension = filename.split(".").pop()?.toLowerCase() || ""
  if (EXPECTED_MIME_BY_EXTENSION[extension] !== type) return "The file name and file type do not match."
  return null
}

export function requestAttachmentStorageMetadata(info: RequestAttachmentStorageInfo | null | undefined) {
  const metadata = info?.metadata && typeof info.metadata === "object"
    ? info.metadata as Record<string, unknown>
    : {}
  const size = Number(info?.size ?? metadata.size ?? metadata.contentLength ?? metadata.content_length)
  const type = normalizeRequestAttachmentMimeType(
    info?.contentType ?? metadata.mimetype ?? metadata.contentType ?? metadata.content_type,
  )
  return { size, type }
}

export function requestAttachmentStorageMetadataMatches(
  info: RequestAttachmentStorageInfo | null | undefined,
  expected: { size: number; type: string },
) {
  const actual = requestAttachmentStorageMetadata(info)
  return Number.isSafeInteger(actual.size)
    && actual.size === expected.size
    && actual.type === normalizeRequestAttachmentMimeType(expected.type)
}

export function requestActionHasSameOrigin(origin: string | null, forwardedHost: string | null, host: string | null) {
  const requestHost = (forwardedHost?.split(",")[0]?.trim() || host?.trim() || "").toLowerCase()
  if (!origin || !requestHost) return false
  try {
    return new URL(origin).host.toLowerCase() === requestHost
  } catch {
    return false
  }
}

export async function verifyRequestAttachmentStorage(
  load: () => Promise<{ data: RequestAttachmentStorageInfo | null; error: unknown }>,
  expected: { size: number; type: string },
  options: { attempts?: number; wait?: (milliseconds: number) => Promise<void> } = {},
) {
  const attempts = Math.max(1, Math.min(options.attempts ?? 3, 5))
  const wait = options.wait ?? ((milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds)))
  let lastError: unknown = null
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const result = await load()
    lastError = result.error
    if (!result.error && requestAttachmentStorageMetadataMatches(result.data, expected)) {
      return { ok: true as const }
    }
    if (attempt + 1 < attempts) await wait(125 * (attempt + 1))
  }
  return { ok: false as const, error: lastError }
}
