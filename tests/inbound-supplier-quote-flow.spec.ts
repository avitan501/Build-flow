import { expect, test } from "@playwright/test"
import { readFile } from "node:fs/promises"
import path from "node:path"

import { buildClientReadyToPaySummary, buildQuoteBuyingOptions, type QuoteComparisonBidRecord, type QuoteComparisonItemRecord } from "../lib/quote-comparison"
import { matchSupplierQuoteItems } from "../lib/supplier-quote-routing"

test("received email attachments enter a scoped review flow before comparison", async () => {
  const root = process.cwd()
  const [actions, loader, form, inbox, migration] = await Promise.all([
    readFile(path.join(root, "app/admin/supplier-quotes/actions.ts"), "utf8"),
    readFile(path.join(root, "lib/aura/inbound-supplier-quote.ts"), "utf8"),
    readFile(path.join(root, "components/buildflow/supplier-quote-upload-form.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/aura-communication-workspace.tsx"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260904023000_link_supplier_quotes_to_inbound_email.sql"), "utf8"),
  ])

  expect(inbox).toContain("Review as supplier quote")
  expect(form).toContain('name="sourceCommunicationId"')
  expect(form).toContain("Choose the correct client request and supplier")
  expect(loader).toContain('.eq("direction", "incoming")')
  expect(loader).toContain('.eq("channel", "email")')
  expect(loader).toContain("expectedPrefix")
  expect(migration).toContain("supplier_quotes_inbound_attachment_uidx")
  expect(actions).toContain("This received quote is already stored")
  expect(actions).toContain('quote.status === "needs_review"')
  expect(actions).toContain("Only reviewed and saved supplier rows can be compared")
  expect(actions).toContain("comparison.client_id !== quote.client_id")
  expect(actions).toContain('quoteError.code === "23505"')
  expect(actions).toContain("ignoredExistingIds")
})

test("comparison routing refreshes only the dedicated quote bid and permits unmatched rows", async () => {
  const actions = await readFile(path.join(process.cwd(), "app/admin/supplier-quotes/actions.ts"), "utf8")
  expect(actions).toContain('.eq("source_supplier_quote_id", quote.id)')
  expect(actions).toContain('.delete()\n    .eq("bid_id", bid.id)')
  expect(actions).toContain("items.length - matched.length")
  expect(actions).toContain("previousPrices")
  expect(actions).not.toContain("all request rows must be priced")
})

test("reviewed extracted rows flow through line matching into client total and profit", () => {
  const items: QuoteComparisonItemRecord[] = [
    { id: "drywall", comparison_id: "comparison", description: "Drywall", specification: "5/8 in · 4 x 8 ft · Regular", quantity: 20, unit: "sheets", markup_percent: 0, client_unit_price: 18, sort_order: 0, created_at: "", updated_at: "" },
    { id: "screws", comparison_id: "comparison", description: "Drywall screws", specification: "1 1/4 in", quantity: 5, unit: "boxes", markup_percent: 0, client_unit_price: 30, sort_order: 1, created_at: "", updated_at: "" },
  ]
  const extracted = [
    { id: "line-1", description: "Panel de yeso", specification: "5/8 in · 4 x 8 ft · Regular", unit_price: 11 },
    { id: "line-2", description: "Sheettrock screws", specification: "1 1/4 in", unit_price: 16 },
  ]
  const matches = matchSupplierQuoteItems(extracted, items)
  expect(matches.map((match) => match.comparisonItem.id)).toEqual(["drywall", "screws"])

  const bid: QuoteComparisonBidRecord = {
    id: "supplier-quote", comparison_id: "comparison", source_supplier_quote_id: "source-quote",
    supplier_id: "supplier", supplier_name_snapshot: "Supplier", trust_level_snapshot: "verified",
    delivery_charge: 30, tax_amount: 0, tax_percent: 5, lead_time_days: 2, notes: "", status: "received", created_at: "", updated_at: "",
    quote_comparison_prices: matches.map(({ item, comparisonItem }) => ({ bid_id: "supplier-quote", item_id: comparisonItem.id, unit_price: item.unit_price, is_available: true, notes: item.description })),
  }
  const clientTarget = buildClientReadyToPaySummary(items, 50, 8.875)
  const [option] = buildQuoteBuyingOptions(items, [bid], clientTarget)
  expect(clientTarget.finalTotal).toBe(609.7)
  expect(option.supplierTotal).toBe(346.5)
  expect(option.estimatedGrossProfit).toBe(213.5)
  expect(option.grossMarginPercent).toBeCloseTo(38.125, 3)
  expect(option.selectable).toBe(true)
})
