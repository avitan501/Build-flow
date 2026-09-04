export type WebsiteDefectStorageInfo = {
  size?: unknown
  contentType?: unknown
  metadata?: unknown
}

export type WebsiteDefectStorageLoadResult = {
  data: WebsiteDefectStorageInfo | null
  error: unknown
}

export function normalizeWebsiteDefectMimeType(value: unknown) {
  return typeof value === "string" ? value.split(";", 1)[0].trim().toLowerCase() : ""
}

export function websiteDefectStorageMetadata(info: WebsiteDefectStorageInfo | null | undefined) {
  const metadata = info?.metadata && typeof info.metadata === "object"
    ? info.metadata as Record<string, unknown>
    : {}
  const size = Number(info?.size ?? metadata.size ?? metadata.contentLength ?? metadata.content_length)
  const type = normalizeWebsiteDefectMimeType(
    info?.contentType ?? metadata.mimetype ?? metadata.contentType ?? metadata.content_type,
  )
  return { size, type }
}

export async function verifyWebsiteDefectStorage(
  load: () => Promise<WebsiteDefectStorageLoadResult>,
  expected: { size: number; type: string },
  options: { attempts?: number; wait?: (milliseconds: number) => Promise<void> } = {},
) {
  const attempts = Math.max(1, Math.min(options.attempts ?? 3, 5))
  const wait = options.wait ?? ((milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds)))
  let lastError: unknown = null

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    let result: WebsiteDefectStorageLoadResult
    try {
      result = await load()
    } catch (error) {
      result = { data: null, error }
    }
    lastError = result.error
    if (!result.error && result.data) {
      const actual = websiteDefectStorageMetadata(result.data)
      const hasCompleteMetadata = Number.isSafeInteger(actual.size) && Boolean(actual.type)
      if (hasCompleteMetadata) {
        return actual.size === expected.size && actual.type === normalizeWebsiteDefectMimeType(expected.type)
          ? { ok: true as const, actual }
          : { ok: false as const, reason: "mismatch" as const, actual, error: null }
      }
    }
    if (attempt + 1 < attempts) await wait(125 * (attempt + 1))
  }

  return { ok: false as const, reason: "unavailable" as const, error: lastError }
}
