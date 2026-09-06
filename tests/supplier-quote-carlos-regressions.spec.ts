import { expect, test } from "@playwright/test"

import { normalizeSupplierQuoteAiPayload } from "../lib/supplier-quote-ai"
import { parseSupplierQuoteMetadata, parseSupplierQuoteText } from "../lib/supplier-quote-parser"
import { matchRequestClientQuoteItems } from "../lib/client-quote-import"
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

test("reads a wrapped Home Depot or Lowe's quote before importing client target prices", () => {
  const source = [
    "Quote #: HD-PRO-99381204",
    "Valid Through: 10/06/2026",
    "101-4521 Vinyl Siding Panel, Double 4.5\" Clapboard,",
    "Colonial White, 12' panel",
    "40 EA $18.98 $759.20",
    "101-4526 Aluminum Fascia Coil Stock, .019\", White 3 ROL $84.00 $252.00",
    "101-4529 SS Ring-Shank Siding Nails, 2\", 5lb box 5 BX $31.97 $159.85",
    "Delivery: $125.00",
    "Sales Tax (8.875%): $335.84",
  ].join("\n")
  const rows = parseSupplierQuoteText(source)
  const metadata = parseSupplierQuoteMetadata(source)

  expect(rows).toEqual([
    expect.objectContaining({ itemCode: "101-4521", description: expect.stringContaining("Vinyl Siding Panel"), quantity: 40, unitPrice: 18.98, lineTotal: 759.2 }),
    expect.objectContaining({ itemCode: "101-4526", description: expect.stringContaining("Aluminum Fascia Coil Stock"), quantity: 3, unitPrice: 84, lineTotal: 252 }),
    expect.objectContaining({ itemCode: "101-4529", description: expect.stringContaining("Ring-Shank Siding Nails"), quantity: 5, unitPrice: 31.97, lineTotal: 159.85 }),
  ])
  expect(metadata).toMatchObject({ quoteNumber: "HD-PRO-99381204", expiresOn: "2026-10-06", deliveryCharge: 125, taxPercent: 8.875 })

  const matches = matchRequestClientQuoteItems(rows, [
    { id: "siding", description: "Vinyl siding panel", specification: "SKU 101-4521" },
    { id: "fascia", description: "Aluminum fascia coil stock", specification: "SKU 101-4526" },
    { id: "nails", description: "Stainless steel ring-shank siding nails", specification: "SKU 101-4529" },
  ])
  expect(matches.matches.map((match) => match.comparisonItemId)).toEqual(["siding", "fascia", "nails"])
})
