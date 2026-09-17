import { comparisonIndicators, receivedProductPriceRows } from "@/lib/received-product-prices"
import { buildProductQuotePreview } from "@/lib/product-quote-preview"
import { formatComparisonMoney, type QuoteComparisonItemRecord, type QuoteComparisonBidRecord } from "@/lib/quote-comparison"
import type { ReceivedSupplierQuote } from "@/components/buildflow/received-supplier-quote-table"

function sourceMoney(value: unknown) {
  return value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value)) ? formatComparisonMoney(Number(value)) : "—"
}
const legend=[
  {kind:'quantity',label:'Qty · כמות',color:'bg-rose-600',note:'Two pink-red dots: quantity mismatch in comparable selling units. שתי נקודות: הבדל בכמות.'},
  {kind:'measurement',label:'Size · מידה',color:'bg-red-600',note:'Red: measurement mismatch. אדום: הבדל במידות.'},
  {kind:'alternative',label:'Alternative · חלופה',color:'bg-orange-500',note:'Orange: alternative material, model or mount; not an approved equivalent. כתום: מוצר חלופי, לא התאמה מאושרת.'},
  {kind:'unverified',label:'Unverified · לא אומת',color:'bg-yellow-400',note:'Yellow: not fully manually verified, unknown package contents or unresolved allocation. צהוב: לא אומת ידנית או שיוך/אריזה דורשים בדיקה.'},
  {kind:'verified',label:'Reviewed · נבדק',color:'bg-emerald-600',note:'Green: saved manual review; any remaining detected difference stays visible. ירוק: בדיקה ידנית שמורה; הבדלים שנותרו אינם מוסתרים.'},
]

export function ReceivedProductPriceMatrix({ items, quotes, bids, requestedMaterialLines = {} }: { items: QuoteComparisonItemRecord[]; quotes: ReceivedSupplierQuote[]; bids: QuoteComparisonBidRecord[]; requestedMaterialLines?:Record<string,string> }) {
  const reviewed=buildProductQuotePreview(items,bids).rows
  return <section className="min-w-0" aria-label="Product price comparison">
    <h2 className="mb-2 text-lg font-bold">Compare product prices</h2>
    <div aria-label="Comparison status guide" className="mb-3 flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3" data-testid="comparison-status-guide">
      {legend.map(entry=><details key={entry.kind} className="min-w-0 text-xs"><summary title={entry.note+" Click to see details and the review action."} className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 focus-visible:outline-2 focus-visible:outline-sky-600 [&::-webkit-details-marker]:hidden"><span aria-hidden="true" className={"h-2.5 w-2.5 shrink-0 rounded-full "+entry.color}/>{entry.kind==='quantity'?<span aria-hidden="true" className={"-ml-1 h-2.5 w-2.5 rounded-full "+entry.color}/>:null}<span>{entry.label}</span></summary><p className="max-w-64 p-2 text-slate-600">{entry.note} Open the matching dot in a price cell, then select Review match.</p></details>)}
    </div>
    <p className="mb-3 text-xs text-slate-500">Click a dot for the exact difference and review action. Lowest prices require verified matches. Delivery and tax excluded.</p>
    <div className="max-w-full overflow-x-auto rounded-xl border border-slate-200"><table className="w-full text-left text-xs" data-testid="product-price-matrix"><thead className="bg-slate-50"><tr><th className="sticky left-0 z-10 min-w-48 bg-slate-50 p-3">Requested product</th>{quotes.map(quote=><th key={quote.id} className="min-w-48 p-3">{quote.supplierName||quote.fileName}</th>)}</tr></thead><tbody>
      {receivedProductPriceRows(items,quotes).map((row,index)=><tr key={row.item.id} className="border-t border-slate-200 align-top"><th className="sticky left-0 z-10 max-w-72 bg-white p-3 font-normal" data-testid="requested-material-line">{requestedMaterialLines[row.item.id]?<p className="font-semibold">{requestedMaterialLines[row.item.id]}</p>:<><p className="font-bold">{row.item.description}</p><p className="mt-1 text-slate-500">{row.item.specification}</p><p className="mt-1 font-semibold">{row.item.quantity} {row.item.unit}</p></>}</th>{row.cells.map(cell=>{
        const offer=reviewed[index].offers.find(offer=>offer.bid.source_supplier_quote_id===cell.quote.id)
        const lowest=offer?.eligible&&Boolean(offer.confirmation)&&offer.unitPrice===reviewed[index].lowest?.unitPrice
        const indicators=comparisonIndicators(row.item,cell.lines,cell.reasons).filter(indicator=>indicator.kind!=='unverified'||!offer?.confirmation||indicator.notes.length>1).map(indicator=>indicator.kind==='unverified'&&offer?.confirmation?{...indicator,label:'Check · בדיקה',notes:['Saved manual review; source allocation or selling-unit questions remain.',...indicator.notes.slice(1)]}:indicator)
        return <td key={cell.quote.id} className={"p-3 "+(lowest?"bg-emerald-50":"")} data-testid="source-product-price">
          <div className="mb-2 flex flex-wrap items-start gap-1">
            {offer?.confirmation?<details data-testid="verified-price-indicator"><summary title="Saved manual review — open details" className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-md px-2 focus-visible:outline-2 focus-visible:outline-sky-600 [&::-webkit-details-marker]:hidden"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-emerald-600"/>Reviewed</summary><p className="max-w-60 p-2 text-slate-600">Saved manual review. Any detected quantity, measurement or alternative-product issue remains shown separately.</p></details>:null}
            {indicators.map(indicator=>{const style=legend.find(entry=>entry.kind===indicator.kind)!;return <details key={indicator.kind} data-testid={indicator.kind==='unverified'?'unverified-price-indicator':'comparison-issue-indicator'} data-kind={indicator.kind} className="text-xs"><summary aria-label={indicator.kind==='unverified'?'Not verified':indicator.label} title={indicator.notes.join(' ')+" Click to review match."} className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-md border border-slate-200 px-2 focus-visible:outline-2 focus-visible:outline-sky-600 [&::-webkit-details-marker]:hidden"><span aria-hidden="true" className={"h-2.5 w-2.5 shrink-0 rounded-full "+style.color}/>{indicator.kind==='quantity'?<span aria-hidden="true" className={"-ml-1 h-2.5 w-2.5 rounded-full "+style.color}/>:null}<span>{indicator.label}</span></summary><div className="max-w-64 rounded-md bg-slate-50 p-2 text-slate-700"><p>{indicator.notes[0]}</p>{indicator.notes.length>1?<ul aria-label="Comparison checks" className="mt-1 list-disc space-y-1 pl-4">{indicator.notes.slice(1).map(note=><li key={note}>{note}</li>)}</ul>:null}<a href={"/admin/supplier-quotes/"+cell.quote.id} className="mt-1 inline-flex min-h-11 items-center font-semibold text-sky-800">Review match · בדוק התאמה</a></div></details>})}
          </div>
          {offer?.eligible?<><p className="text-base font-bold">{formatComparisonMoney(offer.unitPrice!)} / {row.item.unit}</p><p className={"mt-1 "+(offer.confirmation?"text-emerald-800":"text-slate-500")}>{lowest?"Lowest verified price":offer.confirmation?"Manually reviewed match":"Source price — not manually reviewed"}</p></>:cell.lines.length?<>{cell.lines.slice(0,3).map(line=><div key={line.allocationKey||line.line_number} className="mb-2"><p className="text-base font-bold tabular-nums">{sourceMoney(line.unit_price)} / {line.unit||"unit needs review"}</p><p className="mt-1 text-[10px] text-slate-500">Quoted: {line.quantity} {line.unit} · {sourceMoney(line.line_total)} line total</p><details className="mt-1"><summary className="min-h-8 cursor-pointer text-[10px] text-slate-500">Supplier wording · line {line.line_number}</summary><p className="mt-1 break-words">{line.description} · {line.specification}</p></details></div>)}</>:<p className="text-slate-500">No matched line · review quote</p>}
          <a href={"/admin/supplier-quotes/"+cell.quote.id} className="mt-2 inline-flex min-h-11 items-center font-semibold text-sky-800">Review match</a>
        </td>
      })}</tr>)}
    </tbody></table></div>
  </section>
}
