"use client"

import { ExternalLink, LoaderCircle, Search } from "lucide-react"
import Image from "next/image"
import { useState } from "react"

import type { ExaCatalogSearchResult } from "@/lib/exa-catalog-search"

export function ExaCatalogResearch({ department, onUseResult }: {
  department: string
  onUseResult: (result: ExaCatalogSearchResult) => void
}) {
  const [query, setQuery] = useState("")
  const [zipCode, setZipCode] = useState("11516")
  const [results, setResults] = useState<ExaCatalogSearchResult[]>([])
  const [notice, setNotice] = useState("")
  const [pending, setPending] = useState(false)

  async function search() {
    setNotice("")
    setResults([])
    setPending(true)
    try {
      const response = await fetch("/api/admin/catalog/exa-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, zipCode, department }),
      })
      const payload = await response.json() as { ok?: boolean; error?: string; results?: ExaCatalogSearchResult[] }
      if (!response.ok || !payload.ok) {
        setNotice(payload.error || "The product search could not be completed.")
        return
      }
      setResults(payload.results ?? [])
      setNotice(payload.results?.length ? `${payload.results.length} results found. Review each source before saving.` : "No exact product pages were found.")
    } catch {
      setNotice("The product search could not be completed. Try again.")
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="mt-3 border border-sky-200 bg-sky-50/60 px-3 py-3 sm:rounded-lg sm:border" aria-labelledby="exa-catalog-search-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#0066cc]">AI catalog research</p><h2 id="exa-catalog-search-title" className="mt-0.5 text-base font-bold">Find exact products with Exa</h2><p className="mt-0.5 text-xs text-slate-600">Searches the web for {department} materials. Nothing is saved until you approve it.</p></div>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-[minmax(14rem,1fr)_8rem_auto]">
        <label className="sr-only" htmlFor="exa-product-query">Product or material</label>
        <input id="exa-product-query" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void search() }} placeholder="Example: 1/2 in. 4x8 drywall" className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm" />
        <label className="sr-only" htmlFor="exa-zip-code">ZIP code</label>
        <input id="exa-zip-code" value={zipCode} onChange={(event) => setZipCode(event.target.value)} inputMode="numeric" placeholder="ZIP" className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm" />
        <button type="button" onClick={() => void search()} disabled={pending || !query.trim()} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#0071e3] px-4 text-sm font-bold text-white disabled:opacity-40">{pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}Search</button>
      </div>
      {notice ? <p role="status" className="mt-2 text-xs font-semibold text-slate-700">{notice}</p> : null}
      {results.length ? <div className="mt-3 grid gap-2 lg:grid-cols-2">{results.map((result) => <article key={result.url} className="flex min-w-0 gap-3 rounded-lg border border-slate-200 bg-white p-3"><div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-slate-100">{result.imageUrl ? <Image src={result.imageUrl} alt="" width={56} height={56} unoptimized className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-[10px] font-bold text-slate-400">No photo</div>}</div><div className="min-w-0 flex-1"><h3 className="truncate text-sm font-bold">{result.title}</h3><p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">{result.domain}{result.priceText ? ` · ${result.priceText}` : " · Price not confirmed"}</p>{result.snippet ? <p className="mt-1 line-clamp-2 text-xs leading-4 text-slate-600">{result.snippet}</p> : null}<div className="mt-2 flex flex-wrap gap-2"><button type="button" onClick={() => onUseResult(result)} className="rounded-md bg-slate-950 px-2.5 py-1.5 text-[11px] font-bold text-white">Prepare catalog item</button><a href={result.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-[11px] font-bold text-slate-700">Open source <ExternalLink className="h-3 w-3" /></a></div></div></article>)}</div> : null}
    </section>
  )
}
