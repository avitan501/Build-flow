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
    <section className="mt-2 rounded-md border border-sky-200 bg-sky-50/50 p-2" aria-labelledby="exa-catalog-search-title">
      <h2 id="exa-catalog-search-title" className="sr-only">Ask AI</h2>
      <div className="grid gap-1.5 md:grid-cols-[minmax(14rem,1fr)_6rem_auto]">
        <label className="sr-only" htmlFor="exa-product-query">Product or material</label>
        <input id="exa-product-query" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void search() }} placeholder={`${department} product`} className="h-8 rounded-md border border-slate-200 bg-white px-2.5 text-xs" />
        <label className="sr-only" htmlFor="exa-zip-code">ZIP code</label>
        <input id="exa-zip-code" value={zipCode} onChange={(event) => setZipCode(event.target.value)} inputMode="numeric" placeholder="ZIP" className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs" />
        <button type="button" onClick={() => void search()} disabled={pending || !query.trim()} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-sky-700 px-3 text-xs font-bold text-white disabled:opacity-40">{pending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}Ask AI</button>
      </div>
      {notice ? <p role="status" className="mt-2 text-xs font-semibold text-slate-700">{notice}</p> : null}
      {results.length ? <div className="mt-2 grid gap-1.5 lg:grid-cols-2">{results.map((result) => <article key={result.url} className="flex min-w-0 gap-2 rounded-md border border-slate-200 bg-white p-2"><div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-slate-100">{result.imageUrl ? <Image src={result.imageUrl} alt="" width={40} height={40} unoptimized className="h-full w-full object-cover" /> : null}</div><div className="min-w-0 flex-1"><h3 className="truncate text-xs font-bold">{result.title}</h3><p className="truncate text-[10px] text-slate-500">{result.domain}{result.priceText ? ` · ${result.priceText}` : ""}</p><div className="mt-1 flex gap-1"><button type="button" onClick={() => onUseResult(result)} className="rounded bg-slate-900 px-2 py-1 text-[10px] font-bold text-white">Complete</button><a href={result.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-600">Source <ExternalLink className="h-2.5 w-2.5" /></a></div></div></article>)}</div> : null}
    </section>
  )
}
