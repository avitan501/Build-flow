import { expect, test } from "@playwright/test"
import { requestStep1CompletionError, requestStep2CompletionError } from "../lib/request-step-completion"
import { requestItemSpecification } from "../lib/supplier-quote-routing"
import type { ReviewableMaterialItem } from "../lib/client-material-review"
import type { QuoteComparisonBidRecord, QuoteComparisonItemRecord } from "../lib/quote-comparison"

const request: ReviewableMaterialItem = { id: "source", name: "Valve", department: "Plumbing", quantity: 2, unit: "each", metadata: { review_status: "ready", supplier_route_names: ["Supply A"] } }
function comparisonItem(source = request): QuoteComparisonItemRecord {
  return { id: `comparison-${source.id}`, comparison_id: "comparison", source_request_item_id: source.id, description: source.name, specification: requestItemSpecification(source.metadata, source.department), quantity: source.quantity, unit: source.unit!, markup_percent: 0, client_unit_price: null, sort_order: 0, created_at: "", updated_at: "" }
}
function bid(items = [comparisonItem()]): QuoteComparisonBidRecord {
  return { id: "bid", comparison_id: "comparison", supplier_id: "supplier", supplier_name_snapshot: "Supply A", trust_level_snapshot: "verified", delivery_charge: 0, tax_amount: 0, tax_percent: 0, lead_time_days: 0, notes: "", status: "awarded", created_at: "", updated_at: "", quote_comparison_prices: items.map((item) => ({ bid_id: "bid", item_id: item.id, unit_price: 0, is_available: true, notes: "" })) }
}

test("step1 accepts ready discrete originals without requiring AI", () => {
  expect(requestStep1CompletionError([request])).toBeNull()
  expect(requestStep1CompletionError([])).toContain("at least 1")
})
test("step1 rejects unfinished raw sources and stale or processing organization", () => {
  const raw = { ...request, name: "Free-text material list" }
  expect(requestStep1CompletionError([raw])).toContain("free-text")
  for (const status of ["queued", "processing", "retrying", "draft_changed", "failed"]) {
    expect(requestStep1CompletionError([{ ...request, metadata: { ...request.metadata, ai_organization_status: status } }])).toContain("pending")
  }
  const organized = { ...request, id: "organized", metadata: { ...request.metadata, ai_organized: true, source_item_id: raw.id } }
  expect(requestStep1CompletionError([raw, organized])).toBeNull()
})
test("step1 validates actual quantity/unit rather than UI fallback defaults", () => {
  for (const quantity of [0, -1, NaN, Infinity]) expect(requestStep1CompletionError([{ ...request, quantity }])).toContain("quantity")
  for (const unit of [null, "", "unknown", "unspecified", "n/a"]) expect(requestStep1CompletionError([{ ...request, unit }])).toContain("unit")
  expect(requestStep1CompletionError([{ ...request, name: " " }])).toContain("name")
})
test("step1 requires review and an actual nonempty named supplier route for each row", () => {
  expect(requestStep1CompletionError([{ ...request, metadata: { ...request.metadata, review_status: "check" } }])).toContain("Review 1")
  expect(requestStep1CompletionError([{ ...request, metadata: { ...request.metadata, needs_review: true } }])).toContain("Review 1")
  for (const routes of [undefined, [], [" "], [123]]) expect(requestStep1CompletionError([{ ...request, metadata: { supplier_route_names: routes } }])).toContain("Choose a supplier for 1")
})
test("step2 accepts exact current saved coverage with valid zero prices and metadata", () => {
  expect(requestStep2CompletionError([request], [comparisonItem()], bid())).toBeNull()
  expect(requestStep2CompletionError([request], [comparisonItem()], undefined)).toContain("saved supplier")
})
test("step2 rejects missing, extra and duplicate comparison source coverage", () => {
  expect(requestStep2CompletionError([request], [], bid())).toContain("1 missing")
  const extra = { ...comparisonItem(), id: "extra", source_request_item_id: "old" }
  expect(requestStep2CompletionError([request], [comparisonItem(), extra], bid())).toContain("1 extra")
  expect(requestStep2CompletionError([request], [comparisonItem(), { ...comparisonItem(), id: "duplicate" }], bid())).toContain("1 duplicate")
})
test("step2 rejects stale requested quantity, unit, description and specification", () => {
  for (const patch of [{ quantity: 3 }, { unit: "box" }, { description: "Other valve" }, { specification: "Old spec" }]) {
    expect(requestStep2CompletionError([request], [{ ...comparisonItem(), ...patch }], bid())).toContain("1 changed")
  }
  expect(requestStep2CompletionError([request], [{ ...comparisonItem(), unit: "ea" }], bid())).toBeNull()
})
test("step2 rejects unrelated comparison or duplicate/unrelated price rows", () => {
  expect(requestStep2CompletionError([request], [{ ...comparisonItem(), comparison_id: "other" }], bid())).toContain("another comparison")
  const selected = bid()
  selected.quote_comparison_prices!.push({ ...selected.quote_comparison_prices![0] })
  expect(requestStep2CompletionError([request], [comparisonItem()], selected)).toContain("duplicate")
  expect(requestStep2CompletionError([request], [comparisonItem()], { ...bid(), quote_comparison_prices: [{ ...bid().quote_comparison_prices![0], bid_id: "other" }] })).toContain("unrelated")
})
test("step2 blocks partial, unavailable and invalid prices without inventing a completion", () => {
  expect(requestStep2CompletionError([request], [comparisonItem()], { ...bid(), quote_comparison_prices: [] })).toContain("1 missing")
  for (const patch of [{ unit_price: null }, { unit_price: -1 }, { unit_price: NaN }, { is_available: false }]) {
    expect(requestStep2CompletionError([request], [comparisonItem()], { ...bid(), quote_comparison_prices: [{ ...bid().quote_comparison_prices![0], ...patch }] })).toContain("1 missing")
  }
})
test("step2 requires existing award eligibility without adding an optional lead-time blocker", () => {
  for (const patch of [{ trust_level_snapshot: "do-not-use" as const }, { status: "declined" as const }]) expect(requestStep2CompletionError([request], [comparisonItem()], { ...bid(), ...patch })).toContain("eligible")
  for (const patch of [{ delivery_charge: NaN }, { tax_percent: 101 }]) expect(requestStep2CompletionError([request], [comparisonItem()], { ...bid(), ...patch })).toContain("delivery and tax")
  expect(requestStep2CompletionError([request], [comparisonItem()], { ...bid(), lead_time_days: null })).toBeNull()
})
test("step2 rejects unresolved product matches but accepts exact saved matching", () => {
  for (const notes of ["Valve", "Unrelated item"]) expect(requestStep2CompletionError([request], [comparisonItem()], { ...bid(), quote_comparison_prices: [{ ...bid().quote_comparison_prices![0], notes }] })).toContain("Confirm 1")
  expect(requestStep2CompletionError([request], [comparisonItem()], { ...bid(), quote_comparison_prices: [{ ...bid().quote_comparison_prices![0], notes: "Valve Plumbing" }] })).toBeNull()
})
