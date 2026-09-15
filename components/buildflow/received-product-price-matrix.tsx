import { receivedProductPriceRows } from "@/lib/received-product-prices"
import { buildProductQuotePreview } from "@/lib/product-quote-preview"
import { formatComparisonMoney, type QuoteComparisonItemRecord, type QuoteComparisonBidRecord } from "@/lib/quote-comparison"
import type { ReceivedSupplierQuote } from "@/components/buildflow/received-supplier-quote-table"

function sourceMoney(value: unknown) {
  return value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value)) ? formatComparisonMoney(Number(value)) : "—"
}

export function ReceivedProductPriceMatrix({ items, quotes, bids }: { items: QuoteComparisonItemRecord[]; quotes: ReceivedSupplierQuote[]; bids: QuoteComparisonBidRecord[] }) {
  const reviewed=buildProductQuotePreview(items,bids).rows
  return <section className="min-w-0" aria-label="Product price comparison"><h2 className="mb-2 text-lg font-bold">Compare product prices</h2><p className="mb-3 text-xs text-slate-500">Source prices · amber matches need review · lowest is highlighted only for verified matches. Delivery and tax excluded.</p>
    <div className="max-w-full overflow-x-auto rounded-xl border border-slate-200"><table className="w-full text-left text-xs" data-testid="product-price-matrix"><thead className="bg-slate-50"><tr><th className="sticky left-0 z-10 min-w-48 bg-slate-50 p-3">Requested product</th>{quotes.map(quote=><th key={quote.id} className="min-w-48 p-3">{quote.supplierName||quote.fileName}</th>)}</tr></thead><tbody>
      {receivedProductPriceRows(items,quotes).map((row,index)=><tr key={row.item.id} className="border-t border-slate-200 align-top"><th className="sticky left-0 z-10 max-w-72 bg-white p-3 font-normal"><p className="font-bold">{row.item.description}</p><p className="mt-1 text-slate-500">{row.item.specification}</p><p className="mt-1 font-semibold">{row.item.quantity} {row.item.unit}</p></th>{row.cells.map(cell=>{
        const offer=reviewed[index].offers.find(offer=>offer.bid.source_supplier_quote_id===cell.quote.id)
        const lowest=offer?.eligible&&offer.unitPrice===reviewed[index].lowest?.unitPrice
        return <td key={cell.quote.id} className={`p-3 ${lowest?"bg-emerald-50":""}`} data-testid="source-product-price">{offer?.eligible?<><p className="text-base font-bold">{formatComparisonMoney(offer.unitPrice!)} / {row.item.unit}</p><p className="mt-1 text-emerald-800">{lowest?"Lowest verified price":"Verified match"}</p></>:cell.lines.length?<>{cell.lines.length>1?<p className="mb-2 font-semibold text-amber-800">{cell.lines.length} possible lines · choose in review</p>:null}{cell.lines.slice(0,3).map(line=><div key={line.line_number} className="mb-2"><p className="text-base font-bold tabular-nums">{sourceMoney(line.unit_price)} / {line.unit||"unit needs review"}</p><p className="mt-1 text-[10px] text-slate-500">Quoted: {line.quantity} {line.unit} · {sourceMoney(line.line_total)} line total</p><details className="mt-1"><summary className="cursor-pointer text-[10px] text-slate-500">Supplier wording · line {line.line_number}</summary><p className="mt-1 break-words">{line.description} · {line.specification}</p></details></div>)}<p className="text-[10px] font-semibold text-amber-800">Match / selling unit needs review</p></>:<p className="text-slate-500">No matched line · review quote</p>}<a href={`/admin/supplier-quotes/${cell.quote.id}`} className="mt-2 inline-flex min-h-10 items-center font-semibold text-sky-800">Review match</a></td>
      })}</tr>)}
    </tbody></table></div>
  </section>
}
