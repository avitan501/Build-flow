"use client"

import { ExternalLink, LoaderCircle, Search, Sparkles, X } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

import type { ExaCatalogSearchResult, ProductSearchLink } from "@/lib/exa-catalog-search"

function numericPrice(value: string | null) {
  if (!value) return Number.POSITIVE_INFINITY
  const price = Number(value.replace(/[^0-9.]/g, ""))
  return Number.isFinite(price) ? price : Number.POSITIVE_INFINITY
}

export function MaterialPriceCheck({ query, department, onClose }: { query: string; department: string; onClose: () => void }) {
  const [results, setResults] = useState<ExaCatalogSearchResult[]>([])
  const [links, setLinks] = useState<ProductSearchLink[]>([])
  const [notice, setNotice] = useState("")
  const [checkedAt, setCheckedAt] = useState("")
  const [pending, setPending] = useState(true)
  const [morePending, setMorePending] = useState(false)

  const search = useCallback(async (more = false, signal?: AbortSignal) => {
      if (more) setMorePending(true)
      else setPending(true)
      try {
        const response = await fetch("/api/admin/catalog/exa-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, department, zipCode: "11516", excludeDomains: more ? [...new Set(results.map((result) => result.domain))] : [] }),
          signal,
        })
        const payload = await response.json() as { ok?: boolean; error?: string; results?: ExaCatalogSearchResult[]; fallbackLinks?: ProductSearchLink[]; checkedAt?: string }
        if (!more) setLinks(payload.fallbackLinks ?? [])
        setCheckedAt(payload.checkedAt ?? "")
        if (!response.ok || !payload.ok) {
          setNotice(payload.error || "AI price research is temporarily unavailable.")
          return
        }
        const sorted = [...(payload.results ?? [])].sort((left, right) => numericPrice(left.priceText) - numericPrice(right.priceText))
        setResults((current) => {
          const combined = more ? [...current, ...sorted] : sorted
          return [...new Map(combined.map((result) => [result.url, result])).values()].sort((left, right) => numericPrice(left.priceText) - numericPrice(right.priceText)).slice(0, 15)
        })
        setNotice(sorted.length ? "Direct priced product pages found. Confirm model, size, package quantity, stock, and delivery before ordering." : more ? "No additional priced suppliers were found." : "No exact priced product page was found. Try the manual searches below.")
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setNotice("AI price research is temporarily unavailable.")
      } finally {
        if (more) setMorePending(false)
        else setPending(false)
      }
  }, [department, query, results])

  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => void search(false, controller.signal), 0)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
    // A new query starts a new research session; accumulated result domains are intentionally excluded here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [department, query])

  const lowestPrice = Math.min(...results.map((result) => numericPrice(result.priceText)))

  return <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50 p-3">
    <div className="flex items-start justify-between gap-3"><div><p className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-950"><Sparkles className="h-3.5 w-3.5 text-[#0066cc]" />AI price research</p><p className="mt-0.5 text-[11px] text-slate-500">Exact product pages · ZIP 11516{checkedAt ? ` · checked ${new Date(checkedAt).toLocaleDateString("en-US")}` : ""}</p></div><button type="button" onClick={onClose} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white" aria-label="Close price check"><X className="h-4 w-4" /></button></div>
    {pending ? <p role="status" className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-slate-600"><LoaderCircle className="h-4 w-4 animate-spin" />Searching multiple suppliers for exact priced pages...</p> : null}
    {!pending && notice ? <p className="mt-2 text-xs leading-5 text-slate-600">{notice}</p> : null}
    {results.length ? <div className="mt-3 grid gap-2">{results.map((result) => { const isLowest = Number.isFinite(lowestPrice) && numericPrice(result.priceText) === lowestPrice; return <a key={result.url} href={result.url} target="_blank" rel="noopener noreferrer" className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-slate-200 bg-white p-2.5"><div className="min-w-0"><div className="flex items-center gap-2"><p className="truncate text-xs font-bold text-slate-950">{result.title}</p><span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${result.matchConfidence === "exact" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{result.matchConfidence === "exact" ? "Exact match" : "Verify match"}</span></div><p className="mt-0.5 truncate text-[11px] text-slate-500">{result.domain} · direct product page</p></div><div className="shrink-0 text-right"><p className="text-sm font-bold text-slate-950">{result.priceText}</p>{isLowest ? <span className="text-[10px] font-bold text-emerald-700">Lowest found</span> : null}</div><ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400" /></a> })}<button type="button" onClick={() => void search(true)} disabled={morePending} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[#0071e3] bg-white px-3 text-xs font-bold text-[#0066cc] disabled:opacity-50">{morePending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}{morePending ? "Searching more suppliers..." : "Find more sources"}</button></div> : null}
    {!pending && !results.length && links.length ? <div className="mt-3"><p className="mb-2 text-[10px] font-bold uppercase tracking-[.12em] text-slate-500">Manual search</p><div className="flex flex-wrap gap-2">{links.map((link) => <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700"><Search className="h-3.5 w-3.5" />{link.label}</a>)}</div></div> : null}
  </div>
}
