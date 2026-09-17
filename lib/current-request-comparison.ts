import type { ReviewableMaterialItem } from './client-material-review'
import type { QuoteComparisonItemRecord } from './quote-comparison'
import { effectiveRequestComparisonItems, requestItemSpecification } from './supplier-quote-routing'
import { materialSpreadsheetDraft } from './material-spreadsheet-draft'
import { materialCleanLine } from './material-clean-line'
import { requestOriginalLine } from './request-original-lines'

/** Read-only view. Stable comparison IDs retain every supplier price and audit record. */
export function currentRequestComparison(requestItems:ReviewableMaterialItem[],stored:QuoteComparisonItemRecord[]) {
  const current=effectiveRequestComparisonItems(requestItems)
  const bySource=new Map(stored.filter(item=>item.source_request_item_id).map(item=>[item.source_request_item_id,item]))
  const materialLines:Record<string,string>={}
  const originalLines:Record<string,string>={}
  const sourceById=new Map(requestItems.map(item=>[item.id,item]))
  const materialSpecifications:Record<string,string>={}
  const missingSourceIds:string[]=[]
  const items=current.flatMap((source,index)=>{
    const saved=bySource.get(source.id)
    if(!saved){missingSourceIds.push(source.id);return[]}
    const draft=materialSpreadsheetDraft(source)
    materialLines[saved.id]=materialCleanLine(draft)
    const original=requestOriginalLine(source,sourceById.get(String(source.metadata?.source_item_id||''))??null)
    if(original)originalLines[saved.id]=original.text
    materialSpecifications[saved.id]=materialCleanLine({...draft,name:'',quantity:'',unit:''})
    return[{...saved,description:source.name,quantity:source.quantity,unit:source.unit||'',specification:requestItemSpecification(source.metadata,source.department),sort_order:index}]
  })
  return{items,materialLines,originalLines,materialSpecifications,missingSourceIds}
}
