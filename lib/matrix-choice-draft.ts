import type { ReceivedSupplierQuote } from '@/components/buildflow/received-supplier-quote-table'
import type { QuoteComparisonItemRecord } from './quote-comparison'

/** Separate purchasing intentions from reviewed bid selections and order approval. */
export type MatrixChoiceDraft = { baselineQuoteId:string; selections:Record<string,string>; sourceFingerprint:string }
export function parseMatrixChoiceDraft(value:unknown):MatrixChoiceDraft|null {
 if(!value||typeof value!=='object'||Array.isArray(value))return null
 const raw=value as Record<string,unknown>
 if(typeof raw.baselineQuoteId!=='string'||!/^[a-z0-9-]{0,100}$/i.test(raw.baselineQuoteId)||typeof raw.sourceFingerprint!=='string'||!/^[a-f0-9]{64}$/.test(raw.sourceFingerprint)||!raw.selections||typeof raw.selections!=='object'||Array.isArray(raw.selections))return null
 const entries=Object.entries(raw.selections)
 if(entries.length>1000||entries.some(([id,q])=>!/^[a-z0-9-]{1,100}$/i.test(id)||typeof q!=='string'||!/^[a-z0-9-]{0,100}$/i.test(q)))return null
 return {baselineQuoteId:raw.baselineQuoteId,selections:Object.fromEntries(entries),sourceFingerprint:raw.sourceFingerprint}
}
export function matrixChoiceScopeError(draft:MatrixChoiceDraft,items:QuoteComparisonItemRecord[],quotes:ReceivedSupplierQuote[]) {
 const ids=new Set(items.map(i=>i.id)),quoteIds=new Set(quotes.map(q=>q.id))
 return draft.baselineQuoteId&&!quoteIds.has(draft.baselineQuoteId)||Object.entries(draft.selections).some(([id,q])=>!ids.has(id)||(q!==''&&!quoteIds.has(q)))?'A selected item or quote is no longer in this comparison. Reload before saving.':null
}
export async function matrixChoiceFingerprint(items:QuoteComparisonItemRecord[],quotes:ReceivedSupplierQuote[]) {
 const source={items:[...items].sort((a,b)=>a.id.localeCompare(b.id)).map(i=>[i.id,i.description,i.specification,i.quantity,i.unit]),quotes:[...quotes].sort((a,b)=>a.id.localeCompare(b.id)).map(q=>[q.id,q.supplierName,[...(q.sourceItems??[])].sort((a,b)=>a.line_number-b.line_number)])}
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(source)))
 return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')
}
export function restoreMatrixChoices(value:unknown,fingerprint:string) {
 const raw=value&&typeof value==='object'&&!Array.isArray(value)?(value as Record<string,unknown>).matrix:undefined
 const parsed=parseMatrixChoiceDraft(raw),stale=raw!==undefined&&(!parsed||parsed.sourceFingerprint!==fingerprint)
 return {baselineQuoteId:stale?'':parsed?.baselineQuoteId??'',selections:stale?{}:parsed?.selections??{},warning:stale?'Request or source quotes changed. Review your purchasing draft again.':''}
}
