"use server";

import { requireStaffProfile } from "@/lib/auth";
import { parseProductChoiceDraft, productChoiceFingerprint, productChoiceScopeError } from "@/lib/product-choice-draft";
import type { QuoteComparisonBidRecord, QuoteComparisonItemRecord } from "@/lib/quote-comparison";
import type { AutosaveResult } from "@/lib/autosave-queue";
import { loadProductMatchConfirmations } from "@/lib/product-match-server";
import { loadMatrixChoiceSource } from '@/lib/matrix-choice-server';
import { matrixChoiceFingerprint,matrixChoiceScopeError } from '@/lib/matrix-choice-draft';

export async function saveProductChoicesAction(input: { comparisonId: string; expectedRevision: number; sourceFingerprint: string; snapshot: unknown }): Promise<AutosaveResult> {
  const { supabase } = await requireStaffProfile("suppliers");
  if (!input || !/^[0-9a-f-]{36}$/i.test(input.comparisonId) || !Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0
    || input.expectedRevision >= 2147483647 || !/^[a-f0-9]{64}$/.test(input.sourceFingerprint)) return { ok:false,error:"Reload before saving product choices." };
  const draft = parseProductChoiceDraft(input.snapshot);
  if (!draft) return { ok:false,error:"The product choices could not be read." };
  try {
    // Read revision first; child-change triggers invalidate any racing snapshot CAS.
    const parent = await supabase.from("quote_comparisons").select("status,product_choice_draft_revision").eq("id",input.comparisonId)
      .maybeSingle<{status:string;product_choice_draft_revision:number}>();
    if (parent.error || !parent.data) return {ok:false,error:"Product choices could not be loaded. Keep this page open and retry."};
    if (!["draft","review"].includes(parent.data.status)) return {ok:false,conflict:true,error:"This comparison is locked. Reload to review its final route."};
    if (parent.data.product_choice_draft_revision !== input.expectedRevision) return {ok:false,conflict:true,error:"Choices changed elsewhere. Reload to avoid overwriting them."};
    const [items,bids] = await Promise.all([
      supabase.from("quote_comparison_items").select("*").eq("comparison_id",input.comparisonId).order('sort_order').order('created_at').returns<QuoteComparisonItemRecord[]>(),
      supabase.from("quote_comparison_bids").select("*,quote_comparison_prices(*)").eq("comparison_id",input.comparisonId).returns<QuoteComparisonBidRecord[]>(),
    ]);
    if (items.error || bids.error) return {ok:false,error:"Supplier prices could not be checked. Retry before leaving."};
    bids.data = await loadProductMatchConfirmations(supabase,bids.data??[]);
    if (await productChoiceFingerprint(items.data??[],bids.data??[]) !== input.sourceFingerprint) return {ok:false,conflict:true,error:"Prices changed. Reload and review before choosing."};
    const scopeError = productChoiceScopeError(draft,items.data??[],bids.data??[]);
    if (scopeError) return {ok:false,conflict:true,error:scopeError};
    if(draft.matrix){
      const source=await loadMatrixChoiceSource(supabase,input.comparisonId,items.data??[]);
      if(await matrixChoiceFingerprint(source.items,source.quotes)!==draft.matrix.sourceFingerprint)return {ok:false,conflict:true,error:'Request or source quotes changed. Reload and review before saving.'};
      const matrixError=matrixChoiceScopeError(draft.matrix,source.items,source.quotes);
      if(matrixError)return {ok:false,conflict:true,error:matrixError};
    }
    const result = await supabase.from("quote_comparisons").update({product_choice_draft:draft,product_choice_draft_revision:input.expectedRevision+1,product_choice_draft_source_fingerprint:input.sourceFingerprint})
      .eq("id",input.comparisonId).eq("product_choice_draft_revision",input.expectedRevision).in("status",["draft","review"])
      .select("product_choice_draft_revision").maybeSingle<{product_choice_draft_revision:number}>();
    if (result.error) return {ok:false,error:"Product choices were not saved. Keep this page open and retry."};
    if (!result.data) return {ok:false,conflict:true,error:"Prices or choices changed while saving. Reload to review."};
    return {ok:true,revision:result.data.product_choice_draft_revision};
  } catch {
    return {ok:false,error:"Could not confirm the save. Keep this page open and retry."};
  }
}
