import type { QuoteComparisonBidRecord, QuoteComparisonItemRecord } from "@/lib/quote-comparison";
import { buildProductQuotePreview } from "@/lib/product-quote-preview";

export type ProductChoiceDraft = { version: 1; selections: Record<string, string> };
export type ProductChoiceDraftColumns = {
  product_choice_draft?: unknown;
  product_choice_draft_revision?: number;
  product_choice_draft_source_fingerprint?: string | null;
};

export function parseProductChoiceDraft(value: unknown): ProductChoiceDraft | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (raw.version !== 1 || !raw.selections || typeof raw.selections !== "object" || Array.isArray(raw.selections)) return null;
  const entries = Object.entries(raw.selections);
  if (entries.length > 1000 || entries.some(([id, bid]) => !/^[a-z0-9-]{1,100}$/i.test(id) || typeof bid !== "string" || !/^[a-z0-9-]{0,100}$/i.test(bid))) return null;
  return { version: 1, selections: Object.fromEntries(entries) };
}

export function productChoiceScopeError(draft: ProductChoiceDraft, items: QuoteComparisonItemRecord[], bids: QuoteComparisonBidRecord[]) {
  const rows = buildProductQuotePreview(items, bids).rows;
  return Object.entries(draft.selections).some(([itemId, bidId]) => {
    const row = rows.find(entry => entry.item.id === itemId);
    return !row || (bidId !== "" && !row.offers.some(offer => offer.bid.id === bidId && offer.eligible));
  }) ? "A chosen product or supplier price needs review. Reload before choosing again." : null;
}

/** A changed amount, quantity, unit, match or supplier exclusion requires a new review. */
export async function productChoiceFingerprint(items: QuoteComparisonItemRecord[], bids: QuoteComparisonBidRecord[]) {
  const source = {
    items: [...items].sort((a,b)=>a.id.localeCompare(b.id)).map(item=>[item.id,item.description,item.specification,item.quantity,item.unit]),
    bids: [...bids].sort((a,b)=>a.id.localeCompare(b.id)).map(bid=>[bid.id,bid.supplier_id,bid.trust_level_snapshot,bid.status,
      [...(bid.quote_comparison_prices??[])].sort((a,b)=>a.item_id.localeCompare(b.item_id)).map(price=>[price.item_id,price.unit_price,price.is_available,price.notes,(price.quote_product_match_confirmations??[]).map(record=>[record.id,record.source_fingerprint,record.selling_unit,record.revoked_at??null])])]),
  };
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(source)));
  return Array.from(new Uint8Array(digest), byte=>byte.toString(16).padStart(2,"0")).join("");
}

export function restoreProductChoices(columns: ProductChoiceDraftColumns, fingerprint: string) {
  const parsed = parseProductChoiceDraft(columns.product_choice_draft);
  const stale = columns.product_choice_draft != null && (!parsed || columns.product_choice_draft_source_fingerprint !== fingerprint);
  return { selections: stale ? {} : parsed?.selections ?? {}, warning: stale ? "Prices or products changed. Review and choose suppliers again; the previous draft is preserved until you make a new choice." : "" };
}
