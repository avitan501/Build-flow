"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { Check, ChevronDown, Circle, X } from "lucide-react"
import { updateRequestWorkflowStepDetailsAction } from "@/app/owner/materials/requests/actions"
import { REQUEST_GUIDE_STEPS, type requestWorkflowGuidance } from "@/lib/request-workflow-guidance"
import { requestStepAttention, type RequestStep, type RequestStepPatch, type RequestStepState } from "@/lib/request-step-state"
import type { RequestActivityEvent } from "@/components/buildflow/request-activity-log"
import { formatSiteDateTime } from "@/lib/site-date-time"

type StepDraft = { state: RequestStepState; patch: RequestStepPatch; pending: boolean; error: string }
type Workspace = { steps: StepDraft[]; available: boolean; change: (step: RequestStep, patch: RequestStepPatch, debounce?: boolean) => void; flush: (step: RequestStep, retry?: boolean) => void }
const Context = createContext<Workspace | null>(null)
export function useRequestStepWorkspace() { return useContext(Context) }

export function RequestStepWorkspace({ initial, available, actorId, saveAction = updateRequestWorkflowStepDetailsAction, children }: { initial: RequestStepState[]; available: boolean; actorId: string; saveAction?: typeof updateRequestWorkflowStepDetailsAction; children: ReactNode }) {
  const router = useRouter()
  const [steps, setSteps] = useState<StepDraft[]>(() => initial.map(state => ({ state, patch: {}, pending: false, error: "" })))
  const current = useRef(steps)
  const timers = useRef(new Map<RequestStep, ReturnType<typeof setTimeout>>())
  const saving = useRef(new Set<RequestStep>())
  const draftKey = `avantia-step-drafts:${actorId}:${initial[0]?.request_id}`
  function publish(next: StepDraft[]) { current.current = next; setSteps(next) }
  useEffect(() => {
    publish(current.current.map(draft => {
      const fresh = initial.find(state => state.step === draft.state.step)!
      return Object.keys(draft.patch).length || draft.pending ? { ...draft, state: { ...draft.state, eligible: fresh.eligible, completed: fresh.eligible && draft.state.completed } } : { ...draft, state: fresh }
    }))
  }, [initial])
  useEffect(() => {
    try {
      const stored = JSON.parse(sessionStorage.getItem(draftKey) || "null") as Array<{ step: RequestStep; patch: RequestStepPatch }> | null
      if (Array.isArray(stored)) publish(current.current.map(row => {
        const restored = stored.find(item => item.step === row.state.step)?.patch
        if (!restored || typeof restored !== "object") return row
        const patch: RequestStepPatch = {}
        if (typeof restored.note === "string") patch.note = restored.note.slice(0, 2000)
        if (["carlos", "david"].includes(restored.assignee || "")) patch.assignee = restored.assignee
        if (typeof restored.completed_override === "boolean") patch.completed_override = restored.completed_override
        return Object.keys(patch).length ? { ...row, patch, error: "Unsaved changes recovered. Review and retry." } : row
      }))
    } catch { /* Storage is optional; visible navigation guards still protect drafts. */ }
  }, [draftKey])
  useEffect(() => {
    try {
      const unsaved = steps.filter(row => Object.keys(row.patch).length).map(row => ({ step: row.state.step, patch: row.patch }))
      if (unsaved.length) sessionStorage.setItem(draftKey, JSON.stringify(unsaved))
      else sessionStorage.removeItem(draftKey)
    } catch { /* Keep the visible draft even if browser storage is unavailable. */ }
  }, [steps, draftKey])

  const flush = useCallback(async function flushStep(step: RequestStep, retry = false) {
    clearTimeout(timers.current.get(step))
    if (saving.current.has(step) || !available) return
    const draft = current.current.find(row => row.state.step === step)!
    if (draft.error && !retry) return
    if (!Object.keys(draft.patch).length) return
    const patch = { ...draft.patch }
    saving.current.add(step)
    publish(current.current.map(row => row.state.step === step ? { ...row, pending: true, error: "" } : row))
    try {
      const result = await saveAction({ requestId: draft.state.request_id, step, revision: draft.state.revision, patch })
      if (!result.ok) {
        publish(current.current.map(row => row.state.step === step ? { ...row, pending: false, error: result.error, state: "current" in result && result.current ? { ...row.state, ...result.current, completed: row.state.eligible && (result.current.completed_override ?? row.state.completed) } : row.state } : row))
        return
      }
      publish(current.current.map(row => {
        if (row.state.step !== step) return row
        const remaining = { ...row.patch }
        for (const key of Object.keys(patch) as Array<keyof RequestStepPatch>) if (remaining[key] === patch[key]) delete remaining[key]
        return { state: { ...row.state, ...result.record, completed: row.state.eligible && (result.record.completed_override ?? row.state.completed) }, patch: remaining, pending: false, error: "" }
      }))
      router.refresh()
    } catch {
      publish(current.current.map(row => row.state.step === step ? { ...row, pending: false, error: "Not saved. Your changes are kept. Retry when connected." } : row))
      return
    } finally { saving.current.delete(step) }
    if (Object.keys(current.current.find(row => row.state.step === step)!.patch).length) void flushStep(step)
  }, [available, router, saveAction])

  function change(step: RequestStep, patch: RequestStepPatch, debounce = false) {
    publish(current.current.map(row => row.state.step === step ? { ...row, patch: { ...row.patch, ...patch }, error: "" } : row))
    clearTimeout(timers.current.get(step))
    if (debounce) timers.current.set(step, setTimeout(() => void flush(step), 600))
    else void flush(step)
  }
  useEffect(() => {
    const dirty = () => current.current.some(row => row.pending || Object.keys(row.patch).length)
    const unload = (event: BeforeUnloadEvent) => { if (dirty()) { event.preventDefault(); event.returnValue = "" } }
    const navigate = (event: MouseEvent) => {
      const anchor = (event.target as Element).closest?.("a[href]") as HTMLAnchorElement | null
      if (anchor && !anchor.getAttribute("href")?.startsWith("#") && dirty() && !window.confirm("Some step changes are not saved yet. Leave without them?")) { event.preventDefault(); event.stopPropagation() }
    }
    window.addEventListener("beforeunload", unload)
    document.addEventListener("click", navigate, true)
    const scheduled = timers.current
    return () => { window.removeEventListener("beforeunload", unload); document.removeEventListener("click", navigate, true); scheduled.forEach(clearTimeout) }
  }, [])
  return <Context.Provider value={{ steps, available, change, flush }}>{children}</Context.Provider>
}

export function RequestStepStatusPopover({ step }: { step: RequestStep }) {
  const workspace = useContext(Context)!
  const draft = workspace.steps.find(row => row.state.step === step)!
  const dialog = useRef<HTMLDialogElement>(null)
  const effective = { ...draft.state, ...draft.patch }
  const completed = draft.state.completed
  function close() { workspace.flush(step); dialog.current?.close() }
  return <>
    <button type="button" onClick={() => dialog.current?.showModal()} aria-label={`Step ${step}: ${completed ? "Done" : "In progress"}. Open step details`} className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-2.5 text-[10px] font-bold ${completed ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-600"}`}>{completed ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}{draft.pending ? "Saving…" : Object.keys(draft.patch).length ? "Not saved" : completed ? "Done" : "In progress"}</button>
    <dialog ref={dialog} onCancel={() => workspace.flush(step)} className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-slate-200 bg-white p-4 text-slate-950 shadow-xl backdrop:bg-slate-950/30" aria-label={`Step ${step} details`}>
      <div className="flex items-center justify-between"><h3 className="text-sm font-bold">Step {step} · {REQUEST_GUIDE_STEPS[step - 1].label}</h3><button type="button" onClick={close} aria-label="Close step details" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-slate-100"><X className="h-4 w-4" /></button></div>
      {!workspace.available ? <p role="alert" className="my-2 text-xs text-amber-800">Step details are temporarily unavailable. Please refresh and try again.</p> : null}
      <fieldset disabled={!workspace.available} className="grid gap-3 disabled:opacity-50">
        <label className="grid gap-1 text-xs font-semibold">Responsible person<select value={effective.assignee} onChange={event => workspace.change(step, { assignee: event.target.value as "carlos" | "david" })} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3"><option value="carlos">Carlos</option><option value="david">David</option></select></label>
        <label className="grid gap-1 text-xs font-semibold">Status<select value={String(draft.patch.completed_override ?? completed)} onChange={event => workspace.change(step, { completed_override: event.target.value === "true" })} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3"><option value="false">In progress</option><option value="true">Done</option></select></label>
        <label className="grid gap-1 text-xs font-semibold">Internal note<textarea value={effective.note} maxLength={2000} onChange={event => workspace.change(step, { note: event.target.value }, true)} onBlur={() => workspace.flush(step)} rows={3} placeholder="What needs to happen?" className="resize-y rounded-lg border border-slate-300 px-3 py-2 font-normal" /></label>
      </fieldset>
      <div className="mt-2 text-xs" aria-live="polite">{draft.error ? <div role="alert" className="text-amber-900"><p>{draft.error}</p><button type="button" onClick={() => workspace.flush(step, true)} className="mt-1 min-h-11 font-bold underline">Retry changes</button></div> : <span className="text-slate-500">{draft.pending ? "Saving…" : Object.keys(draft.patch).length ? "Waiting to save…" : "Changes save automatically · staff only"}</span>}</div>
    </dialog>
  </>
}

export function RequestAttentionIndicator({ guidance, events = [] }: { guidance: ReturnType<typeof requestWorkflowGuidance>; events?: readonly RequestActivityEvent[] }) {
  const workspace = useContext(Context)!
  const attention = requestStepAttention(workspace.steps.map(row => row.state))
  const dialog = useRef<HTMLDialogElement>(null)
  const allDone = attention.assignee === null
  const waiting = !allDone && guidance.waiting && guidance.step === attention.step
  const [eventLimit, setEventLimit] = useState(20)
  const text = allDone ? "Payment recorded · delivery scheduled, not confirmed delivered." : attention.step === 1 && guidance.step !== 1 ? "Review the reopened Items step, then mark it Done." : attention.step === 3 && guidance.text.startsWith("Payment recorded") ? "Review this reopened step, then mark it Done." : guidance.text
  function openStep(index: number) {
    dialog.current?.close()
    const target = document.getElementById(REQUEST_GUIDE_STEPS[index].id)
    if (target instanceof HTMLDetailsElement) target.open = true
    target?.scrollIntoView({ block: "start" })
    target?.focus({ preventScroll: true })
  }
  return <>
    <div className="flex min-w-0 items-center gap-2">
      {attention.assignee ? <span className="text-xs font-bold text-slate-700">{attention.assignee === "david" ? "David" : "Carlos"}</span> : null}
      <button type="button" onClick={() => dialog.current?.showModal()} aria-haspopup="dialog" aria-label={`Request progress: ${attention.label}. View next action`} className={`inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-semibold ${allDone ? "border-emerald-200 bg-emerald-50 text-emerald-800" : waiting ? "border-sky-200 bg-sky-50 text-sky-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}><span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${allDone ? "bg-emerald-500" : waiting ? "bg-sky-500" : "bg-rose-600"}`} /><span className="whitespace-nowrap">{allDone ? "All done" : waiting ? "Waiting" : "Action needed"}</span><ChevronDown className="h-3 w-3 shrink-0" /></button>
    </div>
    <dialog ref={dialog} className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 text-slate-950 shadow-xl backdrop:bg-slate-950/30" aria-label="Request progress">
      <div className="flex max-h-[85dvh] flex-col">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-2"><h3 className="text-sm font-bold">Request overview</h3><button type="button" onClick={() => dialog.current?.close()} aria-label="Close request progress" className="flex h-11 w-11 items-center justify-center"><X className="h-4 w-4" /></button></div>
        <div className="min-h-0 overflow-y-auto px-4 py-4" data-testid="request-overview-scroll">
          <nav aria-label="Request steps"><ol className="grid gap-4">{REQUEST_GUIDE_STEPS.map((item, index) => {
            const row = workspace.steps[index].state
            const active = !allDone && attention.step === index + 1
            const label = row.completed ? "Done" : active ? waiting ? "Waiting" : "Action needed" : "Not started"
            return <li key={item.id} className="flex gap-3"><span aria-hidden="true" className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${row.completed ? "border-emerald-600 bg-emerald-600 text-white" : active ? "border-rose-400 text-rose-700" : "border-slate-300 text-slate-400"}`}>{row.completed ? <Check className="h-4 w-4" /> : <Circle className="h-3 w-3" />}</span><div className="min-w-0 flex-1"><button type="button" onClick={() => openStep(index)} className="min-h-8 text-left text-sm font-bold">{index + 1}. {item.label}</button><p className={`text-xs font-semibold ${row.completed ? "text-emerald-700" : active ? waiting ? "text-sky-700" : "text-rose-700" : "text-slate-500"}`}>{label}</p><p className="mt-1 text-xs leading-5 text-slate-500">{active ? `${row.assignee === "david" ? "David" : "Carlos"} · ${text}` : item.description}</p>{active ? <button type="button" onClick={() => openStep(index)} className="mt-2 min-h-11 rounded-lg bg-[#0071e3] px-3 text-xs font-bold text-white">Open {item.label.toLowerCase()} →</button> : null}</div></li>
          })}</ol></nav>
          <section aria-label="Request activity" className="mt-5 border-t border-slate-200 pt-4"><h4 className="text-sm font-bold">Activity</h4>{events.length ? <ol className="mt-2">{events.slice(0, eventLimit).map(event => <li key={event.id} className="border-l border-slate-200 py-3 pl-3"><p className="text-xs font-semibold text-slate-800">{event.title}</p><time dateTime={event.createdAt} className="mt-1 block text-[11px] text-slate-500">{formatSiteDateTime(event.createdAt, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</time>{event.description ? <details className="mt-1 text-xs text-slate-600"><summary className="min-h-8 cursor-pointer py-1">Details</summary><p className="whitespace-pre-wrap break-words leading-5">{event.description}</p></details> : null}</li>)}</ol> : <p className="mt-2 text-xs text-slate-500">No activity recorded yet.</p>}{events.length > eventLimit ? <button type="button" onClick={() => setEventLimit(limit => limit + 20)} className="min-h-11 text-xs font-semibold text-[#0066cc]">Show earlier activity ({events.length - eventLimit})</button> : null}</section>
        </div>
      </div>
    </dialog>
  </>
}
