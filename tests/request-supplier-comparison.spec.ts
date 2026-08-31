import { expect, test } from "@playwright/test";

import { mapRequestSupplierComparison } from "../lib/request-supplier-comparison";
import type {
  QuoteComparisonBidRecord,
  QuoteComparisonItemRecord,
} from "../lib/quote-comparison";

const item: QuoteComparisonItemRecord = {
  id: "item-1",
  comparison_id: "comparison-1",
  description: "2 x 4 x 8 ft stud",
  specification: "Regular SPF",
  quantity: 50,
  unit: "each",
  markup_percent: 0,
  client_unit_price: null,
  sort_order: 0,
  created_at: "2026-08-30T12:00:00.000Z",
  updated_at: "2026-08-30T12:00:00.000Z",
};

const bid: QuoteComparisonBidRecord = {
  id: "bid-1",
  comparison_id: "comparison-1",
  supplier_id: "supplier-1",
  supplier_name_snapshot: "ABC Supply",
  trust_level_snapshot: "verified",
  delivery_charge: 75,
  tax_amount: 0,
  tax_percent: 8.875,
  lead_time_days: 2,
  notes: "Reviewed quote\nSource quote: Q-1042",
  status: "received",
  created_at: "2026-08-30T12:00:00.000Z",
  updated_at: "2026-08-31T15:00:00.000Z",
  quote_comparison_prices: [
    {
      bid_id: "bid-1",
      item_id: "item-1",
      unit_price: 4.7,
      is_available: true,
      notes: "Matched supplier line 1",
    },
    {
      bid_id: "bid-1",
      item_id: "orphan-item",
      unit_price: 99,
      is_available: true,
      notes: "Must not leak into another request",
    },
  ],
};

test("maps stored request items and supplier quote cells", () => {
  const result = mapRequestSupplierComparison([item], [bid], {
    selectedBidId: "bid-1",
    sources: [
      {
        bidId: "bid-1",
        quoteDate: "2026-08-28",
        sourceLabel: "ABC quote Q-1042",
        sourceUrl: "https://example.com/quotes/Q-1042",
      },
    ],
  });

  expect(result.items).toEqual([
    {
      id: "item-1",
      quantity: 50,
      unit: "each",
      description: "2 x 4 x 8 ft stud",
      specification: "Regular SPF",
    },
  ]);
  expect(result.suppliers).toHaveLength(1);
  expect(result.suppliers[0]).toMatchObject({
    id: "bid-1",
    name: "ABC Supply",
    deliveryCharge: 75,
    quoteDate: "2026-08-28",
    sourceLabel: "ABC quote Q-1042",
    sourceUrl: "https://example.com/quotes/Q-1042",
    selected: true,
  });
  expect(result.suppliers[0].prices).toEqual([
    {
      itemId: "item-1",
      unitPrice: 4.7,
      available: true,
      notes: "Matched supplier line 1",
      sourceLabel: "ABC quote Q-1042",
      sourceUrl: "https://example.com/quotes/Q-1042",
      checkedAt: "2026-08-28",
    },
  ]);
});

test("uses stored source label and update timestamp without inventing quote metadata", () => {
  const result = mapRequestSupplierComparison([item], [bid]);
  expect(result.suppliers[0]).toMatchObject({
    sourceLabel: "Q-1042",
    sourceUrl: null,
    quoteDate: null,
    checkedAt: "2026-08-31T15:00:00.000Z",
  });
});

test("handles empty records and rejects unsafe source links", () => {
  expect(mapRequestSupplierComparison(null, undefined)).toEqual({
    items: [],
    suppliers: [],
  });

  const result = mapRequestSupplierComparison([item], [bid], {
    sources: [
      {
        bidId: "bid-1",
        sourceUrl: "javascript:alert(1)",
      },
    ],
  });
  expect(result.suppliers[0].sourceUrl).toBeNull();
  expect(result.suppliers[0].prices[0].sourceUrl).toBeNull();
});

test("preserves unavailable and missing prices without turning them into zero", () => {
  const result = mapRequestSupplierComparison(
    [item],
    [
      {
        ...bid,
        delivery_charge: Number.NaN,
        quote_comparison_prices: [
          {
            bid_id: "bid-1",
            item_id: "item-1",
            unit_price: null,
            is_available: false,
            notes: "Not stocked",
          },
        ],
      },
    ],
  );
  expect(result.suppliers[0].deliveryCharge).toBe(0);
  expect(result.suppliers[0].deliveryLabel).toBe("Free delivery");
  expect(result.suppliers[0].prices[0]).toMatchObject({
    unitPrice: null,
    available: false,
    notes: "Not stocked",
  });
});
