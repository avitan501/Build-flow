import { expect, test } from "@playwright/test"
import { buildSupplierQuoteMatchReview, quoteComparisonPrice, resolveQuoteAvailability } from "../lib/supplier-quote-safety"
import { matchSupplierQuoteItems } from "../lib/supplier-quote-routing"

const blank = { quantity: 2, unit_price: null, line_total: null }

test("legacy missing prices mean no quote, while totals and zero prices remain priced", () => {
  expect(resolveQuoteAvailability(blank)).toBe("not_quoted")
  expect(quoteComparisonPrice(blank)).toBeNull()
  expect(quoteComparisonPrice({ ...blank, line_total: 20 })).toEqual({ unit_price: 10, is_available: true })
  expect(quoteComparisonPrice({ ...blank, unit_price: 0 })).toEqual({ unit_price: 0, is_available: true })
  expect(quoteComparisonPrice({ ...blank, line_total: 0 })).toEqual({ unit_price: 0, is_available: true })
})

test("only explicit unavailable creates an unavailable comparison row", () => {
  expect(quoteComparisonPrice({ ...blank, availability_status: "unavailable", unit_price: 12 })).toEqual({ unit_price: null, is_available: false })
  expect(quoteComparisonPrice({ ...blank, availability_status: "not_quoted", unit_price: 12 })).toBeNull()
  expect(() => quoteComparisonPrice({ ...blank, availability_status: "priced" })).toThrow("valid unit price")
  expect(() => quoteComparisonPrice({ ...blank, availability_status: "priced", unit_price: -1 })).toThrow()
  expect(() => quoteComparisonPrice({ ...blank, availability_status: "priced", unit_price: Infinity })).toThrow()
})

test("exact quote-symbol normalized specifications do not need redundant confirmation", () => {
  const quote = [{ id: "q", description: "Valve", specification: '4"' }]
  const request = [{ id: "r", description: "Valve", specification: "4 in" }]
  expect(buildSupplierQuoteMatchReview(quote, request)).toEqual({
    matches: [{ item: quote[0], comparisonItem: request[0], needsConfirmation: false, reason: "" }], issues: [],
  })
  expect(buildSupplierQuoteMatchReview([{ ...quote[0], description: "Pipe", specification: "12'" }], [{ ...request[0], description: "Pipe", specification: "12 ft" }]).matches[0].needsConfirmation).toBe(false)
})

test("SKU identity cannot silently override a dimensional conflict or historical auto match", () => {
  const quote = [{ id: "q", item_code: "AB-123", description: "Valve", specification: "2 in", comparison_item_id: "r" }]
  const request = [{ id: "r", description: "Valve", specification: "SKU AB-123 · 4 in" }]
  const review = buildSupplierQuoteMatchReview(quote, request)
  expect(review.issues).toEqual([])
  expect(review.matches[0]).toMatchObject({ needsConfirmation: true, reason: expect.stringContaining("dimensions") })
  expect(buildSupplierQuoteMatchReview(quote, request, [{ quoteItemId: "q", comparisonItemId: "r" }]).matches[0].needsConfirmation).toBe(false)
  // The old matcher remains unchanged for historical request sync, not adopted as a safety check.
  expect(matchSupplierQuoteItems(quote, request)).toHaveLength(1)
})

test("matching SKU plus equivalent dimensions is safe but code substring is not identity", () => {
  const quote = [{ id: "q", item_code: "AB-123", description: "Supply valve", specification: '4"' }]
  const request = [{ id: "r", description: "Control valve", specification: "AB-123 · 4 in" }]
  expect(buildSupplierQuoteMatchReview(quote, request).matches[0].needsConfirmation).toBe(false)
  expect(buildSupplierQuoteMatchReview(quote, [{ ...request[0], specification: "AB-1234 · 4 in" }]).matches[0].needsConfirmation).toBe(true)
})

test("a rating or material substitution requires fresh approval even with matching SKU", () => {
  const quote = [{ id: "q", item_code: "AB-123", description: "Drywall", specification: "5/8 in · Regular" }]
  const request = [{ id: "r", description: "Drywall AB-123", specification: "5/8 in · Type X fire rated" }]
  expect(buildSupplierQuoteMatchReview(quote, request).matches[0]).toMatchObject({ needsConfirmation: true, reason: expect.stringContaining("rating") })
})

test("stale and duplicate saved manual targets block import without rerouting silently", () => {
  const request = [{ id: "r", description: "Valve", specification: "4 in" }]
  const quote = { id: "q", description: "Valve", specification: "4 in", comparison_item_id: "outside" }
  expect(buildSupplierQuoteMatchReview([quote], request)).toMatchObject({ matches: [], issues: [expect.stringContaining("no longer")] })
  const duplicate = buildSupplierQuoteMatchReview([{ ...quote, comparison_item_id: "r" }, { ...quote, id: "q2", comparison_item_id: "r" }], request)
  expect(duplicate.matches).toEqual([])
  expect(duplicate.issues).toEqual([expect.stringContaining("only one")])
})

test("uncertain wording requires current matching approval, not a stale or unrelated pair", () => {
  const quote = [{ id: "q", description: "Epoxy valve assembly", specification: "4 in", comparison_item_id: "r" }]
  const request = [{ id: "r", description: "Control valve", specification: "4 in" }]
  expect(buildSupplierQuoteMatchReview(quote, request).matches[0].needsConfirmation).toBe(true)
  expect(buildSupplierQuoteMatchReview(quote, request, [{ quoteItemId: "q", comparisonItemId: "r" }])).toMatchObject({ matches: [{ needsConfirmation: false }], issues: [] })
  const bad = buildSupplierQuoteMatchReview(quote, request, [{ quoteItemId: "q", comparisonItemId: "outside" }])
  expect(bad.matches[0].needsConfirmation).toBe(true)
  expect(bad.issues.length).toBeGreaterThan(0)
})

test("partial quotes do not invent matches for missing client rows", () => {
  const quote = [{ id: "q", description: "Valve", specification: "4 in" }]
  const request = [{ id: "r", description: "Valve", specification: "4 in" }, { id: "missing", description: "Pipe", specification: "2 in" }]
  const result = buildSupplierQuoteMatchReview(quote, request)
  expect(result.issues).toEqual([])
  expect(result.matches.map(({ comparisonItem }) => comparisonItem.id)).toEqual(["r"])
})

test("unresolved generic lines ask for a match rather than choosing an arbitrary inlet or outlet", () => {
  const quote = [{ id: "q", description: "Control valve", specification: "4 in" }]
  const request = [{ id: "in", description: "Control valve", specification: "4 in · inlet" }, { id: "out", description: "Control valve", specification: "4 in · outlet" }]
  const result = buildSupplierQuoteMatchReview(quote, request)
  expect(result.matches).toEqual([])
  expect(result.issues).toEqual([expect.stringContaining("Choose a client item")])
})

