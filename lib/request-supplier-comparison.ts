import type {
  RequestSupplierComparisonItem,
  RequestSupplierComparisonPrice,
  RequestSupplierComparisonSupplier,
} from "@/components/buildflow/request-supplier-comparison";
import type {
  QuoteComparisonBidRecord,
  QuoteComparisonItemRecord,
} from "@/lib/quote-comparison";

export type RequestSupplierComparisonSource = {
  bidId: string;
  quoteDate?: string | null;
  sourceLabel?: string | null;
  sourceUrl?: string | null;
  checkedAt?: string | null;
};

export type RequestSupplierComparisonMapOptions = {
  selectedBidId?: string | null;
  sources?: RequestSupplierComparisonSource[];
};

export type RequestSupplierComparisonData = {
  items: RequestSupplierComparisonItem[];
  suppliers: RequestSupplierComparisonSupplier[];
};

function finiteNonNegative(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function safeHttpUrl(value: string | null | undefined): string | null {
  const candidate = value?.trim();
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function sourceLabelFromNotes(notes: string): string | null {
  const match = notes.match(/^Source quote:\s*(.+)$/im);
  return match?.[1]?.trim().slice(0, 200) || null;
}

/**
 * Adapts the persisted apples-to-apples comparison records to the compact
 * request table. It never guesses a supplier price, quote date, or source URL.
 */
export function mapRequestSupplierComparison(
  items: QuoteComparisonItemRecord[] | null | undefined,
  bids: QuoteComparisonBidRecord[] | null | undefined,
  options: RequestSupplierComparisonMapOptions = {},
): RequestSupplierComparisonData {
  const sourceByBid = new Map(
    (options.sources ?? []).map((source) => [source.bidId, source]),
  );

  const mappedItems: RequestSupplierComparisonItem[] = (items ?? []).map(
    (item) => ({
      id: item.id,
      sourceRequestItemId: item.source_request_item_id,
      quantity: finiteNonNegative(item.quantity) ?? 0,
      unit: item.unit?.trim() || "each",
      description: item.description?.trim() || "Material",
      specification: item.specification?.trim() || null,
    }),
  );

  const itemIds = new Set(mappedItems.map((item) => item.id));
  const mappedSuppliers: RequestSupplierComparisonSupplier[] = (bids ?? []).map(
    (bid) => {
      const source = sourceByBid.get(bid.id);
      const sourceLabel =
        source?.sourceLabel?.trim() ||
        sourceLabelFromNotes(bid.notes || "") ||
        "Supplier quote";
      const quoteDate = source?.quoteDate?.trim() || null;
      // A database update is not evidence of when a supplier checked a price.
      // Keep the date unknown unless the source or quote explicitly provides it.
      const checkedAt = source?.checkedAt?.trim() || quoteDate || null;
      const prices: RequestSupplierComparisonPrice[] = (
        bid.quote_comparison_prices ?? []
      )
        .filter((price) => itemIds.has(price.item_id))
        .map((price) => ({
          itemId: price.item_id,
          unitPrice:
            price.unit_price === null
              ? null
              : finiteNonNegative(price.unit_price),
          available: price.is_available,
          notes: price.notes?.trim() || null,
          sourceLabel,
          sourceUrl: safeHttpUrl(source?.sourceUrl),
          checkedAt,
        }));

      const deliveryCharge = finiteNonNegative(bid.delivery_charge) ?? 0;
      return {
        id: bid.id,
        name: bid.supplier_name_snapshot?.trim() || "Supplier",
        prices,
        deliveryCharge,
        deliveryLabel: null,
        quoteDate,
        sourceLabel,
        sourceUrl: safeHttpUrl(source?.sourceUrl),
        checkedAt,
        selected: options.selectedBidId === bid.id,
      };
    },
  );

  return { items: mappedItems, suppliers: mappedSuppliers };
}
