import { expect, test } from "@playwright/test"
import { buildMixedSupplierAnalysis, type QuoteComparisonItemRecord, type QuoteComparisonBidRecord } from "../lib/quote-comparison"
const items = [{ id: "a", description: "Valve", specification: "", quantity: 2, unit: "each" }, { id: "b", description: "Pipe", specification: "", quantity: 1, unit: "each" }] as QuoteComparisonItemRecord[]
function bid(id: string, itemId: string): QuoteComparisonBidRecord {
  return { id, supplier_id: id, supplier_name_snapshot: id, status: "received", trust_level_snapshot: "verified", delivery_charge: 10, tax_percent: 5, lead_time_days: 3, quote_comparison_prices: [{ bid_id: id, item_id: itemId, unit_price: 20, is_available: true, notes: itemId === "a" ? "Valve" : "Pipe" }] } as QuoteComparisonBidRecord
}
test("mixed supplier metadata must be known before complete landed cost", () => {
  for (const field of ["delivery_charge", "tax_percent", "lead_time_days"] as const) {
    const second = { ...bid("B", "b"), [field]: null } as unknown as QuoteComparisonBidRecord
    const result = buildMixedSupplierAnalysis(items, [bid("A", "a"), second])
    expect(result.pricedItemCount).toBe(field === "lead_time_days" ? 2 : 1)
    expect(result.complete).toBe(field === "lead_time_days")
    if (field === "lead_time_days") {
      expect(result.leadTimeDays).toBeNull()
    } else expect(result.missingFields.join(" ")).toContain("material price")
  }
})
test("invalid tax or negative costs cannot masquerade as complete", () => {
  for (const patch of [{ tax_percent: 101 }, { delivery_charge: -1 }]) {
    expect(buildMixedSupplierAnalysis(items, [bid("A", "a"), { ...bid("B", "b"), ...patch }]).complete).toBe(false)
  }
  const unknownLead = buildMixedSupplierAnalysis(items, [bid("A", "a"), { ...bid("B", "b"), lead_time_days: Number.NaN }])
  expect(unknownLead.complete).toBe(true)
  expect(unknownLead.leadTimeDays).toBeNull()
})
test("explicit zero delivery/tax/lead time stays valid and each supplier is charged once", () => {
  const result = buildMixedSupplierAnalysis(items, [bid("A", "a"), { ...bid("B", "b"), delivery_charge: 0, tax_percent: 0, lead_time_days: 0 }])
  expect(result.complete).toBe(true)
  expect(result.materialSubtotal).toBe(60)
  expect(result.deliveryCharge).toBe(10)
  expect(result.taxAmount).toBe(2.5)
  expect(result.landedTotal).toBe(72.5)
  expect(result.leadTimeDays).toBe(3)
})
test("unused suppliers with unknown freight do not block a complete selected split", () => {
  const unused = { ...bid("unused", "missing"), delivery_charge: Number.NaN, lead_time_days: null }
  expect(buildMixedSupplierAnalysis(items, [bid("A", "a"), bid("B", "b"), unused]).complete).toBe(true)
})
