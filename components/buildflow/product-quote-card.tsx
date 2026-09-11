import { ChevronDown } from "lucide-react"
import { formatComparisonMoney } from "@/lib/quote-comparison"
import type { buildProductQuotePreview } from "@/lib/product-quote-preview"

type ProductRow = ReturnType<typeof buildProductQuotePreview>["rows"][number]
type ProductOffer = ProductRow["offers"][number]

/** Presentation only: the existing comparison helper owns price eligibility. */
export function productQuoteCardSections(row: ProductRow) {
  const primaryIds = new Set([row.lowest?.bid.id, row.selected?.bid.id].filter(Boolean))
  const primary = row.offers.filter((offer) => primaryIds.has(offer.bid.id))
    .sort((left, right) => Number(right.bid.id === row.lowest?.bid.id) - Number(left.bid.id === row.lowest?.bid.id))
  const other = row.offers.filter((offer) => !primaryIds.has(offer.bid.id))
    .sort((left, right) => Number(right.eligible) - Number(left.eligible) || (left.unitPrice ?? Infinity) - (right.unitPrice ?? Infinity))
  return { primary, other, reviewCount: row.offers.filter((offer) => offer.status === "review").length }
}

function ProductOfferRow({ row, offer, onSelect }: { row: ProductRow; offer: ProductOffer; onSelect: (bidId: string) => void }) {
  const lowest = offer.eligible && offer.unitPrice === row.lowest?.unitPrice
  const selected = row.selected?.bid.id === offer.bid.id
  return <label className={`flex min-h-16 items-start gap-2.5 px-3 py-3 ${offer.eligible ? "cursor-pointer" : "cursor-not-allowed"} ${selected ? "bg-sky-50" : ""}`}>
    <input type="radio" name={`draft-product-${row.item.id}`} value={offer.bid.id} checked={selected} disabled={!offer.eligible} onChange={(event) => {
      const card = event.currentTarget.closest("article")
      onSelect(offer.bid.id)
      // An override moves into the visible summary; keep keyboard focus on it.
      window.requestAnimationFrame(() => {
        if (!card?.isConnected) return
        Array.from(card.querySelectorAll<HTMLInputElement>('input[type="radio"]')).find((input) => input.value === offer.bid.id)?.focus({ preventScroll: true })
      })
    }} aria-label={`Choose ${offer.bid.supplier_name_snapshot} for ${row.item.description} in draft`} className="mt-1 h-5 w-5 shrink-0 accent-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500" />
    <span className="min-w-0 flex-1"><span className="block break-words text-sm font-semibold">{offer.bid.supplier_name_snapshot}</span>
      <span className="mt-1 flex flex-wrap gap-1 text-[10px] font-bold">
        {lowest ? <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-800">Lowest</span> : null}
        {selected ? <span className="rounded bg-sky-100 px-1.5 py-0.5 text-sky-800">Selected</span> : null}
        {offer.status === "review" ? <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-900">Match needs review · excluded</span> : null}
        {offer.blocked ? <span className="rounded bg-rose-100 px-1.5 py-0.5 text-rose-800">Supplier excluded</span> : null}
      </span>
      {offer.unitPrice !== null && offer.status !== "unavailable" ? <span className="mt-1 block text-xs text-slate-500">{formatComparisonMoney(offer.unitPrice)} / {row.item.unit}</span> : null}
    </span>
    <span className="max-w-[40%] break-words text-right text-sm font-bold tabular-nums">{offer.status === "unavailable" ? "Unavailable" : offer.status === "unknown" ? "No quote" : offer.lineTotal === null ? "—" : formatComparisonMoney(offer.lineTotal)}
      <span className="mt-1 block text-[10px] font-normal text-slate-500">{offer.status === "unknown" ? "Availability unknown" : offer.status === "unavailable" ? "Marked unavailable" : "Product total"}</span>
    </span>
  </label>
}

export function ProductQuoteCard({ row, onSelect, onClear }: { row: ProductRow; onSelect: (bidId: string) => void; onClear: () => void }) {
  const { primary, other, reviewCount } = productQuoteCardSections(row)
  return <article className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white" data-testid="product-quote-card">
    <header className="border-b border-slate-200 bg-slate-50 px-3 py-3">
      <div className="flex items-start justify-between gap-2"><h3 className="min-w-0 break-words text-sm font-bold leading-5">{row.item.description}</h3><span className="max-w-[45%] break-words text-right text-xs font-bold text-[#0066cc]">{row.item.quantity.toLocaleString()} {row.item.unit}</span></div>
      {row.item.specification ? <p className="mt-1 break-words text-xs leading-5 text-slate-600">{row.item.specification}</p> : null}
      {!row.validQuantity ? <p className="mt-1 text-xs font-semibold text-rose-700">Check requested quantity.</p> : !row.lowest ? <p className="mt-1 text-xs font-semibold text-amber-800">No confirmed price yet.</p> : null}
    </header>
    <fieldset><legend className="sr-only">Draft supplier choice for {row.item.description}</legend>
      <div className="divide-y divide-slate-100" data-testid="primary-product-offers">{primary.map((offer) => <ProductOfferRow key={offer.bid.id} row={row} offer={offer} onSelect={onSelect} />)}</div>
      {other.length ? <details className="group/offers border-t border-slate-100" data-testid="other-product-offers">
        <summary className="flex min-h-11 cursor-pointer flex-wrap items-center justify-between gap-1 px-3 py-2 text-xs font-semibold text-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500"><span>{primary.length ? "Other quotes" : "Supplier responses"} ({other.length})</span><span className="inline-flex items-center gap-2">{reviewCount ? <span className="text-amber-800">{reviewCount} need review</span> : null}<ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 group-open/offers:rotate-180" /></span></summary>
        <div className="divide-y divide-slate-100 border-t border-slate-100">{other.map((offer) => <ProductOfferRow key={offer.bid.id} row={row} offer={offer} onSelect={onSelect} />)}</div>
      </details> : null}
      {!row.offers.length ? <p className="px-3 py-4 text-xs text-slate-500">No supplier quotes yet.</p> : null}
    </fieldset>
    {row.selected ? <button type="button" onClick={onClear} aria-label={`Clear draft selection for ${row.item.description}`} className="min-h-11 w-full border-t border-slate-100 px-3 text-left text-xs font-semibold text-sky-800 hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500">Clear selection</button> : null}
  </article>
}
