import { expect, test } from "@playwright/test"
import { finalizedRouteSourceError, requestRouteSnapshot } from "../lib/finalized-procurement-route"
import type { QuoteComparisonItemRecord } from "../lib/quote-comparison"
const original = { id: "source", name: "Valve", quantity: 2, unit: "each", department: "Plumbing", metadata: { review_status: "ready" } }
const compared = { id: "item", source_request_item_id: "source", description: "Valve", specification: "Plumbing", quantity: 2, unit: "each" } as QuoteComparisonItemRecord
test("full current source coverage passes without requiring one supplier", () => { expect(finalizedRouteSourceError([original], [compared])).toBeNull() })
test("partial coverage and changed quantities cannot finalize", () => {
  expect(finalizedRouteSourceError([original], [])).toBeTruthy()
  expect(finalizedRouteSourceError([original], [{ ...compared, quantity: 1 }])).toBeTruthy()
  expect(finalizedRouteSourceError([original], [compared, compared])).toBeTruthy()
})
test("unresolved source and changed specification remain blocked", () => {
  expect(finalizedRouteSourceError([{ ...original, metadata: { needs_review: true } }], [compared])).toBeTruthy()
  expect(finalizedRouteSourceError([original], [{ ...compared, specification: "Other" }])).toBeTruthy()
})
test("raw snapshot retains attachment fences and predictable null fields", () => {
  const item = { ...original, metadata: { ...original.metadata, source_file_change: { revision: "changed" } } }
  expect(requestRouteSnapshot([item])[0]).toMatchObject({ qualification_status: null, metadata: item.metadata })
  expect(requestRouteSnapshot([item])).not.toEqual(requestRouteSnapshot([original]))
})
