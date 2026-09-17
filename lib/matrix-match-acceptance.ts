import type { QuoteComparisonItemRecord } from './quote-comparison'
import type { ReceivedSupplierQuote } from '@/components/buildflow/received-supplier-quote-table'
import { receivedProductPriceRows, comparisonIndicators } from './received-product-prices'

export type MatrixAcceptance = { itemId:string; quoteId:string; lineNumber:number; basis:'quoted-line'|'requested-quantity'; actorId?:string; acceptedAt?:string }
export function parseMatrixAcceptances(value:unknown):MatrixAcceptance[]|null {
 if(!Array.isArray(value)||value.length>1000)return null
 const result:MatrixAcceptance[]=[]
 for(const entry of value){
  if(!entry||typeof entry!=='object'||Array.isArray(entry))return null
  const r=entry as Record<string,unknown>
  if(typeof r.itemId!=='string'||!/^[a-z0-9-]{1,100}$/i.test(r.itemId)||typeof r.quoteId!=='string'||!/^[a-z0-9-]{1,100}$/i.test(r.quoteId)||!Number.isSafeInteger(r.lineNumber)||Number(r.lineNumber)<0||!['quoted-line','requested-quantity'].includes(String(r.basis)))return null
  result.push({itemId:r.itemId,quoteId:r.quoteId,lineNumber:Number(r.lineNumber),basis:r.basis as MatrixAcceptance['basis'],...(typeof r.actorId==='string'?{actorId:r.actorId}:{}),...(typeof r.acceptedAt==='string'?{acceptedAt:r.acceptedAt}:{})})
 }
 return result
}
const unit=(s:string)=>s.trim().toLowerCase().replace(/^(?:pc|pcs|piece|pieces|ea)$/, 'each')
const valid=(n:unknown)=>n!==null&&n!==undefined&&n!==''&&Number.isFinite(Number(n))&&Number(n)>=0
/** Cost acceptance is not engineering certification or purchase/order approval. */
export function matrixAcceptanceCost(a:MatrixAcceptance,items:QuoteComparisonItemRecord[],quotes:ReceivedSupplierQuote[]):number|null {
 const item=items.find(i=>i.id===a.itemId),quote=quotes.find(q=>q.id===a.quoteId)
 if(!item||!quote)return null
 const cell=receivedProductPriceRows(items,[quote]).find(row=>row.item.id===item.id)?.cells[0]
 const candidates=cell?.lines.filter(l=>l.line_number===a.lineNumber)??[]
 const line=candidates.length===1?candidates[0]:null
 if(!line||!Number.isFinite(Number(item.quantity))||Number(item.quantity)<=0)return null
 const packaging=comparisonIndicators(item,[line],cell?.reasons??[]).some(i=>i.kind==='packaging')
 if(packaging){
  // Use the original quoted total, never a guessed box-to-piece conversion.
  const original=quote.sourceItems?.find(l=>l.line_number===a.lineNumber)
  return a.basis==='quoted-line'&&original&&valid(original.line_total)?Math.round((Number(original.line_total)+Number.EPSILON)*100)/100:null
 }
 if(a.basis!=='requested-quantity'||unit(line.unit)!==unit(item.unit)||!valid(line.unit_price))return null
 return Math.round((Number(line.unit_price)*Number(item.quantity)+Number.EPSILON)*100)/100
}
export function matrixAcceptancesError(acceptances:MatrixAcceptance[],items:QuoteComparisonItemRecord[],quotes:ReceivedSupplierQuote[]):string|null {
 const sources=new Set<string>(),cells=new Set<string>()
 for(const a of acceptances){
  const source=`${a.quoteId}:${a.lineNumber}`,cell=`${a.itemId}:${a.quoteId}`
  if(sources.has(source))return 'This supplier source is already accepted for another item. Allocate a separate source before including both.'
  if(cells.has(cell))return 'Choose only one supplier source for this item.'
  if(matrixAcceptanceCost(a,items,quotes)===null)return 'The accepted source or price is unavailable. Review the exact source and cost basis.'
  sources.add(source);cells.add(cell)
 }
 return null
}
