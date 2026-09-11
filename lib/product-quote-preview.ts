import { quoteLineMatchStatus, type QuoteComparisonBidRecord, type QuoteComparisonItemRecord } from "@/lib/quote-comparison";

/** Read-only product comparison. Selections are browser-session draft inputs, never an order. */
export function buildProductQuotePreview(items: QuoteComparisonItemRecord[], bids: QuoteComparisonBidRecord[], selections: Record<string, string> = {}) {
  const rows = items.map((item) => {
    const validQuantity = Number.isFinite(item.quantity) && item.quantity > 0;
    const offers = bids.map((bid) => {
      const price = bid.quote_comparison_prices?.find((entry) => entry.item_id === item.id);
      const unitPrice = price?.unit_price != null && Number.isFinite(price.unit_price) && price.unit_price >= 0 ? price.unit_price : null;
      const matchStatus = quoteLineMatchStatus(item, price?.notes ?? "");
      const status = price?.is_available === false ? "unavailable" : unitPrice === null ? "unknown" : ["possible", "review"].includes(matchStatus) ? "review" : "priced";
      const blocked = bid.trust_level_snapshot === "do-not-use" || bid.status === "declined";
      return { bid, unitPrice, lineTotal: validQuantity && unitPrice !== null ? Math.round(unitPrice * item.quantity * 100) / 100 : null, status, matchStatus, eligible: status === "priced" && !blocked && validQuantity, blocked };
    });
    const eligible = offers.filter((offer) => offer.eligible).sort((a, b) => a.unitPrice! - b.unitPrice!);
    const lowest = eligible[0] ?? null;
    const selected = offers.find((offer) => offer.bid.id === selections[item.id] && offer.eligible) ?? null;
    return { item, offers, lowest, selected, validQuantity };
  });
  const supplierTotals = new Map<string, { supplierId: string; supplierName: string; subtotal: number; itemCount: number }>();
  for (const row of rows) {
    if (!row.selected) continue;
    // Imported quote bids use directorySupplierId:quoteId; count the actual supplier once.
    const supplierId = row.selected.bid.supplier_id.split(":")[0] || row.selected.bid.id;
    const group = supplierTotals.get(supplierId) ?? { supplierId, supplierName: row.selected.bid.supplier_name_snapshot, subtotal: 0, itemCount: 0 };
    group.subtotal = Math.round((group.subtotal + row.selected.lineTotal!) * 100) / 100;
    group.itemCount += 1;
    supplierTotals.set(supplierId, group);
  }
  return {
    rows,
    selectedCount: rows.filter((row) => row.selected).length,
    comparableCount: rows.filter((row) => row.lowest).length,
    materialSubtotal: Math.round([...supplierTotals.values()].reduce((sum, group) => sum + group.subtotal, 0) * 100) / 100,
    suppliers: [...supplierTotals.values()],
    cheapestSelections: Object.fromEntries(rows.flatMap((row) => row.lowest ? [[row.item.id, row.lowest.bid.id]] : [])),
  };
}
