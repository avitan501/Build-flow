"use client"

import { ExternalLink, LoaderCircle, MapPin, Phone, Route, Search, ShoppingCart, Sparkles, Store, UsersRound, X } from "lucide-react"
import { useCallback, useMemo, useState } from "react"

import type { ExaCatalogSearchResult, ProductCallResult, ProductSalesContact, ProductSearchLink } from "@/lib/exa-catalog-search"

function numericPrice(value: string | null) {
  if (!value) return Number.POSITIVE_INFINITY
  const price = Number(value.replace(/[^0-9.]/g, ""))
  return Number.isFinite(price) ? price : Number.POSITIVE_INFINITY
}

function uniqueByDomain<T extends { domain: string }>(items: T[]) {
  return [...new Map(items.map((item) => [item.domain, item])).values()]
}

export function MaterialPriceCheck({ requestId, query, department, onClose }: { requestId: string; query: string; department: string; onClose: () => void }) {
  const [itemQuery, setItemQuery] = useState(query)
  const [zipCode, setZipCode] = useState("11516")
  const [buyNow, setBuyNow] = useState<ExaCatalogSearchResult[]>([])
  const [callForPrice, setCallForPrice] = useState<ProductCallResult[]>([])
  const [salesContacts, setSalesContacts] = useState<ProductSalesContact[]>([])
  const [links, setLinks] = useState<ProductSearchLink[]>([])
  const [notice, setNotice] = useState("")
  const [checkedAt, setCheckedAt] = useState("")
  const [pending, setPending] = useState(false)
  const [morePending, setMorePending] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const excludedDomains = useMemo(() => [...new Set([
    ...buyNow.map((result) => result.domain),
    ...callForPrice.map((result) => result.domain),
    ...salesContacts.map((result) => result.domain),
  ])], [buyNow, callForPrice, salesContacts])

  const search = useCallback(async (more = false) => {
    const cleanedQuery = itemQuery.trim()
    const cleanedZip = zipCode.trim()
    if (cleanedQuery.length < 2) { setNotice("Enter an item number or description."); return }
    if (!/^\d{5}(?:-\d{4})?$/.test(cleanedZip)) { setNotice("Enter a valid delivery ZIP code."); return }
    if (more) setMorePending(true)
    else { setPending(true); setHasSearched(true); setNotice("") }
    try {
      const response = await fetch("/api/admin/catalog/exa-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: cleanedQuery, department, zipCode: cleanedZip, excludeDomains: more ? excludedDomains : [] }),
      })
      const payload = await response.json() as {
        ok?: boolean
        error?: string
        results?: ExaCatalogSearchResult[]
        buyNow?: ExaCatalogSearchResult[]
        callForPrice?: ProductCallResult[]
        salesContacts?: ProductSalesContact[]
        fallbackLinks?: ProductSearchLink[]
        checkedAt?: string
      }
      setLinks(payload.fallbackLinks ?? [])
      setCheckedAt(payload.checkedAt ?? "")
      if (!response.ok || !payload.ok) { setNotice(payload.error || "Item research is temporarily unavailable."); return }
      const priced = [...(payload.buyNow ?? payload.results ?? [])].sort((left, right) => numericPrice(left.priceText) - numericPrice(right.priceText))
      setBuyNow((current) => uniqueByDomain(more ? [...current, ...priced] : priced).slice(0, 9))
      setCallForPrice((current) => uniqueByDomain(more ? [...current, ...(payload.callForPrice ?? [])] : payload.callForPrice ?? []).slice(0, 9))
      setSalesContacts((current) => uniqueByDomain(more ? [...current, ...(payload.salesContacts ?? [])] : payload.salesContacts ?? []).slice(0, 9))
      const count = priced.length + (payload.callForPrice?.length ?? 0) + (payload.salesContacts?.length ?? 0)
      setNotice(count ? "Matches are based on the item and delivery ZIP. Confirm specifications, stock, delivery, and final price before ordering." : "No reliable match was found. Adjust the item description or use the manual searches.")
    } catch {
      setNotice("Item research is temporarily unavailable.")
    } finally {
      if (more) setMorePending(false)
      else setPending(false)
    }
  }, [department, excludedDomains, itemQuery, zipCode])

  const totalResults = buyNow.length + callForPrice.length + salesContacts.length

  function openSupplierRouting() {
    const routing = document.getElementById("supplier-routing") as HTMLDetailsElement | null
    if (!routing) {
      window.location.href = `/owner/materials/requests/${requestId}#supplier-routing`
      return
    }
    routing.open = true
    routing.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
    <div className="border-b border-slate-200 bg-slate-50 px-3 py-3 sm:px-4">
      <div className="flex items-start justify-between gap-3"><div><p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[.12em] text-[#0066cc]"><Sparkles className="h-3.5 w-3.5" />Item sourcing</p><h3 className="mt-1 text-sm font-bold text-slate-950">Find this item</h3></div><button type="button" onClick={onClose} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white" aria-label="Close item search"><X className="h-4 w-4" /></button></div>
      <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_7.5rem_auto]">
        <label className="grid gap-1 text-[10px] font-bold uppercase text-slate-500">Item number or description<input value={itemQuery} onChange={(event) => setItemQuery(event.target.value)} placeholder="Model, SKU, size, or material" className="h-10 min-w-0 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium normal-case text-slate-950" /></label>
        <label className="grid gap-1 text-[10px] font-bold uppercase text-slate-500">Delivery ZIP<span className="relative"><MapPin className="pointer-events-none absolute left-2.5 top-3 h-3.5 w-3.5 text-slate-400" /><input value={zipCode} onChange={(event) => setZipCode(event.target.value.replace(/[^0-9-]/g, "").slice(0, 10))} inputMode="numeric" className="h-10 w-full rounded-md border border-slate-300 bg-white pl-8 pr-2 text-sm font-medium normal-case text-slate-950" /></span></label>
        <button type="button" onClick={() => void search(false)} disabled={pending} className="inline-flex h-10 items-center justify-center gap-2 self-end rounded-md bg-[#0071e3] px-4 text-xs font-bold text-white disabled:opacity-50">{pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}{pending ? "Searching..." : "Find item"}</button>
      </div>
    </div>

    {hasSearched ? <div className="p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-slate-600">{notice}</p>{checkedAt ? <span className="text-[10px] font-semibold text-slate-400">Checked {new Date(checkedAt).toLocaleDateString("en-US")}</span> : null}</div>
      {totalResults ? <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <section className="min-w-0" aria-labelledby="buy-now-heading"><div className="mb-2 flex items-center gap-2"><ShoppingCart className="h-4 w-4 text-emerald-600" /><h4 id="buy-now-heading" className="text-xs font-bold">Buy directly</h4><span className="ml-auto text-[10px] font-bold text-slate-400">{buyNow.length}</span></div><div className="grid gap-2">{buyNow.slice(0, 3).map((result, index) => <a key={result.url} href={result.url} target="_blank" rel="noopener noreferrer" className="group rounded-md border border-slate-200 p-2.5 hover:border-emerald-300"><div className="flex items-start gap-2"><span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded bg-emerald-50 text-[10px] font-bold text-emerald-700">{index + 1}</span><div className="min-w-0 flex-1"><p className="line-clamp-2 text-xs font-bold leading-4">{result.title}</p><p className="mt-1 truncate text-[10px] text-slate-500">{result.domain}</p></div><ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400" /></div><div className="mt-2 flex items-center justify-between"><strong className="text-sm text-slate-950">{result.priceText}</strong><span className={`text-[9px] font-bold uppercase ${result.matchConfidence === "exact" ? "text-emerald-700" : "text-amber-700"}`}>{result.matchConfidence === "exact" ? "Exact" : "Verify"}</span></div></a>)}</div>{!buyNow.length ? <p className="rounded-md bg-slate-50 p-3 text-xs text-slate-500">No direct priced page found.</p> : null}</section>

        <section className="min-w-0" aria-labelledby="call-price-heading"><div className="mb-2 flex items-center gap-2"><Store className="h-4 w-4 text-amber-600" /><h4 id="call-price-heading" className="text-xs font-bold">Call for price</h4><span className="ml-auto text-[10px] font-bold text-slate-400">{callForPrice.length}</span></div><div className="grid gap-2">{callForPrice.slice(0, 3).map((result, index) => <div key={result.url} className="rounded-md border border-slate-200 p-2.5"><div className="flex items-start gap-2"><span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded bg-amber-50 text-[10px] font-bold text-amber-700">{index + 1}</span><div className="min-w-0 flex-1"><p className="line-clamp-2 text-xs font-bold leading-4">{result.title}</p><p className="mt-1 truncate text-[10px] text-slate-500">{result.domain}</p></div></div><div className="mt-2 flex gap-1.5">{result.phone ? <a href={`tel:${result.phone}`} className="inline-flex min-h-8 flex-1 items-center justify-center gap-1 rounded-md bg-slate-950 px-2 text-[10px] font-bold text-white"><Phone className="h-3 w-3" />Call</a> : null}<a href={result.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-8 flex-1 items-center justify-center gap-1 rounded-md border border-slate-300 px-2 text-[10px] font-bold"><ExternalLink className="h-3 w-3" />Open</a></div></div>)}</div>{!callForPrice.length ? <p className="rounded-md bg-slate-50 p-3 text-xs text-slate-500">No reliable call option found.</p> : null}</section>

        <section className="min-w-0" aria-labelledby="sales-contact-heading"><div className="mb-2 flex items-center gap-2"><UsersRound className="h-4 w-4 text-violet-600" /><h4 id="sales-contact-heading" className="text-xs font-bold">Sales contacts</h4><span className="ml-auto text-[10px] font-bold text-slate-400">{salesContacts.length}</span></div><div className="grid gap-2">{salesContacts.slice(0, 3).map((contact, index) => <div key={`${contact.domain}-${index}`} className="rounded-md border border-slate-200 p-2.5"><div className="flex items-start gap-2"><span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded bg-violet-50 text-[10px] font-bold text-violet-700">{index + 1}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{contact.contactName || contact.company}</p><p className="truncate text-[10px] text-slate-500">{contact.contactName ? `${contact.role} · ${contact.company}` : contact.role}</p></div></div><div className="mt-2 flex flex-wrap gap-1.5">{contact.phone ? <a href={`tel:${contact.phone}`} className="inline-flex min-h-8 items-center gap-1 rounded-md border border-slate-300 px-2 text-[10px] font-bold"><Phone className="h-3 w-3" />Call</a> : null}{contact.email ? <a href={`mailto:${contact.email}`} className="inline-flex min-h-8 items-center rounded-md border border-slate-300 px-2 text-[10px] font-bold">Email</a> : null}<a href={contact.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-8 items-center gap-1 rounded-md border border-slate-300 px-2 text-[10px] font-bold"><ExternalLink className="h-3 w-3" />Official page</a></div></div>)}</div>{!salesContacts.length ? <p className="rounded-md bg-slate-50 p-3 text-xs text-slate-500">No public sales contact found.</p> : null}</section>
      </div> : null}

      <div className="mt-4 flex flex-wrap gap-2">{totalResults ? <button type="button" onClick={() => void search(true)} disabled={morePending} className="inline-flex min-h-9 items-center gap-2 rounded-md border border-[#0071e3] bg-white px-3 text-xs font-bold text-[#0066cc] disabled:opacity-50">{morePending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}{morePending ? "Searching more..." : "Check more suppliers"}</button> : null}<button type="button" onClick={openSupplierRouting} className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-slate-950 px-3 text-xs font-bold text-white"><Route className="h-3.5 w-3.5" />Add suppliers</button>{!totalResults && links.map((link) => <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700"><Search className="h-3.5 w-3.5" />{link.label}</a>)}</div>
    </div> : <div className="flex items-center gap-2 px-3 py-3 text-xs text-slate-500 sm:px-4"><Search className="h-3.5 w-3.5" />Change the item or ZIP, then select Find item.</div>}
  </div>
}
