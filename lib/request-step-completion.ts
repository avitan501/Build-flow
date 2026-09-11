import { materialReviewStatus, type ReviewableMaterialItem } from "@/lib/client-material-review"
import { analyzeQuoteComparison, quoteLineMatchStatus, type QuoteComparisonBidRecord, type QuoteComparisonItemRecord } from "@/lib/quote-comparison"
import { effectiveRequestComparisonItems, requestItemSpecification } from "@/lib/supplier-quote-routing"
import { normalizeSupplierQuoteUnit } from "@/lib/supplier-quote-pricing"
import { isRequestIntakePlaceholder } from "@/lib/request-intake-placeholder"

function normalized(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").toLowerCase() : ""
}

function validUnit(value: unknown) {
  return !["", "unspecified", "quantity required", "unknown", "n/a"].includes(normalized(value))
}

function currentItemsError(requestItems: ReviewableMaterialItem[]) {
  const unfinished = requestItems.filter((item) => ["queued", "processing", "retrying", "draft_changed", "failed"].includes(normalized(item.metadata?.ai_organization_status)))
  if (unfinished.length) return `Finish organizing ${unfinished.length} changed or pending request source(s).`
  const rawSources = requestItems.filter(isRequestIntakePlaceholder)
  const represented = new Set(requestItems.filter((item) => item.metadata?.ai_organized === true).map((item) => item.metadata?.source_item_id))
  const unresolved = rawSources.filter((item) => !represented.has(item.id))
  if (unresolved.length) return `Organize or replace ${unresolved.length} free-text request source(s) with material rows.`
  const items = effectiveRequestComparisonItems(requestItems)
  if (!items.length) return "Add at least 1 material before completing this step."
  if (new Set(items.map((item) => item.id)).size !== items.length) return "Reload and resolve duplicate material rows before completing."
  const invalid = items.filter((item) => !normalized(item.name) || !Number.isFinite(item.quantity) || item.quantity <= 0 || !validUnit(item.unit))
  if (invalid.length) return `Check the name, quantity and unit on ${invalid.length} material(s).`
  const unreviewed = items.filter((item) => materialReviewStatus(item) !== "ready" || ["missing", "check"].includes(normalized(item.metadata?.review_status)) || item.metadata?.needs_review === true)
  if (unreviewed.length) return `Review ${unreviewed.length} material(s) before completing this step.`
  return null
}

export function requestStep1CompletionError(requestItems: ReviewableMaterialItem[]): string | null {
  const error = currentItemsError(requestItems)
  if (error) return error
  const unrouted = effectiveRequestComparisonItems(requestItems).filter((item) => !Array.isArray(item.metadata?.supplier_route_names) || !item.metadata.supplier_route_names.some((name) => typeof name === "string" && Boolean(name.trim())))
  return unrouted.length ? `Choose a supplier for ${unrouted.length} material(s).` : null
}

export function requestStep2CompletionError(
  requestItems: ReviewableMaterialItem[],
  comparisonItems: QuoteComparisonItemRecord[],
  selectedBid: QuoteComparisonBidRecord | undefined,
): string | null {
  const currentError = currentItemsError(requestItems)
  if (currentError) return currentError
  if (!selectedBid) return "Select a saved supplier route in Compare products first."
  const currentItems = effectiveRequestComparisonItems(requestItems)
  const currentById = new Map(currentItems.map((item) => [item.id, item]))
  const sourceIds = comparisonItems.map((item) => item.source_request_item_id)
  const covered = new Set(sourceIds)
  const missing = currentItems.filter((item) => !covered.has(item.id)).length
  const extra = comparisonItems.filter((item) => !item.source_request_item_id || !currentById.has(item.source_request_item_id)).length
  const duplicates = Math.max(comparisonItems.length - covered.size, comparisonItems.length - new Set(comparisonItems.map((item) => item.id)).size)
  if (missing || extra || duplicates) {
    return `Refresh the comparison: ${missing} missing, ${extra} extra and ${duplicates} duplicate source row(s).`
  }
  if (comparisonItems.some((item) => item.comparison_id !== selectedBid.comparison_id)) return "Reload the selected route; its material rows belong to another comparison."
  const stale = comparisonItems.filter((item) => {
    const current = currentById.get(item.source_request_item_id!)!
    return item.quantity !== current.quantity
      || !validUnit(item.unit)
      || normalizeSupplierQuoteUnit(item.unit) !== normalizeSupplierQuoteUnit(current.unit)
      || normalized(item.description) !== normalized(current.name)
      || normalized(item.specification) !== normalized(requestItemSpecification(current.metadata, current.department))
  })
  if (stale.length) return `Refresh prices for ${stale.length} changed material(s) before completing.`
  const prices = selectedBid.quote_comparison_prices ?? []
  const comparisonIds = new Set(comparisonItems.map((item) => item.id))
  if (new Set(prices.map((price) => price.item_id)).size !== prices.length || prices.some((price) => price.bid_id !== selectedBid.id || !comparisonIds.has(price.item_id))) {
    return "Reload the selected route and resolve duplicate or unrelated price rows."
  }
  const analysis = analyzeQuoteComparison(comparisonItems, [selectedBid])[0]
  if (!analysis || analysis.blocked) return "Choose an eligible supplier route before completing."
  if (analysis.missingItemCount) return `Finish ${analysis.missingItemCount} missing or unavailable material price(s).`
  if (!analysis.eligible) return "Complete the selected route's delivery and tax before completing."
  const byItem = new Map(prices.map((price) => [price.item_id, price]))
  const unconfirmed = comparisonItems.filter((item) => ["possible", "review"].includes(quoteLineMatchStatus(item, byItem.get(item.id)?.notes ?? "")))
  return unconfirmed.length ? `Confirm ${unconfirmed.length} supplier product match(es) in Compare products.` : null
}
