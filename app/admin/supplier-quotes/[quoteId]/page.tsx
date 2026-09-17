import { notFound } from "next/navigation"

import { SupplierQuoteWorkspace } from "@/components/buildflow/supplier-quote-workspace"
import { requireStaffProfile } from "@/lib/auth"
import { materialCatalogDepartmentOptions } from "@/lib/material-catalog"
import { SUPPLIER_QUOTE_BUCKET, type SupplierQuoteItemRecord, type SupplierQuoteRecord } from "@/lib/supplier-quotes"
import { currentRequestComparison } from "@/lib/current-request-comparison"
import type { ReviewableMaterialItem } from "@/lib/client-material-review"
import type { QuoteComparisonItemRecord, QuoteComparisonRecord } from "@/lib/quote-comparison"

export default async function SupplierQuoteDetailPage({ params }: { params: Promise<{ quoteId: string }> }) {
  const { quoteId } = await params
  const { supabase } = await requireStaffProfile("suppliers")
  const quoteResult = await supabase.from("supplier_quotes").select("*").eq("id", quoteId).maybeSingle<SupplierQuoteRecord>()
  if (quoteResult.error || !quoteResult.data) notFound()
  const quote = quoteResult.data
  const [itemsResult, suppliersResult, comparisonItemsResult] = await Promise.all([
    supabase.from("supplier_quote_items").select("*").eq("quote_id", quoteId).order("line_number").returns<SupplierQuoteItemRecord[]>(),
    supabase.rpc("staff_load_catalog_suppliers"),
    quote.comparison_id
      ? supabase.from("quote_comparison_items").select("*").eq("comparison_id", quote.comparison_id).order("sort_order").returns<QuoteComparisonItemRecord[]>()
      : Promise.resolve({ data: [] as Array<{ id: string; description: string; specification: string }>, error: null }),
  ])
  let matchingItems:Array<{id:string;description:string;specification:string}>=comparisonItemsResult.data??[]
  let currentList=false
  if(quote.comparison_id){
    const comparison=await supabase.from('quote_comparisons').select('*').eq('id',quote.comparison_id).maybeSingle<QuoteComparisonRecord>()
    if(comparison.error)throw new Error('Could not load current request matching options.')
    const current=comparison.data
    if(current?.request_id&&['draft','review'].includes(current.status)&&!current.active_route_id&&!current.awarded_bid_id&&!['sent','accepted'].includes(current.client_quote_status)){
      const source=await supabase.from('quote_request_items').select('id,name,quantity,unit,department,metadata,qualification_status').eq('request_id',current.request_id).order('created_at').returns<ReviewableMaterialItem[]>()
      if(source.error||comparisonItemsResult.error)throw new Error('Could not load the saved request list.')
      const projected=currentRequestComparison(source.data??[],(comparisonItemsResult.data??[]) as QuoteComparisonItemRecord[])
      if(projected.missingSourceIds.length)throw new Error('Some saved request items are not ready for matching. Complete Step 1 first.')
      matchingItems=projected.items.map((item,index)=>({id:item.id,description:`${index+1}. ${projected.materialLines[item.id]}`,specification:''}))
      currentList=true
    }
  }
  const signed = await supabase.storage.from(SUPPLIER_QUOTE_BUCKET).createSignedUrl(quote.file_path, 1800)
  const suppliers = Array.isArray(suppliersResult.data)
    ? (suppliersResult.data as Array<{ id: string; name: string }>).filter((entry) => entry.id && entry.name)
    : []
  const visibleItems=(itemsResult.data??[]).map(item=>currentList&&item.comparison_item_id&&!matchingItems.some(target=>target.id===item.comparison_item_id)?{...item,comparison_item_id:null}:item)
  return <SupplierQuoteWorkspace quote={quote} initialItems={visibleItems} documentUrl={signed.data?.signedUrl ?? null} departments={materialCatalogDepartmentOptions([quote.department])} suppliers={suppliers} comparisonItems={matchingItems} />
}
