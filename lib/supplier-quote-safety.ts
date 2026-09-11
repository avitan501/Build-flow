import { supplierQuoteComparableUnitPrice } from "@/lib/supplier-quote-pricing"
import { matchSupplierQuoteItems } from "@/lib/supplier-quote-routing"

export type QuoteAvailability = "priced" | "not_quoted" | "unavailable"

export type QuoteAvailabilityItem = {
  availability_status?: QuoteAvailability | null
  unit_price: number | null
  line_total: number | null
  quantity: number
}

function comparablePrice(item: QuoteAvailabilityItem) {
  return supplierQuoteComparableUnitPrice({
    quantity: item.quantity,
    unitPrice: item.unit_price,
    lineTotal: item.line_total,
  })
}

/** Legacy rows are interpreted, never rewritten. A missing price is not an availability claim. */
export function resolveQuoteAvailability(item: QuoteAvailabilityItem): QuoteAvailability {
  if (item.availability_status != null) {
    if (!["priced", "not_quoted", "unavailable"].includes(item.availability_status)) {
      throw new Error("Choose priced, no quote, or unavailable for this supplier line.")
    }
    return item.availability_status
  }
  return comparablePrice(item) === null ? "not_quoted" : "priced"
}

/** null means no comparison price row, rather than an invented unavailable or zero-price row. */
export function quoteComparisonPrice(item: QuoteAvailabilityItem): { unit_price: number | null; is_available: boolean } | null {
  const availability = resolveQuoteAvailability(item)
  if (availability === "not_quoted") return null
  if (availability === "unavailable") return { unit_price: null, is_available: false }
  const unitPrice = comparablePrice(item)
  if (unitPrice === null || !Number.isFinite(unitPrice) || unitPrice < 0) {
    throw new Error("A priced supplier line needs a valid unit price or line total.")
  }
  return { unit_price: unitPrice, is_available: true }
}

export type QuoteMatchReviewItem = {
  id: string
  item_code?: string | null
  comparison_item_id?: string | null
  description: string
  specification: string
}

export type QuoteMatchReviewTarget = { id: string; description: string; specification: string }
export type ApprovedQuoteMatch = { quoteItemId: string; comparisonItemId: string }

// Import-only normalization. The legacy matcher also transfers historical prices
// during request synchronization, so its behavior must not change with this review gate.
function normalize(value: string) {
  return value.toLowerCase()
    .replace(/["“”″]/g, " in ")
    .replace(/['‘’′]/g, " ft ")
    .replace(/\b(inches|inch)\b/g, "in")
    .replace(/\b(feet|foot)\b/g, "ft")
    .replace(/\b(?:sheet\s*rock|she+t+ro+ck|sheet\s*rok|gypsum\s+(?:board|panel)|wall\s*board|wallboard|dry\s*wall)\b/g, "drywall")
    .replace(/\b(?:panel|placa)\s+de\s+yeso\b|\btablaroca\b/g, "drywall")
    .replace(/\b(?:assy|asy|asmy|assembl)\b/g, "assembly")
    .replace(/\b(?:vlv|valved)\b/g, "valve")
    .replace(/\bcapped\b/g, "cap")
    .replace(/\brpz\b/g, "reduced pressure zone backflow")
    .replace(/\bbfp\b/g, "backflow preventer")
    .replace(/\bos\s*&?\s*y\b|\bosy\b/g, "outside screw yoke")
    .replace(/[^a-z0-9./]+/g, " ")
    .replace(/\s+/g, " ").trim()
}

function measures(value: string) {
  // Do not read the trailing digits of AB-123 followed by 5/8 in as "123 5/8 in".
  const withoutCodes = value.replace(/\b[a-z]+[-./]?\d[a-z0-9./-]*\b/gi, " ")
  return [...new Set(normalize(withoutCodes).match(/\b\d+(?:\.\d+)?(?:\s+\d+\/\d+|\/\d+)?\s*(?:in|ft)\b|\b\d+(?:\.\d+)?(?:\s+x\s+\d+(?:\.\d+)?){1,2}(?:\s*(?:in|ft))?\b/g) ?? [])].sort()
}

function qualifiers(value: string) {
  const text = ` ${normalize(value)} `
  return ["regular", "type x", "fire rated", "moisture resistant", "mold resistant", "pressure treated", "untreated", "stainless", "galvanized", "copper", "brass", "pvc", "cpvc", "white", "black", "red", "blue", "threaded", "flanged"].filter((word) => text.includes(` ${word} `))
}

function wholeSku(requestText: string, code: string | null | undefined) {
  const raw = String(code ?? "").toLowerCase().trim()
  const key = raw.replace(/[^a-z0-9]/g, "")
  if (!(/[a-z]/.test(key) ? key.length >= 3 : key.length >= 5)) return false
  // Compare complete SKU-like tokens; never substring-match a longer retailer code.
  return (requestText.toLowerCase().match(/[a-z0-9]+(?:[-./][a-z0-9]+)*/g) ?? [])
    .some((token) => token.replace(/[^a-z0-9]/g, "") === key)
}

function reviewReason(item: QuoteMatchReviewItem, target: QuoteMatchReviewTarget) {
  const sourceText = `${item.description} ${item.specification}`
  const targetText = `${target.description} ${target.specification}`
  const sourceMeasures = measures(sourceText)
  const targetMeasures = measures(targetText)
  if (targetMeasures.length && sourceMeasures.join("|") !== targetMeasures.join("|")) {
    return "The requested and quoted dimensions differ or a requested dimension is missing. Confirm the alternative."
  }
  if (qualifiers(sourceText).join("|") !== qualifiers(targetText).join("|")) {
    return "The material, rating, color, or connection specification differs. Confirm the alternative."
  }
  if (normalize(sourceText) === normalize(targetText)) return ""
  if (!normalize(target.specification) && normalize(item.description) === normalize(target.description)) return ""
  if (wholeSku(targetText, item.item_code)) return ""
  return "The supplier wording is not an exact verified match. Confirm the client item or alternative."
}

export function buildSupplierQuoteMatchReview<TQuote extends QuoteMatchReviewItem, TTarget extends QuoteMatchReviewTarget>(
  quoteItems: TQuote[],
  requestItems: TTarget[],
  approvedPairs: ApprovedQuoteMatch[] = [],
): {
  matches: Array<{ item: TQuote; comparisonItem: TTarget; needsConfirmation: boolean; reason: string }>
  issues: string[]
} {
  const issues: string[] = []
  const targetById = new Map(requestItems.map((item) => [item.id, item]))
  const quoteById = new Map(quoteItems.map((item) => [item.id, item]))
  if (targetById.size !== requestItems.length || quoteById.size !== quoteItems.length) {
    return { matches: [], issues: ["Duplicate material row IDs must be resolved before comparing."] }
  }
  const manualCounts = new Map<string, number>()
  for (const item of quoteItems) {
    if (item.comparison_item_id) manualCounts.set(item.comparison_item_id, (manualCounts.get(item.comparison_item_id) ?? 0) + 1)
  }
  const validItems = quoteItems.filter((item) => {
    if (!item.comparison_item_id) return true
    if (!targetById.has(item.comparison_item_id)) {
      issues.push(`Choose a current client item for supplier row ${item.id}; its saved match is no longer in this request.`)
      return false
    }
    if ((manualCounts.get(item.comparison_item_id) ?? 0) > 1) {
      issues.push(`Match client item ${item.comparison_item_id} to only one supplier row.`)
      return false
    }
    return true
  })
  const normalizedItems = validItems.map((item) => ({ ...item, description: normalize(item.description), specification: normalize(item.specification) }))
  const normalizedTargets = requestItems.map((item) => ({ ...item, description: normalize(item.description), specification: normalize(item.specification) }))
  const approved = new Set(approvedPairs.map((pair) => `${pair.quoteItemId}:${pair.comparisonItemId}`))
  for (const pair of approvedPairs) {
    if (!quoteById.has(pair.quoteItemId) || !targetById.has(pair.comparisonItemId)) issues.push("An approved match is outside the selected quote or current request. Review it again.")
  }
  const matches = matchSupplierQuoteItems(normalizedItems, normalizedTargets).map(({ item: normalizedItem, comparisonItem: normalizedTarget }) => {
    const item = quoteById.get(normalizedItem.id)!
    const comparisonItem = targetById.get(normalizedTarget.id)!
    let reason = reviewReason(item, comparisonItem)
    // Check ambiguity against every original target, not just targets left after greedy allocation.
    const uniqueAutomatic = matchSupplierQuoteItems([{ ...normalizedItem, comparison_item_id: null }], normalizedTargets)
    if (!reason && !item.comparison_item_id && (uniqueAutomatic.length !== 1 || uniqueAutomatic[0].comparisonItem.id !== comparisonItem.id)) {
      reason = "More than one client item could fit this supplier row. Confirm the intended match."
    }
    return { item, comparisonItem, needsConfirmation: Boolean(reason) && !approved.has(`${item.id}:${comparisonItem.id}`), reason }
  })
  const matchedIds = new Set(matches.map(({ item }) => item.id))
  for (const item of validItems) {
    if (!matchedIds.has(item.id)) issues.push(`Choose a client item for supplier row ${item.id}, or deselect that line before comparing.`)
  }
  for (const pair of approvedPairs) {
    if (!matches.some(({ item, comparisonItem }) => item.id === pair.quoteItemId && comparisonItem.id === pair.comparisonItemId)) {
      issues.push("An approved match no longer matches the saved supplier row. Review it again.")
    }
  }
  return { matches, issues: [...new Set(issues)] }
}

