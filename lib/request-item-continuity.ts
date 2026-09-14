import type { ReviewableMaterialItem } from "@/lib/client-material-review"
import { materialReviewReasons, materialReviewStatus } from "@/lib/client-material-review"

/** Stable ordering makes browser/server comparisons independent of JSON key order. */
export function canonicalItemValue(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalItemValue).join(",")}]`
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, entry]) => `${JSON.stringify(key)}:${canonicalItemValue(entry)}`).join(",")}}`
  return JSON.stringify(value ?? null)
}

export function itemEditSnapshot(item: ReviewableMaterialItem) {
  return { name: item.name, department: item.department, quantity: item.quantity, unit: item.unit, metadata: item.metadata, qualification_status: item.qualification_status ?? "not_required" }
}

export function nextUnresolvedItem(items: ReviewableMaterialItem[], currentId?: string | null) {
  const start = items.findIndex((item) => item.id === currentId)
  for (let offset = 1; offset <= items.length; offset++) {
    const item = items[(start + offset) % items.length]
    if (materialReviewStatus(item) !== "ready" && materialReviewReasons(item).length) return item.id
  }
  return null
}

export type ItemResumePosition = { itemId: string; field: string | null }
export function hasIncomingItemRevision(serverRevision: string, reviewedRevision: string, baselineServerRevision: string | null) {
  // A completed action can be ahead of the still-rendered Server Component payload.
  return serverRevision !== baselineServerRevision && serverRevision !== reviewedRevision
}

export function readItemResume(value: string | null, allowedIds: string[]): ItemResumePosition | null {
  try {
    const position = JSON.parse(value || "null")
    if (!position || typeof position.itemId !== "string" || !allowedIds.includes(position.itemId)) return null
    return { itemId: position.itemId, field: typeof position.field === "string" && /^[a-zA-Z]{1,40}$/.test(position.field) ? position.field : null }
  } catch { return null }
}
