import { receivedPriceSummary } from './received-price-summary'
import type { QuoteComparisonBidRecord } from './quote-comparison'

type Summary = ReturnType<typeof receivedPriceSummary>
const cents = (n:number) => Math.round((n+Number.EPSILON)*100)/100
/** Only compare the same requested row, excluding detected conflicts and source reuse. */
export function comparisonSavings(summary:Summary, baselineId:string, selections?:Record<string,string>) {
  const rows=summary.cells.map((cells,index)=>{
    const comparable=cells.filter(cell=>cell.indicative&&!cell.problem&&cell.requestedTotal!==null)
    const cheapest=comparable.length?comparable.reduce((a,b)=>a.requestedTotal!<=b.requestedTotal!?a:b):null
    const priced=cells.filter(cell=>cell.requestedTotal!==null&&!cell.missing)
    const lowestQuoted=priced.length?priced.reduce((a,b)=>a.requestedTotal!<=b.requestedTotal!?a:b):null
    const baseline=cells.find(cell=>cell.quoteId===baselineId)??null
    const selected=selections===undefined?cheapest:cells.find(c=>c.quoteId===selections[summary.rows[index].item.id])??null
    const savings=baseline&&selected&&comparable.includes(baseline)&&comparable.includes(selected)?cents(baseline.requestedTotal!-selected.requestedTotal!):null
    return {baseline,cheapest,lowestQuoted,selected,savings,missing:cells.every(cell=>cell.missing),review:cells.some(cell=>!cell.missing)&&!cheapest}
  })
  const sum=(values:(number|null|undefined)[])=>values.some(value=>value!=null)?cents(values.reduce<number>((n,value)=>n+(value??0),0)):null
  return {rows,selectedCount:rows.filter(row=>row.selected!==null).length,selectedComplete:rows.length>0&&rows.every(row=>row.selected?.indicative&&!row.selected.problem),selectedTotal:sum(rows.map(row=>row.selected?.indicative?row.selected.requestedTotal:null)),baselineComplete:rows.length>0&&rows.every(row=>row.baseline?.indicative&&!row.baseline.problem),cheapestComplete:rows.length>0&&rows.every(row=>row.cheapest!==null),baselineTotal:sum(rows.map(row=>row.baseline?.indicative?row.baseline.requestedTotal:null)),cheapestTotal:sum(rows.map(row=>row.cheapest?.requestedTotal)),savingsTotal:sum(rows.map(row=>row.savings)),comparedCount:rows.filter(row=>row.savings!==null).length,missingCount:rows.filter(row=>row.missing).length,reviewCount:rows.filter(row=>row.review).length}
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

/** Purchasing intentions may use source quotes without promoting them to reviewed bids. */
export function purchasingDraftCosts(summary:Summary,bids:QuoteComparisonBidRecord[],selections:Record<string,string>){
 const groups=new Map<string,{name:string;quotes:Set<string>;materials:number;bid:QuoteComparisonBidRecord|undefined}>()
 summary.rows.forEach((row,index)=>{
  const quoteId=selections[row.item.id],cell=summary.cells[index].find(c=>c.quoteId===quoteId)
  if(!cell||!cell.indicative||cell.requestedTotal===null)return
  const bid=bids.find(b=>b.source_supplier_quote_id===quoteId),name=summary.suppliers.find(s=>s.quote.id===quoteId)?.quote.supplierName??'Supplier'
  const id=bid?.supplier_id?.split(':')[0]||name.trim().toLowerCase(),group=groups.get(id)||{name,quotes:new Set<string>(),materials:0,bid}
  group.quotes.add(quoteId);group.materials=cents(group.materials+cell.requestedTotal);groups.set(id,group)
 })
 const valid=(n:unknown)=>n!==null&&n!==undefined&&n!==''&&Number.isFinite(Number(n))&&Number(n)>=0
 const suppliers=[...groups.values()].map(g=>{
  const bid=g.quotes.size===1?g.bid:undefined,delivery=bid&&valid(bid.delivery_charge)?Number(bid.delivery_charge):null
  const tax=bid&&delivery!==null&&valid(bid.tax_percent)&&Number(bid.tax_percent)<=100?cents((g.materials+delivery)*Number(bid.tax_percent)/100):null
  return {name:g.name,materials:g.materials,delivery,tax,total:delivery!==null&&tax!==null?cents(g.materials+delivery+tax):null}
 })
 return {suppliers,selectedCount:Object.values(selections).filter(Boolean).length,materials:suppliers.length?cents(suppliers.reduce((n,s)=>n+s.materials,0)):null,total:suppliers.length&&suppliers.every(s=>s.total!==null)?cents(suppliers.reduce((n,s)=>n+s.total!,0)):null}
}
