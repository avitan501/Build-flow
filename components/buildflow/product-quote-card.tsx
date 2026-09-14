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

function ProductOfferRow({ row, offer, onSelect, choiceDisabled = false }: { row: ProductRow; offer: ProductOffer; onSelect: (bidId: string) => void; choiceDisabled?: boolean }) {
  const lowest = offer.eligible && offer.unitPrice === row.lowest?.unitPrice
  const selected = row.selected?.bid.id === offer.bid.id
  const source = offer.bid.quote_comparison_prices?.find(price => price.item_id === row.item.id)?.notes?.trim() || ""
  return <label className={`flex min-h-16 items-start gap-2.5 px-3 py-3 ${offer.eligible ? "cursor-pointer" : "cursor-not-allowed"} ${selected ? "bg-sky-50" : ""}`}>
    <input type="radio" name={`draft-product-${row.item.id}`} value={offer.bid.id} checked={selected} disabled={!offer.eligible || choiceDisabled} onChange={(event) => {
      const card = event.currentTarget.closest("article")
      onSelect(offer.bid.id)
      // An override moves into the visible summary; keep keyboard focus on it.
      window.requestAnimationFrame(() => {
        if (!card?.isConnected) return
        Array.from(card.querySelectorAll<HTMLInputElement>('input[type="radio"]')).find((input) => input.value === offer.bid.id)?.focus({ preventScroll: true })
      })
    }} aria-label={`Choose ${offer.bid.supplier_name_snapshot} for ${row.item.description} in draft`} className="mt-1 h-5 w-5 shrink-0 accent-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500" />
    <span className="min-w-0 flex-1"><span className="block break-words text-sm font-semibold">{offer.bid.supplier_name_snapshot}</span>
      {source ? <span className="mt-1 block whitespace-pre-wrap break-words text-xs leading-5 text-slate-600" aria-label="Original supplier wording">{source}</span> : <span className="mt-1 block text-xs text-slate-500">Source wording not recorded</span>}
      <span className="mt-1 flex flex-wrap gap-1 text-[10px] font-bold">
        {lowest ? <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-800">Lowest eligible price</span> : null}
        {selected ? <span className="rounded bg-sky-100 px-1.5 py-0.5 text-sky-800">Draft choice</span> : null}
        {offer.status === "review" ? <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-900">Match needs review · excluded</span> : null}
        {offer.blocked ? <span className="rounded bg-rose-100 px-1.5 py-0.5 text-rose-800">Supplier excluded</span> : null}
        {source && offer.matchStatus === "exact" ? <span className="text-slate-600">Source wording matches</span> : null}
      </span>
    </span>
    <span className="max-w-[40%] break-words text-right text-sm font-bold tabular-nums">{offer.status === "unavailable" ? "Unavailable" : offer.status === "unknown" ? "No quote" : offer.unitPrice === null ? "—" : `${formatComparisonMoney(offer.unitPrice)} / ${row.item.unit}`}
      <span className="mt-1 block text-[10px] font-normal text-slate-500">{offer.status === "unknown" ? "Availability unknown" : offer.status === "unavailable" ? "Marked unavailable" : offer.lineTotal === null ? "Quantity needs review" : `${formatComparisonMoney(offer.lineTotal)} product total`}</span>
    </span>
  </label>
}

export function ProductQuoteCard({ row, onSelect, onClear, onReview, choiceDisabled = false }: { row: ProductRow; onSelect: (bidId: string) => void; onClear: () => void; onReview?: () => void; choiceDisabled?: boolean }) {
  const { primary, other, reviewCount } = productQuoteCardSections(row)
  return <article className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white" data-testid="product-quote-card">
    <details name="requested-product-offers" className="group/product">
    <summary className="flex min-h-20 cursor-pointer list-none items-center gap-3 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500 [&::-webkit-details-marker]:hidden"><div className="min-w-0 flex-1">
      <div className="flex items-start justify-between gap-2"><h3 className="min-w-0 break-words text-sm font-bold leading-5">{row.item.description}</h3><span className="max-w-[45%] shrink-0 break-words text-right text-xs font-bold text-[#0066cc]">{row.item.quantity.toLocaleString()} {row.item.unit}</span></div>
      {row.item.specification ? <p className="mt-1 break-words text-xs leading-5 text-slate-600">{row.item.specification}</p> : null}
      {row.selected ? <p className="mt-1 break-words text-xs text-sky-800">Draft · {row.selected.bid.supplier_name_snapshot} · {formatComparisonMoney(row.selected.unitPrice!)} / {row.item.unit}</p> : <p className="mt-1 text-xs text-slate-500">{row.offers.length} quote entries{reviewCount ? ` · ${reviewCount} need review` : ""}</p>}
      {!row.validQuantity ? <p className="mt-1 text-xs font-semibold text-rose-700">Check requested quantity.</p> : !row.lowest ? <p className="mt-1 text-xs font-semibold text-amber-800">No confirmed price yet.</p> : null}
    </div><ChevronDown className="h-4 w-4 shrink-0 text-slate-500 group-open/product:rotate-180" aria-hidden="true"/></summary>
    <fieldset><legend className="sr-only">Draft supplier choice for {row.item.description}</legend>
      <div className="divide-y divide-slate-100 border-t border-slate-100 bg-slate-50/60" data-testid="primary-product-offers">{[...primary,...other].map((offer) => <ProductOfferRow key={offer.bid.id} row={row} offer={offer} onSelect={onSelect} choiceDisabled={choiceDisabled} />)}</div>
      {!row.offers.length ? <p className="px-3 py-4 text-xs text-slate-500">No supplier quotes yet.</p> : null}
    </fieldset>
    {onReview ? <button type="button" onClick={onReview} className="min-h-11 w-full border-t border-slate-100 px-3 text-left text-xs font-semibold text-sky-800">Compare details / review matches</button> : null}
    {row.selected ? <button type="button" onClick={onClear} disabled={choiceDisabled} aria-label={`Clear draft selection for ${row.item.description}`} className="min-h-11 w-full border-t border-slate-100 px-3 text-left text-xs font-semibold text-sky-800 hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500">Clear selection</button> : null}
    </details>
  </article>
}
