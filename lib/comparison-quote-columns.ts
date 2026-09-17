import type { ReceivedSupplierQuote } from '@/components/buildflow/received-supplier-quote-table'
import type { QuoteComparisonBidRecord } from './quote-comparison'

/** Display-only grouping: retain every original document and never merge records or approvals. */
export function comparisonQuoteColumns(quotes:ReceivedSupplierQuote[],bids:QuoteComparisonBidRecord[]) {
 const columns:ReceivedSupplierQuote[]=[],aliases:Record<string,string>={},seen=new Map<string,string>()
 for(const quote of quotes){
  const hasReviewedBid=bids.some(b=>b.source_supplier_quote_id===quote.id&&(b.quote_comparison_prices??[]).some(p=>(p.quote_product_match_confirmations??[]).length))
  const key=quote.duplicateKey&&!hasReviewedBid?JSON.stringify([quote.duplicateKey,[...(quote.sourceItems??[])].sort((a,b)=>a.line_number-b.line_number)]):''
  const previous=key?seen.get(key):undefined
  if(previous){aliases[quote.id]=previous;continue}
  columns.push(quote);aliases[quote.id]=quote.id;if(key)seen.set(key,quote.id)
 }
 return {columns,aliases}
}
export async function quoteDuplicateKey(quote:{supplier_name:string;quote_number:string;quote_date:string|null;file_name:string;file_size:number;mime_type:string;raw_text:string}){
 if(!quote.raw_text?.trim())return undefined
 const identity=JSON.stringify([quote.supplier_name?.trim().toLowerCase(),quote.quote_number,quote.quote_date,quote.file_name,quote.file_size,quote.mime_type,quote.raw_text])
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(identity))
 return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')
}
