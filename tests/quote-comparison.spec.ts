import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

import {
  analyzeQuoteComparison,
  buildClientReadyToPaySummary,
  buildMixedSupplierAnalysis,
  buildQuoteBuyingOptions,
  buildClientQuoteSummary,
  calculateQuoteTax,
  lowestSupplierPriceByItem,
  quoteLineMatchStatus,
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
    taxPercent?: number;
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
    tax_amount: 0,
    tax_percent: options.taxPercent ?? 0,
    lead_time_days: Object.prototype.hasOwnProperty.call(options, "lead") ? options.lead ?? null : 5,
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
    taxPercent: 5,
  });
  const summary = buildClientQuoteSummary(items, selected, 200, 8.875);

  expect(summary.supplierMaterialCost).toBe(1100);
  expect(summary.supplierLandedCost).toBe(1260);
  expect(summary.clientMaterialSubtotal).toBe(1320);
  expect(summary.clientTaxAmount).toBe(134.9);
  expect(summary.clientTotal).toBe(1654.9);
  expect(summary.profit).toBe(260);
  expect(summary.marginPercent).toBeCloseTo(17.105, 2);
  expect(summary.complete).toBe(true);
});

test("supplier tax is calculated from the taxable subtotal", () => {
  expect(calculateQuoteTax(1_000, 8.875)).toBe(88.75);
  expect(calculateQuoteTax(2_446, 8.875)).toBe(217.08);
  expect(calculateQuoteTax(1_000, 150)).toBe(1_000);
  expect(calculateQuoteTax(1_000, -5)).toBe(0);
});

test("lowest-per-item comparison includes every supplier delivery and tax", () => {
  const supplierA = bid("supplier-a", { prices: [["studs", 4], ["plywood", 35]], delivery: 100, taxPercent: 5, lead: 3 });
  const supplierB = bid("supplier-b", { prices: [["studs", 6], ["plywood", 20]], delivery: 100, taxPercent: 10, lead: 8 });
  const lowest = lowestSupplierPriceByItem(items, [supplierA, supplierB]);
  const mixed = buildMixedSupplierAnalysis(items, [supplierA, supplierB]);

  expect(lowest.get("studs")?.bidId).toBe("supplier-a");
  expect(lowest.get("plywood")?.bidId).toBe("supplier-b");
  expect(mixed.complete).toBe(true);
  expect(mixed.supplierCount).toBe(2);
  expect(mixed.materialSubtotal).toBe(800);
  expect(mixed.deliveryCharge).toBe(200);
  expect(mixed.taxAmount).toBe(75);
  expect(mixed.landedTotal).toBe(1075);
  expect(mixed.leadTimeDays).toBe(8);
});

test("client ready to pay uses explicit unit prices and whole-order delivery and tax", () => {
  const clientItems = items.map((item, index) => ({ ...item, client_unit_price: index === 0 ? 7 : 40 }));
  const target = buildClientReadyToPaySummary(clientItems, 150, 10);

  expect(target.materialSubtotal).toBe(1500);
  expect(target.deliveryCharge).toBe(150);
  expect(target.taxAmount).toBe(165);
  expect(target.finalTotal).toBe(1815);
  expect(target.complete).toBe(true);
});

test("every complete supplier and mixed option uses the same client total", () => {
  const clientItems = items.map((item, index) => ({ ...item, client_unit_price: index === 0 ? 8 : 45 }));
  const target = buildClientReadyToPaySummary(clientItems, 200, 8);
  const options = buildQuoteBuyingOptions(clientItems, [
    bid("supplier-a", { prices: [["studs", 4], ["plywood", 40]], delivery: 50, taxPercent: 5, lead: 3 }),
    bid("supplier-b", { prices: [["studs", 7], ["plywood", 20]], delivery: 75, taxPercent: 10, lead: 7 }),
  ], target);

  expect(options.map((option) => option.kind)).toEqual(["mixed", "supplier", "supplier"]);
  expect(new Set(options.map((option) => option.clientTotal))).toEqual(new Set([target.finalTotal]));
  const mixed = options.find((option) => option.kind === "mixed");
  expect(mixed?.supplierMaterialSubtotal).toBe(800);
  expect(mixed?.supplierDeliveryCharge).toBe(125);
  expect(mixed?.supplierTaxAmount).toBe(70);
  expect(mixed?.leadTimeDays).toBe(7);
  expect(mixed?.estimatedGrossProfit).toBe(target.preTaxTotal - 995);
});

test("gross profit and margin preserve zero and negative outcomes", () => {
  const clientItems = items.map((item, index) => ({ ...item, client_unit_price: index === 0 ? 5 : 25 }));
  const target = buildClientReadyToPaySummary(clientItems, 0, 0);
  const options = buildQuoteBuyingOptions(clientItems, [
    bid("break-even", { prices: [["studs", 5], ["plywood", 25]], delivery: 0, taxPercent: 0, lead: 2 }),
    bid("loss", { prices: [["studs", 6], ["plywood", 25]], delivery: 0, taxPercent: 0, lead: 2 }),
  ], target);

  expect(options.find((option) => option.id === "break-even")?.estimatedGrossProfit).toBe(0);
  expect(options.find((option) => option.id === "break-even")?.grossMarginPercent).toBe(0);
  expect(options.find((option) => option.id === "loss")?.estimatedGrossProfit).toBe(-100);
  expect(options.find((option) => option.id === "loss")?.grossMarginPercent).toBe(-10);
});

test("missing delivery or tax blocks selection while lead time remains optional", () => {
  const complete = bid("complete", { prices: [["studs", 5], ["plywood", 25]], delivery: 20, taxPercent: 0, lead: 4 });
  const missingDelivery = bid("missing-delivery", { prices: [["studs", 1], ["plywood", 1]], delivery: Number.NaN, taxPercent: 0, lead: 1 });
  const missingTax = bid("missing-tax", { prices: [["studs", 1], ["plywood", 1]], delivery: 0, taxPercent: Number.NaN, lead: 1 });
  const missingLead = bid("missing-lead", { prices: [["studs", 1], ["plywood", 1]], delivery: 0, taxPercent: 0, lead: null });
  const analyses = analyzeQuoteComparison(items, [missingDelivery, missingTax, missingLead, complete]);

  expect(analyses.find((entry) => entry.bidId === "missing-lead")?.isLowestCost).toBe(true);
  expect(analyses.find((entry) => entry.bidId === "missing-delivery")?.missingFields).toContain("delivery");
  expect(analyses.find((entry) => entry.bidId === "missing-tax")?.missingFields).toContain("tax");
  expect(analyses.find((entry) => entry.bidId === "missing-lead")?.missingFields).not.toContain("lead time");
  expect(analyses.find((entry) => entry.bidId === "missing-lead")?.eligible).toBe(true);
  expect(analyses.filter((entry) => ["missing-delivery", "missing-tax"].includes(entry.bidId)).every((entry) => !entry.eligible && !entry.isRecommended && !entry.isLowestCost)).toBe(true);
});

test("an incomplete client target blocks option profit and selection", () => {
  const target = buildClientReadyToPaySummary(items, 100, 8.875);
  const [option] = buildQuoteBuyingOptions(items, [
    bid("complete-supplier", { prices: [["studs", 5], ["plywood", 25]], delivery: 25, taxPercent: 5, lead: 3 }),
  ], target);

  expect(target.missingFields).toContain("1 client unit price");
  expect(option.complete).toBe(false);
  expect(option.selectable).toBe(false);
  expect(option.isLowestCost).toBe(false);
});

test("mixed option is omitted when it duplicates a single supplier order", () => {
  const clientItems = items.map((item) => ({ ...item, client_unit_price: 50 }));
  const target = buildClientReadyToPaySummary(clientItems, 0, 0);
  const options = buildQuoteBuyingOptions(clientItems, [
    bid("all-lowest", { prices: [["studs", 4], ["plywood", 20]], lead: 2 }),
    bid("higher", { prices: [["studs", 5], ["plywood", 25]], lead: 3 }),
  ], target);

  expect(options.filter((option) => option.kind === "mixed")).toHaveLength(0);
});

test("supplier line matching distinguishes exact, possible, review, and manual prices", () => {
  expect(quoteLineMatchStatus(items[0], "2 x 4 studs 10 ft")).toBe("exact");
  expect(quoteLineMatchStatus(items[0], "2 x 4 studs")).toBe("possible");
  expect(quoteLineMatchStatus(items[0], "SPF framing lumber")).toBe("review");
  expect(quoteLineMatchStatus(items[0], "")).toBe("manual");
});

test("manager navigation and migration enforce supplier-scoped access", async () => {
  const root = process.cwd();
  const [navigation, migration, clientQuoteMigration, taxMigration] = await Promise.all([
    readFile(path.join(root, "components/buildflow/admin-shell.tsx"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260813171229_create_supplier_quote_comparisons.sql"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260813200232_add_client_quotes_to_comparisons.sql"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260814153520_add_quote_tax_percentage.sql"), "utf8"),
  ]);

  expect(navigation).not.toContain('{ href: "/admin/quote-comparison", label: "Quote Comparison"');
  expect(navigation).toContain('...(access.suppliers ? [');
  expect(navigation).toContain('href: "/admin/communications", label: "Communications"');
  expect(navigation).not.toContain('Schedule a Google Meet with Carlos');
  expect(navigation).not.toContain('View all WhatsApp conversations');
  expect(navigation).toContain('href: "/admin/communications"');
  expect(navigation.indexOf('href: "/admin/communications"')).toBeGreaterThan(navigation.indexOf("</nav>"));
  expect(navigation).not.toContain('link.href === "/admin/traffic" ||');
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
  expect(taxMigration).toContain("add column if not exists tax_percent");
  expect(taxMigration).toContain("check (tax_percent >= 0 and tax_percent <= 100)");
  expect(taxMigration).toContain("p_tax_percent numeric");
  expect(taxMigration).toContain("security invoker");
  expect(taxMigration).toContain("bid.tax_percent / 100");
  expect(taxMigration).not.toMatch(/grant\s+.+\s+to\s+anon/i);
});

test("client quote attachments are private, bounded, and delivered with the branded PDF", async () => {
  const root = process.cwd();
  const [migration, storagePolicyMigration, actions, uploadRoute, email, fallback, builder] = await Promise.all([
    readFile(path.join(root, "supabase/migrations/20260902185436_add_client_quote_attachments.sql"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260902192906_allow_staff_client_quote_attachments.sql"), "utf8"),
    readFile(path.join(root, "app/admin/quote-comparison/actions.ts"), "utf8"),
    readFile(path.join(root, "app/api/admin/quote-comparison/attachments/route.ts"), "utf8"),
    readFile(path.join(root, "lib/cart-submission-email.ts"), "utf8"),
    readFile(path.join(root, "supabase/functions/send-supplier-quote/index.ts"), "utf8"),
    readFile(path.join(root, "components/buildflow/client-quote-builder.tsx"), "utf8"),
  ]);

  expect(migration).toContain("quote_comparison_client_attachments");
  expect(migration).toContain("enable row level security");
  expect(migration).toContain("private.has_staff_capability('suppliers')");
  expect(migration).not.toMatch(/grant\s+.+\s+to\s+anon/i);
  expect(storagePolicyMigration).toContain("client_quote_files_staff_insert");
  expect(storagePolicyMigration).toContain("client_quote_files_staff_read");
  expect(storagePolicyMigration).toContain("client_quote_files_staff_delete");
  expect(storagePolicyMigration).toContain("private.has_staff_capability('suppliers')");
  expect(uploadRoute).toContain("createSignedUploadUrl(filePath)");
  expect(uploadRoute).toContain("MAX_FILES = 10");
  expect(uploadRoute).toContain('runtime = "nodejs"');
  expect(uploadRoute).toContain("sameOrigin(request)");
  expect(uploadRoute).toContain("access.suppliers");
  expect(actions).toContain("CLIENT_QUOTE_MAX_TOTAL_SIZE = 25 * 1024 * 1024");
  expect(actions).toContain("attachments_snapshot: attachmentRecords.map");
  expect(email).toContain("...(input.attachments ?? [])");
  expect(fallback).toContain('from("quote_comparison_client_attachments")');
  expect(fallback).toContain("attachments: emailAttachments");
  expect(builder).toContain('type="file" multiple');
  expect(builder).toContain("Add photo or file");
});

test("selecting a supplier saves the current price draft before awarding it", async () => {
  const [workspace, actions] = await Promise.all([
    readFile(path.join(process.cwd(), "components/buildflow/quote-comparison-workspace.tsx"), "utf8"),
    readFile(path.join(process.cwd(), "app/admin/quote-comparison/actions.ts"), "utf8"),
  ]);
  const saveCall = workspace.indexOf("const saveResult = await saveQuoteComparisonBidAction");
  const awardCall = workspace.indexOf("const awardResult = await awardQuoteComparisonBidAction");

  expect(saveCall).toBeGreaterThan(-1);
  expect(awardCall).toBeGreaterThan(saveCall);
  expect(workspace).toContain("Select supplier");
  expect(workspace).toContain("prices saved and supplier selected");
  expect(workspace).toContain("Buying option comparison");
  expect(workspace).not.toContain("Best single supplier");
  expect(workspace).not.toContain("All supplier totals");
  expect(workspace).toContain("Confirm match");
  expect(workspace).toContain("Locked to client request");
  expect(actions).toContain("analysis.missingItemCount > 0");
  expect(actions).toContain("confirmQuoteComparisonPriceMatchAction");
});

test("supplier quote workspace captures tax as a percentage", async () => {
  const workspace = await readFile(path.join(process.cwd(), "components/buildflow/quote-comparison-workspace.tsx"), "utf8");
  const actions = await readFile(path.join(process.cwd(), "app/admin/quote-comparison/actions.ts"), "utf8");

  expect(workspace).toContain("Tax percentage");
  expect(workspace).toContain('placeholder="8.875"');
  expect(workspace).not.toContain("Tax amount");
  expect(actions).toContain("p_tax_percent: cleanTaxPercent(input.taxPercent)");
});

test("supplier comparison captures the client's ready-to-pay target beside supplier prices", async () => {
  const workspace = await readFile(path.join(process.cwd(), "components/buildflow/quote-comparison-workspace.tsx"), "utf8");
  const actions = await readFile(path.join(process.cwd(), "app/admin/quote-comparison/actions.ts"), "utf8");

  expect(workspace).toContain("Client Ready to Pay");
  expect(workspace).toContain("Client unit price");
  expect(workspace).toContain("Supplier unit price");
  expect(workspace).toContain("Whole order");
  expect(workspace).toContain("Estimated gross profit");
  expect(workspace).toContain("Line profit")
  expect(workspace).toContain("Entered rows summary")
  expect(workspace).toContain("Save entered prices")
  expect(workspace).toContain("Unfilled rows remain open for later")
  expect(workspace).not.toContain("Finish the missing client and supplier values before saving the comparison")
  expect(workspace).toContain("Gross margin");
  expect(workspace).toContain("Finish missing values");
  expect(workspace).toContain('className="mt-4 hidden');
  expect(workspace).toContain('className="mt-4 grid gap-3 md:hidden"');
  expect(workspace).toContain("saveQuoteComparisonClientTargetsAction");
  expect(actions).toContain("client_unit_price: value");
  expect(actions).toContain("client_delivery_charge: cleanMoney(input.clientDeliveryCharge)");
  expect(actions).toContain("client_tax_percent: cleanTaxPercent(input.clientTaxPercent)");
});

test("new comparison asks only for a comparison name", async () => {
  const form = await readFile(path.join(process.cwd(), "components/buildflow/quote-comparison-create-form.tsx"), "utf8");

  expect(form).toContain("Name this comparison");
  expect(form).toContain("Comparison name");
  expect(form).not.toContain("No project selected");
  expect(form).not.toContain("Choose department");
  expect(form).not.toContain("Delivery address");
  expect(form).toContain('department: "", jobAddress: "", projectId: null');
});
