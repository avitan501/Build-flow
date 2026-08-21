"use client"

import { Clock3, History, LoaderCircle, Plus, Search, Sparkles, X } from "lucide-react"
import { useState, useTransition } from "react"

import { searchManagerDashboardAction } from "@/app/admin/build-map/actions"
import type { DashboardAiHistoryItem } from "@/lib/manager-command-center"

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value))
}

export function ManagerDashboardAiSearch({ initialHistory, enabled }: { initialHistory: DashboardAiHistoryItem[]; enabled: boolean }) {
  const [query, setQuery] = useState("")
  const [answer, setAnswer] = useState("")
  const [history, setHistory] = useState(initialHistory)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()

  function runSearch() {
    setError("")
    startTransition(async () => {
      const result = await searchManagerDashboardAction(query)
      if (!result.ok) { setError(result.error); return }
      setAnswer(result.answer)
      setHistory(result.history)
    })
  }

  return <details className="group mt-3">
    <summary className="inline-flex min-h-9 cursor-pointer list-none items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 shadow-sm hover:border-slate-400">
      <Plus className="h-4 w-4 text-[#0071e3] group-open:hidden" />
      <X className="hidden h-4 w-4 text-slate-500 group-open:block" />
      <Sparkles className="h-3.5 w-3.5" />
      <span id="dashboard-ai-title">Ask AI</span>
    </summary>
    <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <p className="mb-3 text-xs text-slate-500">Search clients, requests, supplier quotes, and goals.</p>
      <div className="mb-3 flex justify-end"><button type="button" onClick={() => setHistoryOpen((open) => !open)} className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 px-3 text-xs font-semibold"><History className="h-4 w-4" />History</button></div>
      <form onSubmit={(event) => { event.preventDefault(); runSearch() }} className="flex gap-2">
        <label className="relative min-w-0 flex-1"><span className="sr-only">Ask Avantia AI</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} maxLength={500} placeholder="Example: Which requests still need supplier pricing?" className="min-h-12 w-full rounded-md border border-slate-300 pl-10 pr-3 text-sm outline-none focus:border-[#0071e3] focus:ring-4 focus:ring-sky-100" /></label>
        <button type="submit" disabled={pending || query.trim().length < 2 || !enabled} className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-md bg-[#0071e3] px-4 text-sm font-semibold text-white disabled:bg-slate-300">{pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : "Ask"}</button>
      </form>
      {!enabled ? <p className="mt-2 text-xs font-semibold text-amber-700">Waiting for the OpenAI key to be added to Vercel and redeployed.</p> : null}
      {error ? <p role="alert" className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p> : null}
      {answer ? <div className="mt-3 rounded-md border border-sky-100 bg-sky-50 p-4"><p className="whitespace-pre-wrap text-sm leading-6 text-slate-800">{answer}</p></div> : null}
      {historyOpen ? <div className="mt-3 border-t border-slate-200 bg-slate-50 p-3 sm:p-4"><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold">Recent searches</h3><button type="button" onClick={() => setHistoryOpen(false)} aria-label="Close history" className="inline-flex h-8 w-8 items-center justify-center"><X className="h-4 w-4" /></button></div>{history.length ? <div className="grid gap-2">{history.map((item) => <button key={item.id} type="button" onClick={() => { setQuery(item.query); setAnswer(item.answer); setHistoryOpen(false) }} className="rounded-md border border-slate-200 bg-white p-3 text-left"><span className="block truncate text-sm font-semibold">{item.query}</span><span className="mt-1 flex items-center gap-1 text-[11px] text-slate-500"><Clock3 className="h-3 w-3" />{formatTime(item.createdAt)}</span></button>)}</div> : <p className="text-sm text-slate-500">No searches yet.</p>}</div> : null}
    </div>
  </details>
}
