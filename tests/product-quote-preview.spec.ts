import { expect, test } from "@playwright/test";
import { buildProductQuotePreview } from "../lib/product-quote-preview";
import type { QuoteComparisonBidRecord, QuoteComparisonItemRecord } from "../lib/quote-comparison";

function item(id: string, quantity = 2): QuoteComparisonItemRecord {
  return { id, comparison_id: "comparison", description: id, specification: "", quantity, unit: "each", markup_percent: 0, client_unit_price: null, sort_order: 0, created_at: "", updated_at: "" };
}
function bid(id: string, prices: Array<[string, number | null, boolean?, string?]>): QuoteComparisonBidRecord {
  return { id, comparison_id: "comparison", supplier_id: id, supplier_name_snapshot: id, trust_level_snapshot: "verified", delivery_charge: 500, tax_amount: 0, tax_percent: 10, lead_time_days: null, notes: "", status: "received", created_at: "", updated_at: "", quote_comparison_prices: prices.map(([item_id, unit_price, is_available = true, notes = ""]) => ({ bid_id: id, item_id, unit_price, is_available, notes })) };
}

test("lowest selections are per product and exclude delivery and tax from draft materials subtotal", () => {
  const items = [item("Valve"), item("Pipe", 3)];
  const bids = [bid("A", [["Valve", 2], ["Pipe", 50]]), bid("B", [["Valve", 10], ["Pipe", 3]])];
  const empty = buildProductQuotePreview(items, bids);
  expect(empty.selectedCount).toBe(0);
  expect(empty.cheapestSelections).toEqual({ Valve: "A", Pipe: "B" });
  const selected = buildProductQuotePreview(items, bids, empty.cheapestSelections);
  expect(selected.materialSubtotal).toBe(13);
  expect(selected.suppliers).toHaveLength(2);
  expect(selected.selectedCount).toBe(2);
});

test("unknown, unavailable, and unconfirmed match offers stay distinct and are never cheapest", () => {
  const items = [{ ...item("Valve"), specification: "4 in" }];
  const bids = [bid("unknown", [["Valve", null]]), bid("unavailable", [["Valve", null, false]]), bid("possible", [["Valve", 1, true, "Valve"]]), bid("review", [["Valve", 0.5, true, "Unrelated item"]]), bid("confirmed", [["Valve", 10, true, "Valve 4 in"]])];
  const result = buildProductQuotePreview(items, bids);
  expect(result.rows[0].offers.map((offer) => offer.status)).toEqual(["unknown", "unavailable", "review", "review", "priced"]);
  expect(result.cheapestSelections).toEqual({ Valve: "confirmed" });
  expect(buildProductQuotePreview(items, bids, { Valve: "possible" }).selectedCount).toBe(0);
});

test("manual draft override changes only the chosen product without mutating input records", () => {
  const items = [item("Valve"), item("Pipe")];
  const bids = [bid("A", [["Valve", 1], ["Pipe", 2]]), bid("B", [["Valve", 3], ["Pipe", 4]])];
  const before = JSON.stringify({ items, bids });
  const choices = { ...buildProductQuotePreview(items, bids).cheapestSelections, Valve: "B" };
  const result = buildProductQuotePreview(items, bids, choices);
  expect(result.rows.map((row) => row.selected?.bid.id)).toEqual(["B", "A"]);
  expect(result.materialSubtotal).toBe(10);
  expect(JSON.stringify({ items, bids })).toBe(before);
  expect(buildProductQuotePreview(items, bids, { ...choices, Valve: "" }).selectedCount).toBe(1);
});

test("zero prices are valid, invalid prices/quantities and blocked suppliers are excluded", () => {
  const bids = [bid("zero", [["Valve", 0]]), bid("negative", [["Valve", -1]]), bid("nan", [["Valve", NaN]]), { ...bid("blocked", [["Valve", 0]]), trust_level_snapshot: "do-not-use" as const }, { ...bid("declined", [["Valve", 0]]), status: "declined" as const }];
  const result = buildProductQuotePreview([item("Valve")], bids);
  expect(result.rows[0].offers.filter((offer) => offer.eligible).map((offer) => offer.bid.id)).toEqual(["zero"]);
  expect(result.cheapestSelections).toEqual({ Valve: "zero" });
  expect(buildProductQuotePreview([item("Valve", 0)], bids).comparableCount).toBe(0);
});

test("multiple quote versions from one supplier count once and missing items stay unselected", () => {
  const bids = [{ ...bid("quote1", [["Valve", 1]]), supplier_id: "directory-id:quote1" }, { ...bid("quote2", [["Pipe", 2]]), supplier_id: "directory-id:quote2" }];
  const items = [item("Valve"), item("Pipe"), item("Missing")];
  const result = buildProductQuotePreview(items, bids, { Valve: "quote1", Pipe: "quote2", Missing: "quote1" });
  expect(result.selectedCount).toBe(2);
  expect(result.comparableCount).toBe(2);
  expect(result.suppliers).toHaveLength(1);
  expect(result.suppliers[0].subtotal).toBe(6);
  expect(result.rows[2].selected).toBeNull();
});

test("draft choices become unselected if a later edit makes their price unsafe", () => {
  const items = [item("Valve")];
  expect(buildProductQuotePreview(items, [bid("A", [["Valve", 2]])], { Valve: "A" }).selectedCount).toBe(1);
  expect(buildProductQuotePreview(items, [bid("A", [["Valve", null]])], { Valve: "A" }).selectedCount).toBe(0);
  expect(buildProductQuotePreview(items, [], { Valve: "A" }).materialSubtotal).toBe(0);
});
