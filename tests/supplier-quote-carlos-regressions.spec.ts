import { expect, test } from "@playwright/test"

import { normalizeSupplierQuoteAiPayload } from "../lib/supplier-quote-ai"
import { parseSupplierQuoteText } from "../lib/supplier-quote-parser"
import { supplierQuoteComparableUnitPrice, supplierQuoteLineTotal } from "../lib/supplier-quote-pricing"
import { matchSupplierQuoteItems } from "../lib/supplier-quote-routing"

test("keeps a supplier's printed total and normalizes ML/MS without multiplying twice", () => {
  const result = normalizeSupplierQuoteAiPayload({
    metadata: {},
    items: [
      { itemCode: "A", description: "Framing lumber", specification: "", quantity: 2, unit: "M/L", unitPrice: 725, lineTotal: 1450 },
      { itemCode: "B", description: "Plywood", specification: "", quantity: 1.5, unit: "MS", unitPrice: 900, lineTotal: 1350 },
    ],
    notes: "",
  })

  expect(result.items.map((item) => [item.unit, item.lineTotal])).toEqual([
    ["1,000 lin. ft.", 1450],
    ["1,000 sq. ft.", 1350],
  ])
  expect(supplierQuoteLineTotal({ quantity: 1000, unitPrice: 7, lineTotal: 700 })).toBe(700)
  expect(supplierQuoteComparableUnitPrice({ quantity: 1000, unitPrice: 7, lineTotal: 700 })).toBe(0.7)
})

test("fallback parser recognizes thousand-linear and thousand-square-foot rows", () => {
  const rows = parseSupplierQuoteText([
    "LUM-1 2 M/L SPF framing lumber $725.00 $1,450.00",
    "PLY-1 1.5 M/S plywood sheathing $900.00 $1,350.00",
  ].join("\n"))
  expect(rows.map((item) => [item.unit, item.lineTotal])).toEqual([
    ["1,000 lin. ft.", 1450],
    ["1,000 sq. ft.", 1350],
  ])
})

test("a detailed supplier line can match a uniquely named client item with no printed size", () => {
  const supplier = [{ id: "supplier", description: "Neptune MACH 10 water meter", specification: "4 in · Model 53107-100" }]
  const client = [{ id: "client", description: "Neptune MACH 10 water meter", specification: "" }]
  expect(matchSupplierQuoteItems(supplier, client)).toEqual([{ item: supplier[0], comparisonItem: client[0] }])
})
