"use client"

import { CalendarDays, CheckCircle2, Clock3, Save } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { saveDailyWorkSummaryAction } from "@/app/admin/daily-summary/actions"
import type { DailyWorkSummary } from "@/lib/daily-work-summary"

function localToday() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function displayDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value}T12:00:00`))
}

export function DailyWorkSummaryForm({ summaries }: { summaries: DailyWorkSummary[] }) {
  const router = useRouter()
  const today = localToday()
  const initialSummary = summaries.find((summary) => summary.date === today)
  const [selectedDate, setSelectedDate] = useState(today)
  const selectedSummary = summaries.find((summary) => summary.date === selectedDate)
  const [completed, setCompleted] = useState(initialSummary?.completed ?? "")
  const [open, setOpen] = useState(initialSummary?.open ?? "")
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function selectDate(date: string) {
    const summary = summaries.find((entry) => entry.date === date)
    setSelectedDate(date)
    setCompleted(summary?.completed ?? "")
    setOpen(summary?.open ?? "")
    setMessage(null)
    setError(null)
  }

  function save() {
    setError(null)
    setMessage(null)
    startTransition(async () => {
      const result = await saveDailyWorkSummaryAction({ date: selectedDate, completed, open })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setMessage("Daily summary saved.")
      router.refresh()
    })
  }

  return <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center gap-3 border-b border-slate-200 p-4 sm:p-5">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-sky-50 text-[#0066cc]"><CalendarDays className="h-5 w-5" /></span>
        <div className="min-w-0"><h2 className="text-lg font-semibold">Carlos&apos;s daily update</h2><p className="mt-0.5 text-xs text-slate-500">Record today&apos;s progress and anything still open.</p></div>
      </header>

      <div className="grid gap-4 p-4 sm:p-5">
        <label className="grid max-w-xs gap-1.5 text-sm font-semibold">Work date<input type="date" value={selectedDate} onChange={(event) => selectDate(event.target.value)} className="min-h-11 rounded-md border border-slate-300 bg-white px-3 font-normal" /></label>
        <label className="grid gap-1.5 text-sm font-semibold"><span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" />Completed today</span><textarea value={completed} onChange={(event) => setCompleted(event.target.value)} maxLength={4000} rows={5} placeholder="Calls made, leads contacted, supplier pricing received, orders handled..." className="min-h-28 rounded-md border border-slate-300 p-3 font-normal leading-6 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" /></label>
        <label className="grid gap-1.5 text-sm font-semibold"><span className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-amber-600" />Still open</span><textarea value={open} onChange={(event) => setOpen(event.target.value)} maxLength={4000} rows={4} placeholder="Follow-ups, unanswered calls, pricing still needed, and tomorrow's first steps..." className="min-h-24 rounded-md border border-slate-300 p-3 font-normal leading-6 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" /></label>
        {error ? <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p> : null}
        {message ? <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{message}</p> : null}
        <button type="button" onClick={save} disabled={pending || (!completed.trim() && !open.trim())} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[#0071e3] px-5 text-sm font-semibold text-white disabled:opacity-40 sm:w-auto sm:justify-self-start"><Save className="h-4 w-4" />{pending ? "Saving..." : selectedSummary ? "Update daily summary" : "Save daily summary"}</button>
      </div>
    </section>

    <aside className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 p-4"><h2 className="text-sm font-semibold">Recent summaries</h2><p className="mt-1 text-xs text-slate-500">Choose a date to review or update it.</p></header>
      <div className="max-h-[34rem] overflow-y-auto">
        {summaries.length ? summaries.map((summary) => <button key={summary.id} type="button" onClick={() => selectDate(summary.date)} className={`flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50 ${selectedDate === summary.date ? "bg-sky-50" : ""}`}><span><span className="block text-sm font-semibold">{displayDate(summary.date)}</span><span className="mt-0.5 block text-xs text-slate-500">{summary.completed ? "Work recorded" : "Open items only"}</span></span><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${summary.open ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{summary.open ? "Open" : "Complete"}</span></button>) : <p className="p-4 text-sm leading-6 text-slate-500">No daily summaries yet. Carlos can save today&apos;s first update.</p>}
      </div>
    </aside>
  </div>
}
