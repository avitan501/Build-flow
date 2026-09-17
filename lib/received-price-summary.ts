import { receivedProductPriceRows,comparisonIndicators } from '@/lib/received-product-prices'
import { buildProductQuotePreview } from '@/lib/product-quote-preview'
import type { QuoteComparisonItemRecord,QuoteComparisonBidRecord } from '@/lib/quote-comparison'
import type { ReceivedSupplierQuote } from '@/components/buildflow/received-supplier-quote-table'
import {matrixAcceptanceCost,matrixAcceptancesError,type MatrixAcceptance} from './matrix-match-acceptance'

const money=(value:number)=>Math.round((value+Number.EPSILON)*100)/100
const unit=(value:string)=>value.trim().toLowerCase().replace(/^(?:pc|pcs|piece|pieces|ea)$/, 'each')
const validPrice=(value:unknown)=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))&&Number(value)>=0
export function requestedSourceTotal(item:QuoteComparisonItemRecord,line:NonNullable<ReceivedSupplierQuote['sourceItems']>[number]):number|null {
 if(unit(line.unit)!==unit(item.unit)||/box|pack|carton|bundle|pkg|ctn/i.test(`${line.unit} ${item.unit}`)||!validPrice(line.unit_price)||!Number.isFinite(Number(item.quantity))||Number(item.quantity)<=0)return null
 return money(Number(line.unit_price)*Number(item.quantity))
}

/** Requested-quantity arithmetic is not supplier availability or match approval. */
export function receivedPriceSummary(items:QuoteComparisonItemRecord[],quotes:ReceivedSupplierQuote[],bids:QuoteComparisonBidRecord[],accepted:MatrixAcceptance[]=[]){
 const acceptances=matrixAcceptancesError(accepted,items,quotes)?[]:accepted
 const rows=receivedProductPriceRows(items,quotes),reviewed=buildProductQuotePreview(items,bids).rows
 const cells=rows.map((row,index)=>row.cells.map(cell=>{
  const offer=reviewed[index].offers.find(o=>o.bid.source_supplier_quote_id===cell.quote.id)
  const verified=Boolean(offer?.eligible&&offer.confirmation&&offer.unitPrice!==null)
  const indicators=comparisonIndicators(row.item,cell.lines,cell.reasons)
  const single=cell.lines.length===1?cell.lines[0]:null
  const comparable=single&&unit(single.unit)===unit(row.item.unit)&&!indicators.some(i=>i.kind==='packaging')
  const price=verified?offer!.unitPrice:comparable&&validPrice(single!.unit_price)?Number(single!.unit_price):null
  const acceptance=acceptances.find(a=>a.itemId===row.item.id&&a.quoteId===cell.quote.id)
  const acceptedTotal=acceptance?matrixAcceptanceCost(acceptance,items,quotes):null
  const reservedElsewhere=!acceptance&&cell.lines.some(line=>acceptances.some(a=>a.quoteId===cell.quote.id&&a.lineNumber===line.line_number&&a.itemId!==row.item.id))
  const requestedTotal=acceptedTotal??(price!==null&&Number.isFinite(Number(row.item.quantity))&&Number(row.item.quantity)>0?money(price*Number(row.item.quantity)):null)
  const alternative=indicators.some(i=>i.kind==='alternative')
  const problem=reservedElsewhere||(!acceptance&&(cell.sharedSource||cell.lines.length!==1||indicators.some(i=>['quantity','measurement','packaging','alternative'].includes(i.kind))||(!verified&&indicators.some(i=>i.notes.some(note=>note.startsWith('Measurement missing:'))))||cell.reasons.some(r=>/Section differs|exceeds quoted|already assigned/.test(r))))
  return {quoteId:cell.quote.id,unitPrice:price,requestedTotal,verified,acceptance,alternative,problem,missing:!cell.lines.length&&!cell.blockedLines.length,ambiguous:!acceptance&&cell.lines.length>1,allocatedElsewhere:reservedElsewhere||(!cell.lines.length&&cell.blockedLines.length>0),indicative:requestedTotal!==null&&!reservedElsewhere&&(!cell.sharedSource||Boolean(acceptance)),source:acceptance?cell.lines.find(l=>l.line_number===acceptance.lineNumber)??null:single}
 }))
 const suppliers=quotes.map((quote,index)=>{
  const values=cells.map(row=>row[index]),verified=values.filter(v=>v.verified&&v.requestedTotal!==null),indicative=values.filter(v=>v.indicative)
  return{quote,verifiedCount:verified.length,verifiedTotal:verified.length?money(verified.reduce((n,v)=>n+v.requestedTotal!,0)):null,pricedCount:indicative.length,indicativeTotal:indicative.length?money(indicative.reduce((n,v)=>n+v.requestedTotal!,0)):null,missingCount:values.filter(v=>v.missing).length,excludedCount:values.filter(v=>!v.missing&&!v.indicative).length,alternativeCount:values.filter(v=>v.alternative).length,reviewCount:values.filter(v=>(!v.verified&&!v.acceptance)||v.problem).length,ambiguousCount:values.filter(v=>v.ambiguous||v.allocatedElsewhere).length}
 })
 // Compare identical rows across all suppliers, never rank unequal partial orders.
 const common=quotes.length>=2?cells.filter(row=>row.every(v=>v.verified&&!v.problem&&v.requestedTotal!==null)):[]
 const commonTotals=quotes.map((quote,index)=>({quoteId:quote.id,total:common.length?money(common.reduce((n,row)=>n+row[index].requestedTotal!,0)):null}))
 return {rows,cells,suppliers,commonCount:common.length,commonTotals,totalCount:items.length}
}
