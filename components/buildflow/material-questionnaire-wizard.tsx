"use client"

import { Check, ChevronLeft, ChevronRight, FileUp, Pencil, X } from "lucide-react"
import { useMemo, useState, useTransition } from "react"

import {
  formatMaterialAnswer,
  hasMaterialAnswer,
  isQuestionVisible,
  type MaterialAnswerValue,
  type MaterialQuestion,
  type MaterialQuestionnaireSnapshot,
} from "@/lib/material-questionnaires"

type MaterialQuestionnaireWizardProps = {
  snapshot: MaterialQuestionnaireSnapshot
  initialAnswers?: Record<string, MaterialAnswerValue>
  embedded?: boolean
  locked?: boolean
  requireCompletion?: boolean
  onClose?: () => void
  onSave?: (answers: Record<string, MaterialAnswerValue>, complete: boolean) => Promise<{ ok: boolean; error?: string }>
  onUpload?: (question: MaterialQuestion, files: File[]) => Promise<{ ok: boolean; attachmentIds?: string[]; error?: string }>
}

function selectableValue(value: MaterialAnswerValue) {
  if (typeof value === "object" && value && !Array.isArray(value)) return value.selected
  return value
}

function withOther(value: MaterialAnswerValue, other: string): MaterialAnswerValue {
  const selected = selectableValue(value)
  return { selected: Array.isArray(selected) ? selected : typeof selected === "string" ? selected : undefined, other }
}

function CardOptions({ question, value, onChange, disabled }: { question: MaterialQuestion; value: MaterialAnswerValue; onChange: (value: MaterialAnswerValue, autoAdvance?: boolean) => void; disabled: boolean }) {
  const selected = selectableValue(value)
  const selectedValues = Array.isArray(selected) ? selected : typeof selected === "string" ? [selected] : []
  const isMulti = question.question_type === "multi_select"

  function toggle(optionValue: string) {
    if (!isMulti) {
      const other = typeof value === "object" && value && !Array.isArray(value) ? value.other : undefined
      onChange(question.allow_other && optionValue === "other" ? { selected: optionValue, other } : optionValue, optionValue !== "other")
      return
    }
    const next = selectedValues.includes(optionValue) ? selectedValues.filter((entry) => entry !== optionValue) : [...selectedValues, optionValue]
    const other = typeof value === "object" && value && !Array.isArray(value) ? value.other : undefined
    onChange(question.allow_other && next.includes("other") ? { selected: next, other } : next)
  }

  const options = question.question_type === "yes_no"
    ? [{ id: "yes", label: "Yes", value: "yes" }, { id: "no", label: "No", value: "no" }]
    : question.options

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {options.map((option) => {
        const active = selectedValues.includes(option.value)
        return (
          <button
            key={option.id}
            type="button"
            disabled={disabled}
            onClick={() => toggle(option.value)}
            className={`relative flex min-h-16 items-center justify-between gap-3 rounded-[18px] border-2 px-4 py-3 text-left text-[15px] font-semibold transition focus:outline-none focus:ring-4 focus:ring-sky-100 disabled:cursor-default ${active ? "border-[#0071e3] bg-sky-50 text-slate-950 shadow-[0_8px_20px_rgba(0,113,227,0.12)]" : "border-slate-200 bg-white text-slate-800 hover:border-slate-400"}`}
          >
            <span>{option.label}</span>
            <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${active ? "border-[#0071e3] bg-[#0071e3] text-white" : "border-slate-300 text-transparent"}`}><Check className="h-4 w-4" strokeWidth={3} /></span>
          </button>
        )
      })}
      {question.allow_other && selectedValues.includes("other") ? (
        <label className="grid gap-2 sm:col-span-2">
          <span className="text-sm font-semibold text-slate-800">Please specify</span>
          <input disabled={disabled} value={typeof value === "object" && value && !Array.isArray(value) ? value.other ?? "" : ""} onChange={(event) => onChange(withOther(value, event.target.value))} className="min-h-12 rounded-2xl border border-slate-300 px-4 text-base outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 disabled:bg-slate-50" />
        </label>
      ) : null}
    </div>
  )
}

function QuestionControl({ question, value, onChange, disabled, onUpload }: {
  question: MaterialQuestion
  value: MaterialAnswerValue
  onChange: (value: MaterialAnswerValue, autoAdvance?: boolean) => void
  disabled: boolean
  onUpload?: MaterialQuestionnaireWizardProps["onUpload"]
}) {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  if (["single_select", "multi_select", "yes_no"].includes(question.question_type)) {
    return <CardOptions question={question} value={value} onChange={onChange} disabled={disabled} />
  }
  if (question.question_type === "dropdown") {
    return <select disabled={disabled} value={typeof value === "string" ? value : ""} onChange={(event) => onChange(event.target.value)} className="min-h-13 w-full rounded-2xl border border-slate-300 bg-white px-4 text-base outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"><option value="">Choose one</option>{question.options.map((option) => <option key={option.id} value={option.value}>{option.label}</option>)}</select>
  }
  if (question.question_type === "long_text") {
    return <textarea disabled={disabled} rows={5} value={typeof value === "string" ? value : ""} placeholder={question.placeholder} onChange={(event) => onChange(event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 disabled:bg-slate-50" />
  }
  if (question.question_type === "quantity") {
    const current = typeof value === "object" && value && !Array.isArray(value) ? value : {}
    return <div className="grid gap-3 sm:grid-cols-[1fr_1fr]"><input disabled={disabled} type="number" min="0" inputMode="decimal" value={current.value ?? ""} placeholder={question.placeholder || "Enter quantity"} onChange={(event) => onChange({ ...current, value: event.target.value === "" ? undefined : Math.max(0, Number(event.target.value)) })} className="min-h-13 rounded-2xl border border-slate-300 px-4 text-base outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" /><select disabled={disabled} value={current.unit ?? ""} onChange={(event) => onChange({ ...current, unit: event.target.value })} className="min-h-13 rounded-2xl border border-slate-300 bg-white px-4 text-base"><option value="">Choose unit</option>{(question.configuration.units ?? []).map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select>{question.configuration.allowNotes ? <input disabled={disabled} value={current.notes ?? ""} placeholder="Packaging or quantity notes" onChange={(event) => onChange({ ...current, notes: event.target.value })} className="min-h-13 rounded-2xl border border-slate-300 px-4 text-base sm:col-span-2" /> : null}</div>
  }
  if (question.question_type === "file_upload") {
    const current = typeof value === "object" && value && !Array.isArray(value) ? value : {}
    return <div className="grid gap-2"><label className="flex min-h-24 cursor-pointer items-center justify-center gap-3 rounded-[18px] border-2 border-dashed border-slate-300 bg-slate-50 px-4 text-center text-sm font-semibold text-slate-700 hover:border-sky-400"><FileUp className="h-5 w-5" /><span>{uploading ? "Uploading..." : current.attachmentIds?.length ? `${current.attachmentIds.length} file${current.attachmentIds.length === 1 ? "" : "s"} attached` : "Choose plans or documents"}</span><input disabled={disabled || uploading || !onUpload} type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.csv" className="sr-only" onChange={async (event) => { const files = Array.from(event.target.files ?? []); if (!files.length || !onUpload) return; setUploading(true); setUploadError(null); const result = await onUpload(question, files); setUploading(false); if (!result.ok) return setUploadError(result.error || "Upload failed."); onChange({ ...current, attachmentIds: [...(current.attachmentIds ?? []), ...(result.attachmentIds ?? [])] }) }} /></label>{uploadError ? <p className="text-sm text-rose-700">{uploadError}</p> : null}</div>
  }

  const numeric = ["number", "square_feet", "linear_feet", "gallons"].includes(question.question_type)
  return <div className="relative"><input disabled={disabled} type={numeric ? "number" : "text"} min={numeric ? 0 : undefined} inputMode={numeric ? "decimal" : undefined} value={typeof value === "number" || typeof value === "string" ? value : ""} placeholder={question.placeholder} onChange={(event) => onChange(numeric ? event.target.value === "" ? "" : Math.max(0, Number(event.target.value)) : event.target.value)} className={`min-h-13 w-full rounded-2xl border border-slate-300 px-4 text-base outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 disabled:bg-slate-50 ${question.unit ? "pr-24" : ""}`} />{question.unit ? <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-semibold text-slate-500">{question.unit}</span> : null}</div>
}

export function MaterialQuestionnaireWizard({ snapshot, initialAnswers = {}, embedded = false, locked = false, requireCompletion = false, onClose, onSave, onUpload }: MaterialQuestionnaireWizardProps) {
  const [answers, setAnswers] = useState<Record<string, MaterialAnswerValue>>(initialAnswers)
  const [step, setStep] = useState(0)
  const [reviewing, setReviewing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const visibleQuestions = useMemo(() => snapshot.questions.filter((question) => isQuestionVisible(question, answers)), [answers, snapshot.questions])
  const current = visibleQuestions[Math.min(step, Math.max(visibleQuestions.length - 1, 0))]
  const progress = visibleQuestions.length ? ((Math.min(step, visibleQuestions.length - 1) + 1) / visibleQuestions.length) * 100 : 100

  function update(questionId: string, value: MaterialAnswerValue, autoAdvance = false) {
    const nextAnswers = { ...answers, [questionId]: value }
    setAnswers(nextAnswers)
    setError(null)
    if (!autoAdvance) return

    window.setTimeout(() => {
      const nextVisibleQuestions = snapshot.questions.filter((question) => isQuestionVisible(question, nextAnswers))
      const currentIndex = nextVisibleQuestions.findIndex((question) => question.id === questionId)
      if (currentIndex >= nextVisibleQuestions.length - 1) setReviewing(true)
      else setStep(currentIndex + 1)
    }, 220)
  }

  function next() {
    if (current?.is_required && !hasMaterialAnswer(answers[current.id])) return setError("This answer is required before continuing.")
    setError(null)
    if (step >= visibleQuestions.length - 1) setReviewing(true)
    else setStep((value) => value + 1)
  }

  function save(complete: boolean) {
    if (!onSave) return
    if (complete) {
      const missing = visibleQuestions.find((question) => question.is_required && !hasMaterialAnswer(answers[question.id]))
      if (missing) { setStep(visibleQuestions.findIndex((question) => question.id === missing.id)); setReviewing(false); return setError(`Please answer: ${missing.label}`) }
    }
    startTransition(async () => {
      const result = await onSave(answers, complete)
      if (!result.ok) return setError(result.error || "Could not save your answers.")
      if (complete) onClose?.()
    })
  }

  const content = (
    <section className={`${embedded ? "w-full" : "max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-[24px] border border-white/70 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.32)]"}`} aria-label={`${snapshot.category.name} material questions`}>
      <header className="border-b border-slate-100 bg-white px-5 py-4 sm:px-7">
        <div className="flex items-start justify-between gap-4"><div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0066cc]">Material order details</p><h2 className="mt-1 text-xl font-bold text-slate-950 sm:text-2xl">{snapshot.category.name}</h2>{requireCompletion ? <p className="mt-1 text-xs font-semibold text-slate-500">Required to complete this department request</p> : null}</div>{onClose && !requireCompletion ? <button type="button" onClick={onClose} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500" aria-label="Close questionnaire"><X className="h-5 w-5" /></button> : null}</div>
        {!reviewing ? <div className="mt-4"><div className="flex justify-between text-xs font-semibold text-slate-500"><span>Question {Math.min(step + 1, visibleQuestions.length)} of {visibleQuestions.length}</span><span>{Math.round(progress)}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#0071e3] transition-all" style={{ width: `${progress}%` }} /></div></div> : null}
      </header>

      <div className={`${embedded ? "" : "max-h-[62vh] overflow-y-auto"} px-5 py-6 sm:px-7`}>
        {reviewing ? <div><div className="mb-5"><h3 className="text-xl font-bold text-slate-950">Review your answers</h3><p className="mt-1 text-sm text-slate-600">Check the details before finishing. You can edit any answer.</p></div><div className="grid gap-2">{visibleQuestions.map((question, index) => <button key={question.id} type="button" onClick={() => { setStep(index); setReviewing(false) }} className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left hover:border-sky-300"><span><span className="block text-sm font-semibold text-slate-950">{question.label}</span><span className="mt-1 block text-sm text-slate-600">{formatMaterialAnswer(question, answers[question.id]) || "Not answered"}</span></span><Pencil className="mt-0.5 h-4 w-4 shrink-0 text-[#0071e3]" /></button>)}</div></div> : current ? <div><h3 className="text-[1.35rem] font-bold leading-tight text-slate-950 sm:text-2xl">{current.label}{current.is_required ? <span className="text-rose-500"> *</span> : null}</h3>{current.help_text ? <p className="mt-2 text-sm leading-6 text-slate-600">{current.help_text}</p> : null}<div className="mt-5"><QuestionControl question={current} value={answers[current.id] ?? null} onChange={(value, autoAdvance) => update(current.id, value, autoAdvance)} disabled={locked} onUpload={onUpload} /></div></div> : <p className="text-sm text-slate-600">No active questions are configured.</p>}
        {error ? <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">{error}</div> : null}
      </div>

      {!locked ? <footer className="grid gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:grid-cols-[auto_1fr_auto] sm:px-7"><button type="button" onClick={() => reviewing ? setReviewing(false) : setStep((value) => Math.max(0, value - 1))} disabled={!reviewing && step === 0} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 disabled:opacity-40"><ChevronLeft className="h-4 w-4" />Back</button>{onSave && !requireCompletion ? <button type="button" disabled={isPending} onClick={() => save(false)} className="min-h-11 rounded-2xl px-4 text-sm font-semibold text-slate-600 hover:bg-white">Answer later</button> : <span />}{reviewing ? <button type="button" disabled={isPending} onClick={() => save(true)} className="min-h-11 rounded-2xl bg-[#0071e3] px-5 text-sm font-semibold text-white disabled:opacity-50">{isPending ? "Saving..." : "Save and finish"}</button> : <button type="button" onClick={next} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white">{step >= visibleQuestions.length - 1 ? "Review" : "Next"}<ChevronRight className="h-4 w-4" /></button>}</footer> : null}
    </section>
  )

  if (embedded) return content
  return <div className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-950/50 px-3 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-8 backdrop-blur-sm sm:items-center sm:p-6">{content}</div>
}
