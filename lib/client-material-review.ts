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

const PLACEHOLDER_UNITS = new Set(["", "unspecified", "quantity required", "unknown", "n/a"])

function usableUnit(value: unknown) {
  const unit = text(value)
  return PLACEHOLDER_UNITS.has(unit.toLowerCase()) ? "" : unit
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))]
}

export function materialQuantity(item: ReviewableMaterialItem) {
  return Number.isFinite(item.quantity) && item.quantity > 0 ? item.quantity : 1
}

export function suggestedSalesUnits(item: ReviewableMaterialItem) {
  const current = usableUnit(item.unit)
  const name = `${item.name} ${item.department}`.toLowerCase()
  const suggested = /\b(?:screws?|nails?|fasteners?|anchors?)\b/.test(name)
    ? ["boxes", "packs", "pieces"]
    : /\b(?:drywall|sheetrock|gypsum|greenboard|blueboard|cement\s+board|wonderboard|plywood|osb|panel)\b/.test(name)
      ? ["sheets", "pieces"]
      : /\b(?:tape|house\s*wrap|membrane|underlayment)\b/.test(name)
        ? ["rolls", "pieces"]
        : /\b(?:joint\s+compound|mud|paint|primer|sealer)\b/.test(name)
          ? ["buckets", "pails", "gallons"]
          : /\b(?:cement|concrete|mortar|thinset|grout|sand)\b/.test(name)
            ? ["bags", "pallets"]
            : /\b(?:flooring|tile|shingle)\b/.test(name)
              ? ["boxes", "square feet", "pieces"]
              : /\b(?:siding)\b/.test(name)
                ? ["squares", "boxes", "pieces"]
                : /\b(?:lumber|stud|joist|pipe|conduit|rebar|trim|molding)\b/.test(name)
                  ? ["pieces", "bundles"]
                  : ["each", "pieces", "boxes"]
  return unique([current, ...suggested]).slice(0, 3)
}

export function materialSalesUnit(item: ReviewableMaterialItem) {
  return usableUnit(item.unit) || suggestedSalesUnits(item)[0] || "each"
}

function normalizedReviewReasons(item: ReviewableMaterialItem) {
  const reasons = item.metadata?.review_reasons
  const stored = Array.isArray(reasons)
    ? reasons.filter((reason): reason is string => typeof reason === "string" && Boolean(reason.trim())).map((reason) => reason.trim())
    : []
  const normalized = stored.flatMap((reason) => {
    if (/^quantity is missing$/i.test(reason)) return []
    if (/^(?:sales? unit|selling unit|unit) is missing$/i.test(reason)) return usableUnit(item.unit) ? [] : ["Confirm sales unit"]
    return [reason]
  })
  if (!usableUnit(item.unit) && !normalized.some((reason) => /\bunit\b/i.test(reason))) normalized.unshift("Confirm sales unit")
  return unique(normalized).slice(0, 5)
}

export function materialReviewStatus(item: ReviewableMaterialItem): MaterialReviewStatus {
  const stored = text(item.metadata?.review_status) as MaterialReviewStatus
  const reasons = normalizedReviewReasons(item)
  if (stored === "missing" && reasons.length && reasons.every((reason) => /^confirm sales unit$/i.test(reason))) return "check"
  if (KNOWN_STATUSES.has(stored)) return reasons.length || stored === "ready" ? stored : "ready"
  return item.metadata?.needs_review === true ? "check" : "ready"
}

export function materialReviewReasons(item: ReviewableMaterialItem) {
  const stored = normalizedReviewReasons(item)
  if (stored.length) return stored.slice(0, 5)
  return materialReviewStatus(item) === "ready" ? [] : ["Confirm the product details before requesting supplier pricing."]
}

export function cleanMaterialRequestDetails(value: unknown) {
  return text(value)
    .replace(/(?:^|\s*[·|;-]\s*)quantity was not provided\.?/gi, " ")
    .replace(/\s*[·|;-]\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

export function materialSearchQuery(item: ReviewableMaterialItem) {
  return [
    item.name,
    text(item.metadata?.dimensions),
    text(item.metadata?.thickness),
    text(item.metadata?.product_type),
    text(item.metadata?.screw_length),
    cleanMaterialRequestDetails(item.metadata?.request_details),
  ].filter(Boolean).join(" ").replace(/\s+/g, " ").trim().slice(0, 240)
}

export function materialReviewSummary(items: ReviewableMaterialItem[]) {
  return items.reduce((summary, item) => {
    summary[materialReviewStatus(item)] += 1
    return summary
  }, { ready: 0, check: 0, missing: 0 })
}
