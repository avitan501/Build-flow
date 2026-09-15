import { test, expect } from "@playwright/test"
import { readFile } from "node:fs/promises"
import { supplierQuotePageText } from "../lib/supplier-quote-pdf-layout"
import { parseSupplierQuoteText, parseSupplierQuoteMetadata } from "../lib/supplier-quote-parser"
import { hasVerifiedSourceRows } from "../lib/supplier-quote-extraction-choice"
import { expandSupplierQuoteCutLists } from "../lib/supplier-quote-cut-list"

test("coordinates recover table order despite shuffled paint order and font baselines", () => {
  const span = (str: string, x: number, y: number, height = 9) => ({ str, height, transform: [height, 0, 0, height, x, y] })
  expect(supplierQuotePageText([
    span("$67.00", 450, 434.07, 8), span("35", 46, 433.99),
    span("Next row", 160, 420.91, 7), span("NI-40", 160, 435.91, 7),
    span("NI40912", 80, 433.99), span("2", 24, 433.99),
  ])).toBe("2 35 NI40912 NI-40 $67.00\nNext row")
  expect(supplierQuotePageText([{ str: "rotated", transform: [0, 9, -9, 0, 1, 1] }])).toBe("")
})

test("Certified fixture retains 39 rows, printed amounts, quantities and dual rates", async () => {
  const text = await readFile("tests/fixtures/certified-quote-31131-rows.txt", "utf8")
  const rows = parseSupplierQuoteText(text)
  expect(rows).toHaveLength(39)
  expect(rows.reduce((sum, row) => sum + Math.round(row.lineTotal! * 100), 0)).toBe(6061546)
  expect(rows[0]).toMatchObject({ itemCode: "NI40912", quantity: 35, unit: "each", unitPrice: 67, lineTotal: 2345 })
  expect(rows[0].specification).toContain("Length: 20 ft")
  expect(rows[0].specification).toContain("Sale/Ft: 3.350")
  expect(rows.at(-1)).toMatchObject({ quantity: 28, unitPrice: 169.12, lineTotal: 4735.36 })
  expect(rows.find(row => row.specification.includes("Document row: 11 ·"))).toMatchObject({ unitPrice: 10.883, lineTotal: 1632.51 })
  const meta = parseSupplierQuoteMetadata(text)
  expect(meta).toMatchObject({ quoteNumber: "31131", subtotal: 60615.46, total: 65843.54, deliveryCharge: 0, taxPercent: 8.625, expiresOn: "2026-09-25" })
  expect(hasVerifiedSourceRows(text, rows, meta.subtotal)).toBe(true)
  expect(hasVerifiedSourceRows(text, rows.slice(1), meta.subtotal)).toBe(false)
  expect(hasVerifiedSourceRows(text, rows, null)).toBe(false)
  expect(expandSupplierQuoteCutLists(rows)).toEqual(rows)
})

test("complete printed LF cuts become piece prices without changing source or subtotal", () => {
  const [source] = parseSupplierQuoteText("1ST FLOOR-----\n2092 10PWI32S PWI-32S joist LF 2.95 6171.40\n35/20’ 30/26’ 22/16’ 26/10’")
  const original = structuredClone(source)
  const rows = expandSupplierQuoteCutLists([source])
  expect(rows.map(row => [row.quantity, row.unitPrice, row.unit])).toEqual([[35,59,"each"],[30,76.7,"each"],[22,47.2,"each"],[26,29.5,"each"]])
  expect(rows.reduce((sum, row) => sum + Math.round(row.lineTotal! * 100), 0)).toBe(617140)
  expect(rows.every(row => row.specification.includes("Source pricing: 2092 LF at $2.95 = $6171.4"))).toBe(true)
  expect(source).toEqual(original)
  expect(expandSupplierQuoteCutLists([{ ...source, quantity: 2000 }])).toEqual([{ ...source, quantity: 2000 }])
  expect(expandSupplierQuoteCutLists([{ ...source, lineTotal: 6172 }])).toEqual([{ ...source, lineTotal: 6172 }])
  expect(expandSupplierQuoteCutLists([{ ...source, unit: "box" }])).toEqual([{ ...source, unit: "box" }])
})
