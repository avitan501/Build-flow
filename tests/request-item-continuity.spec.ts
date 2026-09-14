import { expect, test } from "@playwright/test"
import { canonicalItemValue, hasIncomingItemRevision, nextUnresolvedItem, readItemResume } from "../lib/request-item-continuity"

const product = (id: string, missing = false) => ({ id, name: "CDX plywood", department: "Framing", quantity: 60, unit: "sheets", metadata: { ai_organized: true, review_status: missing ? "missing" : "ready", review_reasons: missing ? ["Plywood sheet dimensions are missing"] : [] } })

test("late server props cannot replace accepted action data with an old version", () => {
  expect(hasIncomingItemRevision("old", "saved", "old")).toBe(false)
  expect(hasIncomingItemRevision("saved", "saved", "old")).toBe(false)
  expect(hasIncomingItemRevision("coworker", "saved", "old")).toBe(true)
  expect(hasIncomingItemRevision("new-source", "saved", "old")).toBe(true)
})

test("next unresolved wraps through 62 products without mutating questions", () => {
  const items = Array.from({ length: 62 }, (_, index) => product(String(index), index === 7 || index === 61))
  const before = JSON.stringify(items)
  expect(nextUnresolvedItem(items)).toBe("7")
  expect(nextUnresolvedItem(items, "7")).toBe("61")
  expect(nextUnresolvedItem(items, "61")).toBe("7")
  expect(JSON.stringify(items)).toBe(before)
  expect(nextUnresolvedItem([product("done")])).toBeNull()
  expect(nextUnresolvedItem([])).toBeNull()
})

test("resume rejects deleted products and strips every field except product/question IDs", () => {
  expect(readItemResume(JSON.stringify({ itemId: "a", field: "dimensions", pdf: "private", text: "private", price: 3 }), ["a"])).toEqual({ itemId: "a", field: "dimensions" })
  expect(readItemResume('{"itemId":"removed"}', ["a"])).toBeNull()
  expect(readItemResume("broken", ["a"])).toBeNull()
  expect(readItemResume('{"itemId":"a","field":"<script>"}', ["a"])).toEqual({ itemId: "a", field: null })
})

test("revision serialization ignores key order but detects field, quantity and source changes", () => {
  expect(canonicalItemValue({ a: 1, b: { x: 2, y: 3 } })).toBe(canonicalItemValue({ b: { y: 3, x: 2 }, a: 1 }))
  expect(canonicalItemValue(product("a"))).not.toBe(canonicalItemValue({ ...product("a"), quantity: 61 }))
})
