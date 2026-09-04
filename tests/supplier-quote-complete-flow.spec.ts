import { expect, test } from "@playwright/test"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { extractText, getDocumentProxy } from "unpdf"

import { buildClientReadyToPaySummary, buildQuoteBuyingOptions, type QuoteComparisonBidRecord, type QuoteComparisonItemRecord } from "../lib/quote-comparison"
import { parseSupplierQuoteMetadata, parseSupplierQuoteText } from "../lib/supplier-quote-parser"
import { matchSupplierQuoteItems } from "../lib/supplier-quote-routing"

const fixture = "/tmp/avantia-qa-complete-supplier-quote-20260904.pdf"

test("complete supplier PDF preserves rows, delivery, tax, lead time, totals, and profit", async () => {
  let sourceText: string
  try {
    const bytes = await readFile(fixture)
    const pdf = await getDocumentProxy(new Uint8Array(bytes))
    const text = await extractText(pdf, { mergePages: true })
    await pdf.loadingTask?.destroy()
    sourceText = text.text
  } catch {
    sourceText = await readFile(path.join(process.cwd(), "tests/fixtures/qa-complete-supplier-quote.txt"), "utf8")
  }
  const extracted = { items: parseSupplierQuoteText(sourceText), metadata: parseSupplierQuoteMetadata(sourceText) }

  expect(extracted.items).toHaveLength(3)
  expect(extracted.items).toEqual(expect.arrayContaining([
    expect.objectContaining({ description: expect.stringContaining("Engineered white oak flooring"), quantity: 1200, unit: "sq. ft.", unitPrice: 5.8, lineTotal: 6960 }),
    expect.objectContaining({ description: "Flooring adhesive", quantity: 12, unit: "buckets", unitPrice: 92, lineTotal: 1104 }),
    expect.objectContaining({ description: "Flooring underlayment", quantity: 6, unit: "rolls", unitPrice: 48, lineTotal: 288 }),
  ]))
  expect(extracted.metadata).toMatchObject({
    quoteNumber: "QA-20260904-001",
    expiresOn: "2026-09-11",
    deliveryCharge: 350,
    taxPercent: 8.875,
    subtotal: 8352,
    total: 9474.3,
    leadTimeDays: 3,
  })

  const requestItems: QuoteComparisonItemRecord[] = [
    { id: "flooring", comparison_id: "comparison", description: "Engineered white oak flooring", specification: "7 in wide", quantity: 1200, unit: "sq. ft.", markup_percent: 0, client_unit_price: 6.5, sort_order: 0, created_at: "", updated_at: "" },
    { id: "adhesive", comparison_id: "comparison", description: "Flooring adhesive", specification: "", quantity: 12, unit: "buckets", markup_percent: 0, client_unit_price: 110, sort_order: 1, created_at: "", updated_at: "" },
    { id: "underlayment", comparison_id: "comparison", description: "Flooring underlayment", specification: "", quantity: 6, unit: "rolls", markup_percent: 0, client_unit_price: 60, sort_order: 2, created_at: "", updated_at: "" },
  ]
  const matches = matchSupplierQuoteItems(extracted.items.map((item, index) => ({ id: `quote-${index}`, ...item })), requestItems)
  expect(matches.map((match) => match.comparisonItem.id)).toEqual(["flooring", "adhesive", "underlayment"])

  const bid: QuoteComparisonBidRecord = {
    id: "bid", comparison_id: "comparison", source_supplier_quote_id: "source-quote", supplier_id: "qa-test-supplier",
    supplier_name_snapshot: "QA TEST SUPPLIER", trust_level_snapshot: "verified", delivery_charge: extracted.metadata.deliveryCharge ?? 0,
    tax_amount: 0, tax_percent: extracted.metadata.taxPercent ?? 0, lead_time_days: extracted.metadata.leadTimeDays,
    notes: "", status: "received", created_at: "", updated_at: "",
    quote_comparison_prices: matches.map(({ item, comparisonItem }) => ({ bid_id: "bid", item_id: comparisonItem.id, unit_price: item.unitPrice, is_available: item.unitPrice !== null, notes: item.description })),
  }
  const clientTarget = buildClientReadyToPaySummary(requestItems, 500, 8.875)
  const [option] = buildQuoteBuyingOptions(requestItems, [bid], clientTarget)
  expect(option.supplierTotal).toBe(9474.3)
  expect(option.clientTotal).toBe(10865.73)
  expect(option.estimatedGrossProfit).toBe(505.7)
  expect(option.leadTimeDays).toBe(3)
  expect(option.selectable).toBe(true)

  const partialMatches = matchSupplierQuoteItems(extracted.items.slice(0, 2).map((item, index) => ({ id: `partial-${index}`, ...item })), requestItems)
  expect(partialMatches).toHaveLength(2)
  expect(partialMatches.some((match) => match.comparisonItem.id === "underlayment")).toBe(false)
})
