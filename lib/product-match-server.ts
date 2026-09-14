import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProductMatchConfirmation, QuoteComparisonBidRecord } from "@/lib/quote-comparison";

/** Only trusted server reads decorate saved prices. Missing migration/access fails closed. */
export async function loadProductMatchConfirmations(supabase: SupabaseClient, bids: QuoteComparisonBidRecord[]) {
  if (!bids.length) return bids;
  const { data, error } = await supabase.from("quote_product_match_confirmations").select("id,bid_id,item_id,actor_id,actor_label,created_at,revoked_at,source_snapshot,source_fingerprint,selling_unit")
    .in("bid_id",bids.map(bid=>bid.id)).is("revoked_at",null).order("created_at",{ascending:false}).order("id").returns<Array<ProductMatchConfirmation & {bid_id:string;item_id:string}>>();
  return bids.map(bid=>({...bid,quote_comparison_prices:bid.quote_comparison_prices?.map(price=>({...price,quote_product_match_confirmations:error ? [] : (data??[]).filter(record=>record.bid_id===bid.id && record.item_id===price.item_id)}))}));
}
