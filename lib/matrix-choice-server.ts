import type { SupabaseClient } from '@supabase/supabase-js'
import type { QuoteComparisonItemRecord } from './quote-comparison'
import type { ReceivedSupplierQuoteLine } from '@/components/buildflow/received-supplier-quote-table'
import type { ReviewableMaterialItem } from './client-material-review'
import { currentRequestComparison } from './current-request-comparison'

export async function loadMatrixChoiceSource(supabase:SupabaseClient,comparisonId:string,items:QuoteComparisonItemRecord[]) {
 const parent=await supabase.from('quote_comparisons').select('request_id').eq('id',comparisonId).maybeSingle<{request_id:string|null}>()
 const quotes=await supabase.from('supplier_quotes').select('id,supplier_name,file_name,supplier_quote_items(line_number,description,specification,quantity,unit,unit_price,line_total,comparison_item_id)').eq('comparison_id',comparisonId).order('created_at').returns<Array<{id:string;supplier_name:string;file_name:string;supplier_quote_items:ReceivedSupplierQuoteLine[]}>>()
 if(parent.error||!parent.data||quotes.error)throw Error('Could not check the comparison source.')
 let currentItems=items
 if(parent.data.request_id){
  const request=await supabase.from('quote_request_items').select('id,name,quantity,unit,department,metadata,qualification_status').eq('request_id',parent.data.request_id).order('created_at').returns<ReviewableMaterialItem[]>()
  if(request.error)throw Error('Could not check the request list.')
  currentItems=currentRequestComparison(request.data??[],items).items
 }
 return {items:currentItems,quotes:(quotes.data??[]).map(q=>({id:q.id,supplierName:q.supplier_name,fileName:q.file_name,sourceItems:q.supplier_quote_items??[]}))}
}
