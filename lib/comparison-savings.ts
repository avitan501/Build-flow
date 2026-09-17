import { receivedPriceSummary } from './received-price-summary'
import type { QuoteComparisonBidRecord } from './quote-comparison'

type Summary = ReturnType<typeof receivedPriceSummary>
const cents = (n:number) => Math.round((n+Number.EPSILON)*100)/100
/** Only compare the same requested row, excluding detected conflicts and source reuse. */
export function comparisonSavings(summary:Summary, baselineId:string) {
  const rows=summary.cells.map(cells=>{
    const comparable=cells.filter(cell=>cell.indicative&&!cell.problem&&cell.requestedTotal!==null)
    const cheapest=comparable.length?comparable.reduce((a,b)=>a.requestedTotal!<=b.requestedTotal!?a:b):null
    const baseline=cells.find(cell=>cell.quoteId===baselineId)??null
    const savings=baseline&&cheapest&&comparable.includes(baseline)?cents(baseline.requestedTotal!-cheapest.requestedTotal!):null
    return {baseline,cheapest,savings,missing:cells.every(cell=>cell.missing),review:cells.some(cell=>!cell.missing)&&!cheapest}
  })
  const sum=(values:(number|null|undefined)[])=>values.some(value=>value!=null)?cents(values.reduce<number>((n,value)=>n+(value??0),0)):null
  return {rows,baselineComplete:rows.length>0&&rows.every(row=>row.baseline?.indicative&&!row.baseline.problem),cheapestComplete:rows.length>0&&rows.every(row=>row.cheapest!==null),baselineTotal:sum(rows.map(row=>row.baseline?.indicative?row.baseline.requestedTotal:null)),cheapestTotal:sum(rows.map(row=>row.cheapest?.requestedTotal)),savingsTotal:sum(rows.map(row=>row.savings)),comparedCount:rows.filter(row=>row.savings!==null).length,missingCount:rows.filter(row=>row.missing).length,reviewCount:rows.filter(row=>row.review).length}
}

export function selectedSupplierCosts(summary:Summary,bids:QuoteComparisonBidRecord[],selections:Record<string,string>){
 const groups=new Map<string,{bids:QuoteComparisonBidRecord[];subtotal:number}>()
 let selectedCount=0
 summary.rows.forEach((row,index)=>{
  const bid=bids.find(b=>b.id===selections[row.item.id])
  const cell=summary.cells[index].find(c=>c.quoteId===bid?.source_supplier_quote_id&&c.verified&&!c.problem&&c.requestedTotal!==null)
  if(!bid||!cell)return
  const id=bid.supplier_id?.split(':')[0]||bid.id,group=groups.get(id)||{bids:[],subtotal:0}
  if(!group.bids.some(b=>b.id===bid.id))group.bids.push(bid)
  group.subtotal=cents(group.subtotal+cell.requestedTotal!);groups.set(id,group);selectedCount++
 })
 const valid=(n:unknown)=>n!==null&&n!==undefined&&n!==''&&Number.isFinite(Number(n))&&Number(n)>=0
 const suppliers=[...groups.values()].map(group=>{
  // Two quotes at the same physical supplier may have different freight policies: never double-charge or guess.
  const one=group.bids.length===1?group.bids[0]:null
  const delivery=one&&valid(one.delivery_charge)?Number(one.delivery_charge):null
  const tax=one&&delivery!==null&&valid(one.tax_percent)&&Number(one.tax_percent)<=100?cents((group.subtotal+delivery)*Number(one.tax_percent)/100):null
  return {name:group.bids[0].supplier_name_snapshot,materials:group.subtotal,delivery,tax,total:delivery!==null&&tax!==null?cents(group.subtotal+delivery+tax):null}
 })
 return {suppliers,selectedCount,materials:suppliers.length?cents(suppliers.reduce((n,s)=>n+s.materials,0)):null,total:suppliers.length&&suppliers.every(s=>s.total!==null)?cents(suppliers.reduce((n,s)=>n+s.total!,0)):null}
}
