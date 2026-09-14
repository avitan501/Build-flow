import { expect, test } from "@playwright/test"
import { buildProcurementClientQuoteSummary } from "../lib/procurement-client-quote"
import { buildClientQuoteSummary, type QuoteComparisonItemRecord, type QuoteComparisonBidRecord } from "../lib/quote-comparison"
import type { FinalizedProcurementRoute } from "../lib/finalized-procurement-route"
import { generateClientQuotePdf } from "../lib/client-quote-pdf"
import { getDocumentProxy, extractText } from "unpdf"
import type { QuoteComparisonRecord } from "../lib/quote-comparison"
const items = [{ id: "a", description: "Valve", specification: "", quantity: 2, unit: "each", markup_percent: 50, client_unit_price: null }, { id: "b", description: "Pipe", specification: "", quantity: 1, unit: "each", markup_percent: 0, client_unit_price: 60 }] as QuoteComparisonItemRecord[]
const route = { id: "route", material_subtotal: 70, delivery_total: 30, supplier_tax_total: 7.5, landed_total: 107.5, items: [{ item_id: "a", unit_cost: 20, supplier_id: "A" }, { item_id: "b", unit_cost: 30, supplier_id: "B" }] } as FinalizedProcurementRoute
test("manual A/B allocations produce client costs without inventing a supplier", () => {
  const result = buildProcurementClientQuoteSummary(items, route, null, 10, 10)
  expect(result.lines.map((line) => line.supplierUnitCost)).toEqual([20, 30])
  expect(result.lines.map((line) => line.clientUnitPrice)).toEqual([30, 60])
  expect(result.supplierLandedCost).toBe(107.5)
  expect(result.clientMaterialSubtotal).toBe(120)
  expect(result.clientTaxAmount).toBe(13)
  expect(result.clientTotal).toBe(143)
  expect(result.complete).toBe(true)
})
test("legacy single supplier client totals remain exactly unchanged", () => {
  const bid = { delivery_charge: 10, tax_percent: 5, quote_comparison_prices: [{ item_id: "a", unit_price: 12, is_available: true }, { item_id: "b", unit_price: 22, is_available: true }] } as QuoteComparisonBidRecord
  expect(buildProcurementClientQuoteSummary(items, null, bid, 10, 10)).toEqual(buildClientQuoteSummary(items, bid, 10, 10))
})
test("partial finalized allocation does not enable client preparation", () => {
  expect(buildProcurementClientQuoteSummary(items, { ...route, items: route.items.slice(0, 1) }, null, 0, 0).complete).toBe(false)
})
test("real branded PDF uses mixed client totals and never supplier profit", async () => {
  const summary=buildProcurementClientQuoteSummary(items,route,null,10,10)
  const pdf=await generateClientQuotePdf({comparison:{quote_number:"MIX-001",job_address:"Test address",department:"Plumbing",client_message:"Test delivery"} as QuoteComparisonRecord,clientName:"Test client",createdAt:new Date("2026-09-14T12:00:00Z"),summary})
  const doc=await getDocumentProxy(new Uint8Array(pdf));
  const text=await extractText(doc,{mergePages:true});
  expect(text.text).toContain("$143.00");expect(text.text).toContain("Valve");expect(text.text).toContain("Pipe");
  expect(text.text).not.toContain("$107.50");expect(text.text.toLowerCase()).not.toContain("profit");
  await doc.loadingTask?.destroy();
})
