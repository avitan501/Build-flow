import { test, expect } from "@playwright/test"
import { isRequestIntakePlaceholder } from "../lib/request-intake-placeholder"
import { effectiveRequestComparisonItems } from "../lib/supplier-quote-routing"
import { requestStep1CompletionError } from "../lib/request-step-completion"

for (const name of ["Free-text material list", "Construction quote request", "Beat a store quote"]) {
  test(`${name} stays an original document, not a ready priced product`, () => {
    const item = { id: "source", name, quantity: 1, unit: "request", department: "General request", metadata: { request_details: "Unverified roofing RFQ; HOLD quantities", review_status: "ready" } }
    expect(isRequestIntakePlaceholder(item)).toBe(true)
    expect(effectiveRequestComparisonItems([item])).toEqual([])
    expect(requestStep1CompletionError([item])).not.toBeNull()
    expect(item.metadata.request_details).toContain("HOLD")
  })
}
test("ordinary manual products and extracted rows remain intact", () => {
  expect(isRequestIntakePlaceholder({ name: "Plywood", unit: "pieces" })).toBe(false)
  expect(isRequestIntakePlaceholder({ name: "Construction quote request", unit: "pieces" })).toBe(false)
  expect(isRequestIntakePlaceholder({ name: "Construction quote request", unit: "request", metadata: { ai_organized: true } })).toBe(false)
})
