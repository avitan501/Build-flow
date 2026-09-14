"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireStaffProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { canonicalProductMatch, productMatchConfirmationError, productMatchSnapshot, type QuoteComparisonItemRecord, type QuoteComparisonBidRecord } from "@/lib/quote-comparison";

export async function confirmProductMatchAction(input:{comparisonId:string;itemId:string;bidId:string;expectedSource:string;sellingUnit:string;confirmed:boolean}) {
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if(!input || ![input.comparisonId,input.itemId,input.bidId].every(id=>uuid.test(id)) || input.confirmed!==true || typeof input.expectedSource!=="string" || input.expectedSource.length>20000 || typeof input.sellingUnit!=="string" || input.sellingUnit.length>60) return {ok:false,error:"Review the saved supplier line first."};
  const {supabase,user}=await requireStaffProfile("suppliers");
  const [items,bids]=await Promise.all([
    supabase.from("quote_comparison_items").select("*").eq("comparison_id",input.comparisonId).eq("id",input.itemId).maybeSingle<QuoteComparisonItemRecord>(),
    supabase.from("quote_comparison_bids").select("*,quote_comparison_prices(*)").eq("comparison_id",input.comparisonId).eq("id",input.bidId).maybeSingle<QuoteComparisonBidRecord>(),
  ]);
  const item=items.data,bid=bids.data,price=bid?.quote_comparison_prices?.find(row=>row.item_id===input.itemId);
  if(items.error || bids.error || !item || !bid || !price) return {ok:false,error:"The saved supplier line could not be loaded."};
  const invalid=productMatchConfirmationError(item,bid,price,input.sellingUnit);
  if(invalid)return {ok:false,error:invalid};
  const snapshot=productMatchSnapshot(item,bid,price), source=canonicalProductMatch(snapshot);
  if(source!==input.expectedSource)return {ok:false,error:"The source or price changed. Review the latest saved line."};
  const {data,error}=await createAdminClient().rpc("staff_confirm_product_match",{p_comparison_id:input.comparisonId,p_item_id:input.itemId,p_bid_id:input.bidId,p_actor_id:user.id,p_expected:snapshot,p_source_fingerprint:createHash("sha256").update(source).digest("hex"),p_selling_unit:input.sellingUnit});
  if(error || !data?.ok)return {ok:false,error:"Not confirmed. The comparison changed or safe review is unavailable. Reload and review."};
  revalidatePath(`/admin/quote-comparison/${input.comparisonId}`);
  return {ok:true};
}
