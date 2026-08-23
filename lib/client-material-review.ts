export type MaterialReviewStatus = "ready" | "check" | "missing"

export type ReviewableMaterialItem = {
  id: string
  name: string
  department: string
  quantity: number
  unit: string | null
  metadata: Record<string, unknown> | null
}

const KNOWN_STATUSES = new Set<MaterialReviewStatus>(["ready", "check", "missing"])

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

export function materialReviewStatus(item: ReviewableMaterialItem): MaterialReviewStatus {
  const stored = text(item.metadata?.review_status) as MaterialReviewStatus
  if (KNOWN_STATUSES.has(stored)) return stored
  return item.metadata?.needs_review === true ? "check" : "ready"
}

export function materialReviewReasons(item: ReviewableMaterialItem) {
  const reasons = item.metadata?.review_reasons
  const stored = Array.isArray(reasons)
    ? reasons.filter((reason): reason is string => typeof reason === "string" && Boolean(reason.trim())).map((reason) => reason.trim())
    : []
  if (stored.length) return stored.slice(0, 5)
  return materialReviewStatus(item) === "ready" ? [] : ["Confirm the product details before requesting supplier pricing."]
}

export function materialSearchQuery(item: ReviewableMaterialItem) {
  return [
    item.name,
    text(item.metadata?.dimensions),
    text(item.metadata?.thickness),
    text(item.metadata?.request_details),
  ].filter(Boolean).join(" ").replace(/\s+/g, " ").trim().slice(0, 240)
}

export function materialReviewSummary(items: ReviewableMaterialItem[]) {
  return items.reduce((summary, item) => {
    summary[materialReviewStatus(item)] += 1
    return summary
  }, { ready: 0, check: 0, missing: 0 })
}
