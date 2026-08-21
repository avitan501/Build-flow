"use client"

import { AlertTriangle, CalendarDays, CheckCircle2, Clock3, FileImage, LoaderCircle, LogIn, LogOut, Save, Upload } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { recordDailyAttendanceAction, saveDailyWorkSummaryAction, uploadDailyProblemPhotoAction } from "@/app/admin/daily-summary/actions"
import { calculateWorkedMinutes, type DailyWorkSummary } from "@/lib/daily-work-summary"

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

function displayTime(value: string | null | undefined) {
  if (!value) return "Not recorded"
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(value))
}

function workedTime(checkInAt: string | null | undefined, checkOutAt: string | null | undefined) {
  const minutes = calculateWorkedMinutes(checkInAt, checkOutAt)
  if (minutes === null) return null
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours} hr ${remainingMinutes} min`
}

export function DailyWorkSummaryForm({ summaries }: { summaries: DailyWorkSummary[] }) {
  const router = useRouter()
  const today = localToday()
  const initialSummary = summaries.find((summary) => summary.date === today)
  const [selectedDate, setSelectedDate] = useState(today)
  const selectedSummary = summaries.find((summary) => summary.date === selectedDate)
  const [completed, setCompleted] = useState(initialSummary?.completed ?? "")
  const [open, setOpen] = useState(initialSummary?.open ?? "")
  const [problems, setProblems] = useState(initialSummary?.problems ?? "")
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function selectDate(date: string) {
    const summary = summaries.find((entry) => entry.date === date)
    setSelectedDate(date)
    setCompleted(summary?.completed ?? "")
    setOpen(summary?.open ?? "")
    setProblems(summary?.problems ?? "")
    setMessage(null)
    setError(null)
  }

  function save() {
    setError(null)
    setMessage(null)
    startTransition(async () => {
      const result = await saveDailyWorkSummaryAction({ date: selectedDate, completed, open, problems })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setMessage("Daily summary saved.")
      router.refresh()
    })
  }

  function uploadProblemPhoto(file: File | undefined) {
    if (!file) return
    setError(null)
    setMessage(null)
    const formData = new FormData()
    formData.set("date", selectedDate)
    formData.set("photo", file)
    startTransition(async () => {
      const result = await uploadDailyProblemPhotoAction(formData)
      if (!result.ok) { setError(result.error); return }
      setMessage("Problem image attached.")
      router.refresh()
    })
  }

  function recordAttendance(action: "check_in" | "check_out") {
    setError(null)
    setMessage(null)
    startTransition(async () => {
      const result = await recordDailyAttendanceAction({ date: selectedDate, action })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setMessage(action === "check_in" ? "Carlos checked in." : "Carlos checked out. Hours worked are calculated below.")
      router.refresh()
    })
  }

  const totalWorked = workedTime(selectedSummary?.checkInAt, selectedSummary?.checkOutAt)

  return <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center gap-3 border-b border-slate-200 p-4 sm:p-5">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-sky-50 text-[#0066cc]"><CalendarDays className="h-5 w-5" /></span>
        <div className="min-w-0"><h2 className="text-lg font-semibold">Carlos&apos;s daily update</h2><p className="mt-0.5 text-xs text-slate-500">Record today&apos;s progress and anything still open.</p></div>
      </header>

      <div className="grid gap-4 p-4 sm:p-5">
        <label className="grid max-w-xs gap-1.5 text-sm font-semibold">Work date<input type="date" value={selectedDate} onChange={(event) => selectDate(event.target.value)} className="min-h-11 rounded-md border border-slate-300 bg-white px-3 font-normal" /></label>
        <section className="rounded-md border border-slate-200 bg-slate-50 p-3" aria-label="Carlos attendance">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div><p className="text-[10px] font-bold uppercase text-slate-500">Check in</p><p className="mt-1 text-sm font-semibold">{displayTime(selectedSummary?.checkInAt)}</p></div>
            <div><p className="text-[10px] font-bold uppercase text-slate-500">Check out</p><p className="mt-1 text-sm font-semibold">{displayTime(selectedSummary?.checkOutAt)}</p></div>
            <div><p className="text-[10px] font-bold uppercase text-slate-500">Hours</p><p className="mt-1 text-sm font-semibold text-[#0066cc]">{totalWorked ?? (selectedSummary?.checkInAt ? "In progress" : "—")}</p></div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => recordAttendance("check_in")} disabled={pending || Boolean(selectedSummary?.checkInAt)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-emerald-300 bg-white px-3 text-sm font-semibold text-emerald-700 disabled:opacity-40"><LogIn className="h-4 w-4" />Check in</button>
            <button type="button" onClick={() => recordAttendance("check_out")} disabled={pending || !selectedSummary?.checkInAt || Boolean(selectedSummary?.checkOutAt)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-amber-300 bg-white px-3 text-sm font-semibold text-amber-700 disabled:opacity-40"><LogOut className="h-4 w-4" />Check out</button>
          </div>
        </section>
        <label className="grid gap-1.5 text-sm font-semibold"><span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" />Completed today</span><textarea value={completed} onChange={(event) => setCompleted(event.target.value)} maxLength={4000} rows={5} placeholder="Calls made, leads contacted, supplier pricing received, orders handled..." className="min-h-28 rounded-md border border-slate-300 p-3 font-normal leading-6 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" /></label>
        <label className="grid gap-1.5 text-sm font-semibold"><span className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-amber-600" />Still open</span><textarea value={open} onChange={(event) => setOpen(event.target.value)} maxLength={4000} rows={4} placeholder="Follow-ups, unanswered calls, pricing still needed, and tomorrow's first steps..." className="min-h-24 rounded-md border border-slate-300 p-3 font-normal leading-6 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" /></label>
        <section className="rounded-md border border-rose-200 bg-rose-50/60 p-3">
          <label className="grid gap-1.5 text-sm font-semibold"><span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-rose-600" />Website problem</span><textarea value={problems} onChange={(event) => setProblems(event.target.value)} maxLength={4000} rows={3} placeholder="What happened, which page, and what were you trying to do?" className="min-h-20 rounded-md border border-rose-200 bg-white p-3 font-normal leading-6 outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100" /></label>
          <div className="mt-3 flex flex-wrap items-center gap-2"><label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-rose-300 bg-white px-3 text-xs font-semibold text-rose-700"><Upload className="h-4 w-4" />Attach screenshot<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={pending} onChange={(event) => { uploadProblemPhoto(event.target.files?.[0]); event.currentTarget.value = "" }} /></label>{pending ? <LoaderCircle className="h-4 w-4 animate-spin text-rose-600" /> : null}</div>
          {selectedSummary?.problemAttachments.length ? <div className="mt-3 grid gap-2 sm:grid-cols-2">{selectedSummary.problemAttachments.map((attachment) => <a key={attachment.path} href={attachment.signedUrl || "#"} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-2 rounded-md border border-rose-100 bg-white px-3 py-2 text-xs font-semibold text-slate-700"><FileImage className="h-4 w-4 shrink-0 text-rose-500" /><span className="truncate">{attachment.name}</span></a>)}</div> : null}
        </section>
        {error ? <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p> : null}
        {message ? <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{message}</p> : null}
        <button type="button" onClick={save} disabled={pending || (!completed.trim() && !open.trim() && !problems.trim())} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[#0071e3] px-5 text-sm font-semibold text-white disabled:opacity-40 sm:w-auto sm:justify-self-start"><Save className="h-4 w-4" />{pending ? "Saving..." : selectedSummary ? "Update daily summary" : "Save daily summary"}</button>
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
