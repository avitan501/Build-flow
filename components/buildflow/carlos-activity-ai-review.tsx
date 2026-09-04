"use client"

import { BrainCircuit, LoaderCircle, RefreshCw } from "lucide-react"
import { useState, useTransition } from "react"

import { analyzeCarlosActivityAction } from "@/app/admin/carlos-activity/actions"
import type { CarlosActivityAiReview } from "@/lib/carlos-activity-review"
import { formatSiteDateTime } from "@/lib/site-date-time"

export function CarlosActivityAiReviewCard({ initialReview }: { initialReview: CarlosActivityAiReview | null }) {
  const [review, setReview] = useState(initialReview)
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()

  function analyze() {
    setError("")
    startTransition(async () => {
      const result = await analyzeCarlosActivityAction()
      if (!result.ok) { setError(result.error); return }
      setReview({ date: new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date()), answer: result.answer, generatedAt: result.generatedAt, eventCount: result.eventCount })
    })
  }

  return <section className="mt-4 overflow-hidden rounded-lg border border-violet-200 bg-white shadow-sm">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-violet-100 bg-violet-50 px-4 py-3">
      <div className="flex items-center gap-2"><BrainCircuit className="h-5 w-5 text-violet-700" /><div><h2 className="font-semibold">Today&apos;s smart review</h2><p className="text-xs text-slate-600">Results, possible problems, and the next actions from saved Avantia activity.</p></div></div>
      <button type="button" onClick={analyze} disabled={pending} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-violet-700 px-3 text-xs font-bold text-white disabled:opacity-60">{pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}{review ? "Analyze again" : "Analyze today"}</button>
    </header>
    {error ? <p role="alert" className="m-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p> : null}
    {review ? <div className="px-4 py-4"><p className="whitespace-pre-line text-sm leading-6 text-slate-800">{review.answer}</p><p className="mt-3 text-[11px] text-slate-500">Based on {review.eventCount} tracked action{review.eventCount === 1 ? "" : "s"} · Generated {formatSiteDateTime(review.generatedAt, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p></div> : <p className="px-4 py-5 text-sm text-slate-500">No review has been generated for today.</p>}
  </section>
}
