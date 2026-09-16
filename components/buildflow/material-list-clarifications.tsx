"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { saveMaterialClarifications } from "@/app/owner/materials/requests/clarification-actions"
import { materialListClarifications } from "@/lib/material-list-clarifications"

export function MaterialListClarifications({ requestId, itemId, revision, source, saved }: { requestId: string; itemId: string; revision: string; source: string; saved?: unknown }) {
  const questions = materialListClarifications(source)
  const prior = saved && typeof saved === "object" ? saved as { source?: string; answers?: Record<string, string> } : null
  const [answers, setAnswers] = useState<Record<string, string>>(prior?.source === source ? prior.answers || {} : {})
  const [open, setOpen] = useState(false)
  const [feedback, setFeedback] = useState("")
  const [pending, startTransition] = useTransition()
  const busy = useRef(false)
  const router = useRouter()
  if (!questions.length) return null
  return <div className="border-b border-slate-200 bg-white px-3 py-3 sm:px-4">
    <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="min-h-11 rounded-lg border border-sky-200 px-3 text-sm font-semibold text-sky-800">Check list · shared questions</button>
    {open ? <div className="mt-3 grid gap-3" aria-label="Shared material questions">
      <p className="text-xs text-slate-600">Answer once for this original list before recognizing. Unknown answers stay unknown; source text is never replaced.</p>
      {questions.map(q => <label key={q.id} className="grid gap-1 text-sm font-semibold">{q.question}<select disabled={pending} aria-label={q.question} value={answers[q.id] || ""} onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })} className="min-h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2 text-sm font-normal"><option value="">Choose…</option>{q.options.map(option => <option key={option}>{option}</option>)}</select><span className="text-xs font-normal text-slate-500">{q.scope}{q.reference ? <> <a className="underline" href={q.reference} target="_blank" rel="noreferrer">Manufacturer reference</a></> : null}</span></label>)}
      <button disabled={pending} type="button" onClick={() => { if (busy.current) return; busy.current = true; startTransition(async () => { try { const result = await saveMaterialClarifications({ requestId, itemId, revision, answers }); setFeedback(result.ok ? "Answers saved. Recognize the list to apply them; existing product edits remain protected." : result.error); if (result.ok) router.refresh() } catch { setFeedback("Answers were not saved. Try again.") } finally { busy.current = false } }) }} className="min-h-11 justify-self-start rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Saving…" : "Save shared answers"}</button>
      <p role="status" className="text-xs text-slate-600">{feedback}</p>
    </div> : null}
  </div>
}
