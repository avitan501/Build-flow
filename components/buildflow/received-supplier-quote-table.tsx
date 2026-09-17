export type ReceivedSupplierQuoteLine = { line_number: number; description: string; specification: string | null; quantity: number; unit: string; unit_price: number; line_total: number; comparison_item_id?:string|null; calculatedRate?:number; requestedFeet?:number; originalFeet?:number }
export type ReceivedSupplierQuote = { id: string; supplierName?: string; fileName: string; sourceUrl?: string | null; sourceItems?: ReceivedSupplierQuoteLine[]; inComparison?: boolean }
const money = (value: number) => Number.isFinite(Number(value)) ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value)) : "—"

export function ReceivedSupplierQuoteTable({ quotes }: { quotes: ReceivedSupplierQuote[] }) {
  if (!quotes.length) return null
  return <section className="mb-3 min-w-0 rounded-xl border border-slate-200 bg-white p-3">
    <h2 className="mb-2 text-sm font-bold text-[#12263f]">Received quotes · {quotes.length}</h2>
    <p className="mb-3 text-xs text-slate-500">Review source lines before comparing products. Unreviewed prices are not verified matches.</p>
    <div className="max-w-full overflow-x-auto"><table aria-label="Received supplier quotes" className="w-full text-left text-xs">
      <thead><tr className="border-b border-slate-200 text-slate-500"><th className="p-2">Supplier</th><th className="p-2">Source lines</th><th className="p-2">Status</th><th className="p-2">Review</th></tr></thead>
      <tbody>{quotes.map(quote => <tr key={quote.id} className="border-b border-slate-100 last:border-0">
        <td className="max-w-56 p-2"><p className="font-bold">{quote.supplierName || quote.fileName}</p><p className="break-words text-[10px] text-slate-500">{quote.fileName}</p>{quote.sourceUrl ? <a href={quote.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center font-semibold text-[#0066cc]">Original</a> : null}</td>
        <td className="p-2">{quote.sourceItems?.length ?? 0}</td><td className="p-2 font-semibold text-amber-800">{quote.inComparison ? "In comparison" : "Needs review"}</td><td className="p-2"><a href={`/admin/supplier-quotes/${quote.id}`} className="inline-flex min-h-10 items-center rounded-lg border border-sky-200 px-3 font-bold text-[#0066cc]">Review quote</a></td>
      </tr>)}</tbody>
    </table></div>
    {quotes.map(quote => <details key={quote.id} className="mt-2 border-t border-slate-100"><summary className="min-h-11 cursor-pointer py-3 text-xs font-semibold">{quote.supplierName || quote.fileName} · source prices</summary><div className="max-w-full overflow-x-auto"><table className="w-full text-left text-xs" aria-label={`${quote.supplierName || quote.fileName} source prices`}><thead><tr><th className="p-2">Supplier description</th><th className="p-2">Qty / unit</th><th className="p-2">Unit price</th><th className="p-2">Line total</th></tr></thead><tbody>{[...(quote.sourceItems ?? [])].sort((a,b)=>a.line_number-b.line_number).map(line => <tr key={line.line_number} className="border-t border-slate-100"><td className="min-w-40 p-2">{line.description}<p className="text-[10px] text-slate-500">{line.specification}</p></td><td className="whitespace-nowrap p-2">{line.quantity} {line.unit}</td><td className="whitespace-nowrap p-2">{money(line.unit_price)}</td><td className="whitespace-nowrap p-2">{money(line.line_total)}</td></tr>)}</tbody></table></div></details>)}
  </section>
}
