import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

import {
  analyzeQuoteComparison,
  buildClientQuoteSummary,
  type QuoteComparisonBidRecord,
  type QuoteComparisonItemRecord,
} from "@/lib/quote-comparison";

const items: QuoteComparisonItemRecord[] = [
  { id: "studs", comparison_id: "comparison", description: "2 x 4 studs", specification: "10 ft.", quantity: 100, unit: "piece", markup_percent: 20, client_unit_price: null, sort_order: 0, created_at: "", updated_at: "" },
  { id: "plywood", comparison_id: "comparison", description: "Plywood", specification: "3/4 in.", quantity: 20, unit: "sheet", markup_percent: 20, client_unit_price: 36, sort_order: 1, created_at: "", updated_at: "" },
];

function bid(
  id: string,
  options: {
    prices: Array<[string, number | null]>;
    delivery?: number;
    tax?: number;
    lead?: number | null;
    trust?: QuoteComparisonBidRecord["trust_level_snapshot"];
  },
): QuoteComparisonBidRecord {
  return {
    id,
    comparison_id: "comparison",
    supplier_id: id,
    supplier_name_snapshot: id,
    trust_level_snapshot: options.trust ?? "verified",
    delivery_charge: options.delivery ?? 0,
    tax_amount: options.tax ?? 0,
    lead_time_days: options.lead ?? null,
    notes: "",
    status: "received",
    created_at: "",
    updated_at: "",
    quote_comparison_prices: options.prices.map(([itemId, unitPrice]) => ({ bid_id: id, item_id: itemId, unit_price: unitPrice, is_available: true, notes: "" })),
  };
}

test("complete supplier quote beats an artificially cheap incomplete quote", () => {
  const result = analyzeQuoteComparison(items, [
    bid("complete", { prices: [["studs", 5], ["plywood", 30]], delivery: 100, lead: 5, trust: "trusted" }),
    bid("incomplete", { prices: [["studs", 3]], delivery: 0, lead: 1, trust: "preferred" }),
  ]);

  expect(result.find((entry) => entry.bidId === "complete")?.isRecommended).toBe(true);
  expect(result.find((entry) => entry.bidId === "incomplete")?.eligible).toBe(false);
  expect(result.find((entry) => entry.bidId === "incomplete")?.missingItemCount).toBe(1);
});

test("recommendation uses delivered total instead of material subtotal", () => {
  const result = analyzeQuoteComparison(items, [
    bid("low-subtotal-high-delivery", { prices: [["studs", 4], ["plywood", 20]], delivery: 900, lead: 5 }),
    bid("better-delivered", { prices: [["studs", 5], ["plywood", 25]], delivery: 50, lead: 5 }),
  ]);

  expect(result.find((entry) => entry.bidId === "better-delivered")?.isLowestCost).toBe(true);
  expect(result.find((entry) => entry.bidId === "better-delivered")?.isRecommended).toBe(true);
});

test("do-not-use suppliers are blocked even with the lowest price", () => {
  const result = analyzeQuoteComparison(items, [
    bid("blocked", { prices: [["studs", 1], ["plywood", 1]], trust: "do-not-use" }),
    bid("approved", { prices: [["studs", 5], ["plywood", 25]], trust: "verified" }),
  ]);

  expect(result.find((entry) => entry.bidId === "blocked")?.blocked).toBe(true);
  expect(result.find((entry) => entry.bidId === "blocked")?.score).toBe(0);
  expect(result.find((entry) => entry.bidId === "approved")?.isRecommended).toBe(true);
});

test("an empty supplier quote cannot receive a score or recommendation", () => {
  const result = analyzeQuoteComparison(items, [
    bid("empty", { prices: [], lead: 1, trust: "preferred" }),
    bid("priced", { prices: [["studs", 5], ["plywood", 25]], lead: 5, trust: "verified" }),
  ]);

  expect(result.find((entry) => entry.bidId === "empty")?.score).toBe(0);
  expect(result.find((entry) => entry.bidId === "empty")?.eligible).toBe(false);
  expect(result.find((entry) => entry.bidId === "priced")?.isRecommended).toBe(true);
});

test("client quote totals preserve private landed cost, profit, and margin", () => {
  const selected = bid("selected", {
    prices: [["studs", 5], ["plywood", 30]],
    delivery: 100,
    tax: 50,
  });
  const summary = buildClientQuoteSummary(items, selected, 200);

  expect(summary.supplierMaterialCost).toBe(1100);
  expect(summary.supplierLandedCost).toBe(1250);
  expect(summary.clientMaterialSubtotal).toBe(1320);
  expect(summary.clientTotal).toBe(1520);
  expect(summary.profit).toBe(270);
  expect(summary.marginPercent).toBeCloseTo(17.763, 2);
  expect(summary.complete).toBe(true);
});

test("manager navigation and migration enforce supplier-scoped access", async () => {
  const root = process.cwd();
  const [navigation, migration, clientQuoteMigration] = await Promise.all([
    readFile(path.join(root, "components/buildflow/admin-shell.tsx"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260813171229_create_supplier_quote_comparisons.sql"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260813200232_add_client_quotes_to_comparisons.sql"), "utf8"),
  ]);

  expect(navigation).toContain('{ href: "/admin/quote-comparison", label: "Quote Comparison"');
  expect(navigation).toContain('link.href === "/admin/quote-comparison" && access.suppliers');
  expect(navigation).toContain('label: "Calls & Messages"');
  expect(navigation).toContain("https://my.quo.com/inbox/PN7lAbkMJw/c/CN30389c1bd6c542e78fbcec10a4e91602");
  expect(navigation.indexOf('label: "Calls & Messages"')).toBeGreaterThan(navigation.indexOf('label: "Website Traffic"'));
  expect(navigation).toContain('link.href === QUO_INBOX_URL');
  expect(navigation).toContain('link.href === "/admin/traffic"');
  expect(navigation).toContain('target={external ? "_blank" : undefined}');
  expect(migration).toContain("alter table public.quote_comparisons enable row level security");
  expect(migration).toContain("private.has_staff_capability('suppliers')");
  expect(migration).toContain("created_by = (select auth.uid())");
  expect(migration).toContain("check (status in ('draft', 'review', 'awarded', 'archived'))");
  expect(migration).toContain("create or replace function public.staff_save_quote_comparison_bid");
  expect(migration).toContain("create or replace function public.staff_award_quote_comparison_bid");
  expect(migration).toContain("create or replace function public.staff_reopen_quote_comparison");
  expect(migration).not.toMatch(/grant\s+.+\s+to\s+anon/i);
  expect(clientQuoteMigration).toContain("staff_save_quote_comparison_client_quote");
  expect(clientQuoteMigration).toContain("quote_comparison_client_deliveries");
  expect(clientQuoteMigration).toContain("security invoker");
  expect(clientQuoteMigration).not.toMatch(/grant\s+.+\s+to\s+anon/i);
});
