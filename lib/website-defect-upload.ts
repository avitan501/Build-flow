const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime", "video/webm"])
const FILE_TYPE_ALIASES: Record<string, string> = { "image/jpg": "image/jpeg", "video/mov": "video/quicktime" }
const FILE_TYPE_BY_EXTENSION: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm" }

export const WEBSITE_DEFECT_MAX_FILES = 6
export const WEBSITE_DEFECT_MAX_FILE_SIZE = 100 * 1024 * 1024
export const WEBSITE_DEFECT_MAX_TOTAL_SIZE = 250 * 1024 * 1024

export function normalizeWebsiteDefectFileType(file: { name: string; type: string }) {
  const declared = file.type.trim().toLowerCase().split(";", 1)[0]
  const normalized = FILE_TYPE_ALIASES[declared] ?? declared
  if (ALLOWED_TYPES.has(normalized)) return normalized
  if (declared && declared !== "application/octet-stream") return ""
  const extension = file.name.trim().toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? ""
  return FILE_TYPE_BY_EXTENSION[extension] ?? ""
}

export function validateWebsiteDefectFiles(files: Array<{ name: string; type: string; size: number }>) {
  if (files.length < 1) return "Choose at least one video or screenshot."
  if (files.length > WEBSITE_DEFECT_MAX_FILES) return `Choose up to ${WEBSITE_DEFECT_MAX_FILES} files for one issue.`
  let total = 0
  for (const file of files) {
    if (!normalizeWebsiteDefectFileType(file)) return `${file.name || "One file"} is not an approved MP4, MOV, WebM, JPG, PNG, or WebP file.`
    if (!Number.isSafeInteger(file.size) || file.size < 1) return `${file.name || "One file"} is empty or invalid.`
    if (file.size > WEBSITE_DEFECT_MAX_FILE_SIZE) return `${file.name} is over the 100 MB per-file limit.`
    total += file.size
  }
  if (total > WEBSITE_DEFECT_MAX_TOTAL_SIZE) return "Keep all files for one issue under 250 MB total."
  return null
}

export function websiteDefectUploadErrorStatus(error: unknown) {
  if (!error || typeof error !== "object") return null
  const direct = "status" in error ? Number(error.status) : Number.NaN
  if (Number.isFinite(direct)) return direct
  const original = "originalError" in error && error.originalError && typeof error.originalError === "object" ? error.originalError : null
  const nested = original && "status" in original ? Number(original.status) : Number.NaN
  return Number.isFinite(nested) ? nested : null
}

export function retryWebsiteDefectUpload(error: unknown) {
  const status = websiteDefectUploadErrorStatus(error)
  return status === null || status === 408 || status === 429 || status >= 500
}

export function websiteDefectUploadErrorMessage(error: unknown) {
  const status = websiteDefectUploadErrorStatus(error)
  if (status === 401 || status === 403) return "Your secure session expired. Refresh this page, sign in again, and retry."
  if (status === 413) return "This file is too large. Keep it under 100 MB."
  if (status === 404) return "Private issue storage is temporarily unavailable. Please try again shortly."
  if (status === 400 || status === 415) return "This file could not be accepted. Choose an MP4, MOV, WebM, JPG, PNG, or WebP file."
  return "The secure upload was interrupted. Check your connection and tap Try upload again."
}
