"use client"

import { ArrowRight, Command, LoaderCircle, Search, X } from "lucide-react"
import Link from "next/link"
import { createPortal } from "react-dom"
import { useEffect, useMemo, useRef, useState } from "react"

import { managerPageSearchResults, type ManagerSearchAccess, type ManagerSearchResult } from "@/lib/manager-global-search"

export function ManagerGlobalSearch({ access, mobile = false }: { access: ManagerSearchAccess; mobile?: boolean }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [records, setRecords] = useState<ManagerSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const pages = useMemo(() => managerPageSearchResults(query, access), [access, query])

  useEffect(() => {
    if (!open) return
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus())
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { window.cancelAnimationFrame(frame); document.body.style.overflow = previousOverflow }
  }, [open])

  useEffect(() => {
    if (mobile) return
    function openFromKeyboard(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === "k" && window.matchMedia("(min-width: 1024px)").matches) {
        event.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener("keydown", openFromKeyboard)
    return () => window.removeEventListener("keydown", openFromKeyboard)
  }, [mobile])

  useEffect(() => {
    if (!open || query.trim().length < 2) return
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/admin/global-search?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal, cache: "no-store" })
        const payload = response.ok ? await response.json() as { results?: ManagerSearchResult[] } : {}
        setRecords(Array.isArray(payload.results) ? payload.results : [])
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setRecords([])
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 220)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [open, query])

  function close() {
    setOpen(false)
    setQuery("")
    setRecords([])
  }

  const results = [...pages, ...records]

  const dialog = open ? <div className="fixed inset-0 z-[120] bg-slate-950/45 px-3 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-sm sm:px-6 sm:pt-[8vh]" role="dialog" aria-modal="true" aria-label="Search Avantia management" onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}>
    <div className="mx-auto max-h-[84vh] max-w-2xl overflow-hidden rounded-xl border border-white/20 bg-white shadow-2xl">
      <div className="flex items-center gap-3 border-b border-slate-200 px-4">
        {loading ? <LoaderCircle className="h-5 w-5 shrink-0 animate-spin text-[#0071e3]" /> : <Search className="h-5 w-5 shrink-0 text-slate-400" />}
        <input ref={inputRef} value={query} onChange={(event) => { const next = event.target.value; setQuery(next); setRecords([]); if (next.trim().length < 2) setLoading(false) }} onKeyDown={(event) => { if (event.key === "Escape") close() }} placeholder="Client, request, supplier, quote, or page…" className="min-h-14 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-slate-400" />
        <button type="button" onClick={close} aria-label="Close search" className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
      </div>
      <div className="max-h-[calc(84vh-3.6rem)] overflow-y-auto p-2">
        {!query.trim() ? <p className="px-3 pb-2 pt-1 text-[11px] font-bold uppercase tracking-[.12em] text-slate-400">Quick access</p> : null}
        {results.length ? <div>{results.map((item) => <Link key={item.id} href={item.href} onClick={close} className="group flex min-h-14 items-center gap-3 rounded-lg px-3 py-2 outline-none hover:bg-sky-50 focus-visible:bg-sky-50">
          <span className="inline-flex min-w-16 justify-center rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600 group-hover:bg-white group-hover:text-[#0066cc]">{item.category}</span>
          <span className="min-w-0 flex-1"><strong className="block truncate text-sm">{item.title}</strong><span className="mt-0.5 block truncate text-xs text-slate-500">{item.description}</span></span>
          <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:translate-x-0.5 group-hover:text-[#0066cc]" />
        </Link>)}</div> : query.trim().length >= 2 && !loading ? <p className="px-4 py-10 text-center text-sm text-slate-500">No matching client, request, quote, or page.</p> : query.trim() ? <p className="px-4 py-8 text-center text-sm text-slate-500">Type at least two characters.</p> : null}
      </div>
    </div>
  </div> : null

  return <>
    <button type="button" onClick={() => setOpen(true)} aria-label="Search clients and manager tools" className={mobile ? "flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-left text-xs text-slate-500" : "mx-auto flex min-h-10 w-full max-w-xl items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-left text-sm text-slate-500 shadow-sm transition hover:border-sky-300 hover:shadow"}>
      <Search className="h-4 w-4 shrink-0" /><span className="min-w-0 flex-1 truncate">Search clients or anything…</span>{mobile ? null : <span className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold"><Command className="h-3 w-3" />K</span>}
    </button>

    {dialog && typeof document !== "undefined" ? createPortal(dialog, document.body) : null}
  </>
}
