"use client"

import { ExternalLink, LoaderCircle, Search, X } from "lucide-react"
import { useEffect, useState } from "react"

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

  useEffect(() => {
    let active = true
    async function search() {
      try {
        const response = await fetch("/api/admin/catalog/exa-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, department, zipCode: "11516" }),
        })
        const payload = await response.json() as { ok?: boolean; error?: string; results?: ExaCatalogSearchResult[]; fallbackLinks?: ProductSearchLink[]; checkedAt?: string }
        if (!active) return
        setLinks(payload.fallbackLinks ?? [])
        setCheckedAt(payload.checkedAt ?? "")
        if (!response.ok || !payload.ok) {
          setNotice(payload.error || "Live price search is unavailable. Use the retailer links below.")
          return
        }
        const sorted = [...(payload.results ?? [])].sort((left, right) => numericPrice(left.priceText) - numericPrice(right.priceText))
        setResults(sorted.slice(0, 5))
        setNotice(sorted.length ? "Compare the exact model, package quantity, and delivery before ordering." : "No exact priced result was found. Use the retailer links below.")
      } catch {
        if (active) setNotice("Live price search is unavailable. Use the retailer links below.")
      } finally {
        if (active) setPending(false)
      }
    }
    void search()
    return () => { active = false }
  }, [department, query])

  const lowestPrice = Math.min(...results.map((result) => numericPrice(result.priceText)))

  return <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50 p-3">
    <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold text-slate-950">Current price check</p><p className="mt-0.5 text-[11px] text-slate-500">ZIP 11516{checkedAt ? ` · checked ${new Date(checkedAt).toLocaleDateString("en-US")}` : ""}</p></div><button type="button" onClick={onClose} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white" aria-label="Close price check"><X className="h-4 w-4" /></button></div>
    {pending ? <p role="status" className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-slate-600"><LoaderCircle className="h-4 w-4 animate-spin" />Searching exact product pages...</p> : null}
    {!pending && notice ? <p className="mt-2 text-xs leading-5 text-slate-600">{notice}</p> : null}
    {results.length ? <div className="mt-3 grid gap-2">{results.map((result) => { const isLowest = Number.isFinite(lowestPrice) && numericPrice(result.priceText) === lowestPrice; return <a key={result.url} href={result.url} target="_blank" rel="noopener noreferrer" className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-slate-200 bg-white p-2.5"><div className="min-w-0"><p className="truncate text-xs font-bold text-slate-950">{result.title}</p><p className="mt-0.5 truncate text-[11px] text-slate-500">{result.domain}</p></div><div className="shrink-0 text-right"><p className="text-xs font-bold text-slate-950">{result.priceText || "Open price"}</p>{isLowest ? <span className="text-[10px] font-bold text-emerald-700">Lowest found</span> : null}</div><ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400" /></a> })}</div> : null}
    {!pending && links.length ? <div className="mt-3 flex flex-wrap gap-2">{links.map((link) => <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700"><Search className="h-3.5 w-3.5" />{link.label}</a>)}</div> : null}
  </div>
}
