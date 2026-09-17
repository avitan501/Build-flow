import { comparisonIndicators } from "@/lib/received-product-prices"
import { receivedPriceSummary,requestedSourceTotal } from "@/lib/received-price-summary"
import { buildProductQuotePreview } from "@/lib/product-quote-preview"
import { formatComparisonMoney, type QuoteComparisonItemRecord, type QuoteComparisonBidRecord } from "@/lib/quote-comparison"
import type { ReceivedSupplierQuote } from "@/components/buildflow/received-supplier-quote-table"

function sourceMoney(value: unknown) {
  return value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value)) ? formatComparisonMoney(Number(value)) : "—"
}
function sourceUnitMoney(value:unknown){
 return value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:4}).format(Number(value)):'—'
}
const legend=[
 {kind:'packaging',label:'Selling units / packaging',color:'bg-blue-600',note:'Confirm package contents before comparing boxes, cartons or individual pieces. No automatic conversion.'},
 {kind:'quantity',label:'Quantity',color:'bg-rose-600',note:'Two pink-red dots: a quantity difference in comparable selling units.'},
 {kind:'measurement',label:'Measurements',color:'bg-red-600',note:'Red: different measurements.'},
 {kind:'alternative',label:'Alternative',color:'bg-orange-500',note:'Orange: alternative material, model or mount; not an approved equivalent.'},
 {kind:'unverified',label:'Not verified',color:'bg-yellow-400',note:'Yellow: manual verification or source allocation is still required.'},
 {kind:'verified',label:'Reviewed',color:'bg-emerald-600',note:'Green: saved manual review. Independent detected differences remain visible.'},
]
export function ReceivedProductPriceMatrix({ items, quotes, bids, requestedMaterialLines = {} }: { items: QuoteComparisonItemRecord[]; quotes: ReceivedSupplierQuote[]; bids: QuoteComparisonBidRecord[]; requestedMaterialLines?:Record<string,string> }) {
 const reviewed=buildProductQuotePreview(items,bids).rows
 const totals=receivedPriceSummary(items,quotes,bids)
 const commonLowest=totals.commonCount?Math.min(...totals.commonTotals.map(s=>s.total!)):null
 return <section className="min-w-0" aria-label="Product price comparison">
  <h2 className="mb-2 text-lg font-bold">Compare product prices</h2>
  <div aria-label="Comparison status guide" data-testid="comparison-status-guide" className="mb-3 flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
   {legend.map(entry=><details key={entry.kind}><summary title={entry.note} className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 text-xs focus-visible:outline-2 focus-visible:outline-sky-600"><span aria-hidden="true" className={'h-2.5 w-2.5 rounded-full '+entry.color}/>{entry.kind==='quantity'?<span aria-hidden="true" className={'-ml-1 h-2.5 w-2.5 rounded-full '+entry.color}/>:null}{entry.label}</summary><p className="max-w-64 p-2 text-xs text-slate-600">{entry.note} Click the corresponding dot beside a price to review the request and supplier wording.</p></details>)}
  </div>
  <p className="mb-3 text-xs text-slate-500">Click a dot for details. Savings compare the lowest and highest manually verified prices for the requested quantity. Delivery and tax excluded.</p>
  <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_17rem]">
  <div className="max-w-full overflow-x-auto rounded-xl border border-slate-200"><table className="w-full text-left text-xs" data-testid="product-price-matrix"><thead className="bg-slate-50"><tr><th className="sticky left-0 z-10 min-w-48 bg-slate-50 p-3">Requested product</th>{quotes.map(quote=><th key={quote.id} className="min-w-48 p-3">{quote.supplierName||quote.fileName}</th>)}<th className="min-w-36 p-3">Savings / item</th></tr></thead><tbody>
   {totals.rows.map((row,index)=>{
    const verified=reviewed[index].offers.filter(offer=>offer.eligible&&offer.confirmation&&offer.unitPrice!==null).map(offer=>Number(offer.unitPrice))
    const savings=verified.length>=2?(Math.max(...verified)-Math.min(...verified))*Number(row.item.quantity):null
    return <tr key={row.item.id} className="border-t border-slate-200 align-top"><th className="sticky left-0 z-10 max-w-72 bg-white p-3 font-normal" data-testid="requested-material-line">{requestedMaterialLines[row.item.id]?<p className="font-semibold">{requestedMaterialLines[row.item.id]}</p>:<><p className="font-bold">{row.item.quantity} {row.item.unit} · {row.item.description}</p><p className="mt-1 text-slate-500">{row.item.specification}</p></>}</th>{row.cells.map(cell=>{
     const offer=reviewed[index].offers.find(offer=>offer.bid.source_supplier_quote_id===cell.quote.id)
     const lowest=offer?.eligible&&Boolean(offer.confirmation)&&offer.unitPrice===reviewed[index].lowest?.unitPrice
     const indicators=comparisonIndicators(row.item,cell.lines,cell.reasons).filter(indicator=>indicator.kind!=='unverified'||!offer?.confirmation||indicator.notes.length>1)
     const amounts=totals.cells[index].find(value=>value.quoteId===cell.quote.id)!
     return <td key={cell.quote.id} className={'p-3 '+(lowest?'bg-emerald-50':'')} data-testid="source-product-price">
      <div className="mb-2 flex flex-wrap gap-1">
       {offer?.confirmation?<details data-testid="verified-price-indicator"><summary aria-label="Reviewed" title="Saved manual review" className="inline-flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center focus-visible:outline-2"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-emerald-600"/></summary><p className="p-2 text-slate-600">Saved manual review. Detected differences remain shown separately.</p></details>:null}
       {indicators.map(indicator=>{const style=legend.find(entry=>entry.kind===indicator.kind)!;return <details key={indicator.kind} data-kind={indicator.kind} data-testid={indicator.kind==='unverified'?'unverified-price-indicator':'comparison-issue-indicator'}><summary aria-label={style.label} title={indicator.notes.join(' ')} className="inline-flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center gap-1 focus-visible:outline-2 focus-visible:outline-sky-600 [&::-webkit-details-marker]:hidden"><span aria-hidden="true" className={'h-2.5 w-2.5 rounded-full '+style.color}/>{indicator.kind==='quantity'?<span aria-hidden="true" className={'h-2.5 w-2.5 rounded-full '+style.color}/>:null}</summary><div className="max-w-64 rounded-md bg-slate-50 p-2 text-slate-700"><p>{indicator.notes[0]}</p>{indicator.notes.length>1?<ul aria-label="Comparison checks" className="mt-1 list-disc space-y-1 pl-4">{indicator.notes.slice(1).map(note=><li key={note}>{note}</li>)}</ul>:null}<p className="mt-2 font-semibold">Request: {requestedMaterialLines[row.item.id]||`${row.item.quantity} ${row.item.unit} · ${row.item.description} · ${row.item.specification||''}`}</p>{(cell.lines.length?cell.lines:cell.blockedLines).map(line=><p key={line.allocationKey||line.line_number} className="mt-1">Supplier line {line.line_number}: {line.description} · {line.specification} · {line.originalFeet??line.quantity} {line.calculatedRate!==undefined?'lin. ft.':line.unit}</p>)}<a href={'/admin/supplier-quotes/'+cell.quote.id} className="mt-1 inline-flex min-h-11 items-center font-semibold text-sky-800">Review match</a></div></details>})}
      </div>
      {offer?.eligible&&offer.confirmation?<><p className="text-[10px] text-slate-500">Unit price</p><p className="text-base font-bold">{formatComparisonMoney(offer.unitPrice!)} / {row.item.unit}</p>{amounts.requestedTotal!==null?<p data-testid="requested-line-total" className="mt-2 text-sm font-semibold tabular-nums">Line total: {sourceMoney(amounts.requestedTotal)}<span className="mt-1 block text-[10px] font-normal text-slate-500">{row.item.quantity} {row.item.unit} requested · verified price</span></p>:null}{lowest?<p className="mt-1 text-emerald-800">Lowest verified price</p>:null}</>:cell.lines.length?<>{cell.lines.slice(0,3).map(line=><div key={line.allocationKey||line.line_number} className="mb-2"><p className="text-[10px] text-slate-500">Unit price</p><p className="text-base font-bold tabular-nums">{sourceUnitMoney(line.unit_price)} / {line.unit||'unit'}</p><p data-testid="requested-line-total" className="mt-2 text-sm font-semibold tabular-nums">Line total: {sourceMoney(requestedSourceTotal(row.item,line))}<span className="mt-1 block text-[10px] font-normal text-slate-500">{requestedSourceTotal(row.item,line)===null?'Selling units need review':`${row.item.quantity} ${row.item.unit} × ${sourceUnitMoney(line.unit_price)} · indicative`}</span></p>{line.calculatedRate!==undefined?<p data-testid="linear-foot-calculation" className="mt-1 text-[10px] text-slate-500">Calculated: {sourceMoney(line.calculatedRate)} / lin. ft. × {line.requestedFeet} ft = {sourceMoney(line.line_total)} requested line total. Original quoted footage: {line.originalFeet} ft.</p>:<p className="mt-1 text-[10px] text-slate-500">Quoted: {line.quantity} {line.unit} · {sourceMoney(line.line_total)} line total</p>}<details className="mt-1"><summary className="min-h-8 cursor-pointer text-[10px] text-slate-500">Supplier wording · line {line.line_number}</summary><p className="mt-1 break-words">{line.description} · {line.specification}</p></details></div>)}</>:<p className="text-slate-500">{cell.blockedLines.length?'No offer allocated · review quote':'No matched line · review quote'}</p>}
      <a href={'/admin/supplier-quotes/'+cell.quote.id} className="mt-2 inline-flex min-h-11 items-center font-semibold text-sky-800">Review match</a>
     </td>
    })}<td data-testid="item-savings" className="p-3 font-semibold">{savings===null?'—':formatComparisonMoney(savings)}{savings===null?<p className="mt-1 text-[10px] font-normal text-slate-500">Needs two verified prices</p>:<p className="mt-1 text-[10px] font-normal text-slate-500">For {row.item.quantity} {row.item.unit}; versus highest verified quote</p>}</td></tr>
   })}
  </tbody></table></div>
  <aside aria-label="Supplier cost summary" data-testid="supplier-cost-summary" className="min-w-0 self-start rounded-xl border border-slate-200 bg-slate-50 p-4 xl:sticky xl:top-6">
   <h3 className="text-base font-bold">Supplier summary</h3>
   <p className="mt-2 text-xs text-slate-500">For requested quantities. Indicative subtotals include unapproved alternatives, but exclude ambiguous or shared source rows and unknown selling units. Tax and delivery excluded.</p>
   <div className="mt-4 space-y-4">{totals.suppliers.map((supplier,index)=><section key={supplier.quote.id} data-testid="supplier-summary-row" className="border-t border-slate-200 pt-3">
    <a href={'/admin/supplier-quotes/'+supplier.quote.id} className="block min-h-11 text-xs font-bold text-sky-800">{supplier.quote.supplierName||supplier.quote.fileName}</a>
    <dl className="space-y-2 text-xs">
     <div><dt className="text-slate-500">Indicative subtotal</dt><dd data-testid="supplier-indicative-total" className="text-lg font-bold tabular-nums">{sourceMoney(supplier.indicativeTotal)}</dd><dd className="text-[10px] text-slate-500">{supplier.pricedCount}/{totals.totalCount} priced rows · not an approved order</dd></div>
     <div className="flex justify-between gap-2"><dt>Verified subtotal</dt><dd data-testid="supplier-verified-total" className="font-semibold tabular-nums">{sourceMoney(supplier.verifiedTotal)} · {supplier.verifiedCount}/{totals.totalCount}</dd></div>
     <div className="flex justify-between gap-2"><dt>Missing rows</dt><dd data-testid="supplier-missing-count" className="font-semibold">{supplier.missingCount}</dd></div>
     <div className="flex justify-between gap-2"><dt>Alternatives</dt><dd className="font-semibold">{supplier.alternativeCount}</dd></div>
     <div className="flex justify-between gap-2"><dt>Review / allocation</dt><dd className="font-semibold">{supplier.reviewCount}</dd></div>
     {totals.commonCount?<div><dt>Same verified rows · {totals.commonCount}</dt><dd className="font-bold tabular-nums">{sourceMoney(totals.commonTotals[index].total)}{totals.commonTotals[index].total===commonLowest?' · Lowest on these rows':''}</dd></div>:null}
    </dl>
   </section>)}</div>
   {!totals.commonCount?<p className="mt-4 border-t border-slate-200 pt-3 text-xs text-slate-500">No common verified rows yet. Partial subtotals cannot identify the cheapest complete order.</p>:<p className="mt-4 text-xs text-slate-500">Ranking compares only the same {totals.commonCount} verified rows across every supplier, not the full order.</p>}
  </aside></div>
 </section>
}
