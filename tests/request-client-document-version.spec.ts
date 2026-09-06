import { expect, test } from "@playwright/test"

import { requestClientDocumentContentMatches } from "../lib/request-client-document-version"

test("document comparison ignores object key order and undefined values", () => {
  expect(requestClientDocumentContentMatches(
    { lines: [{ quantity: 2, description: "Drywall" }], deliveryCharge: 25 },
    { deliveryCharge: 25, ignored: undefined, lines: [{ description: "Drywall", quantity: 2 }] },
  )).toBe(true)
})

test("document comparison detects client-visible changes", () => {
  const current = { lines: [{ description: "Drywall", quantity: 2, unitPrice: 15 }], attachments: [{ id: "one" }] }
  expect(requestClientDocumentContentMatches(current, { ...current })).toBe(true)
  expect(requestClientDocumentContentMatches(current, { ...current, lines: [{ description: "Drywall", quantity: 3, unitPrice: 15 }] })).toBe(false)
  expect(requestClientDocumentContentMatches(current, { ...current, attachments: [{ id: "two" }] })).toBe(false)
})
