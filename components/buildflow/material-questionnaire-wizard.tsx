"use client"

import { Check, ChevronLeft, ChevronRight, FileUp, Pencil, Plus, Trash2, X } from "lucide-react"
import { useMemo, useState, useTransition } from "react"

import {
  formatMaterialAnswer,
  hasCompleteMaterialAnswer,
  hasMaterialAnswer,
  isQuestionVisible,
  type MaterialAnswerValue,
  type MaterialLineItem,
  type MaterialQuestion,
  type MaterialQuestionnaireSnapshot,
} from "@/lib/material-questionnaires"

type MaterialQuestionnaireWizardProps = {
  snapshot: MaterialQuestionnaireSnapshot
  initialAnswers?: Record<string, MaterialAnswerValue>
  displayMode?: "steps" | "all"
  density?: "comfortable" | "compact"
  configurator?: boolean
  embedded?: boolean
  locked?: boolean
  requireCompletion?: boolean
  onAnswersChange?: (answers: Record<string, MaterialAnswerValue>) => void
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

function LumberItemList({ question, value, onChange, disabled }: {
  question: MaterialQuestion
  value: MaterialAnswerValue
  onChange: (value: MaterialAnswerValue) => void
  disabled: boolean
}) {
  const storedItems = typeof value === "object" && value && !Array.isArray(value) ? value.items ?? [] : []
  const moldingMode = question.configuration.itemMode === "molding"
  const emptyItem: MaterialLineItem = { size: moldingMode ? "Molding" : "", length: "", quantity: 0 }
  const items: MaterialLineItem[] = storedItems.length ? storedItems : [emptyItem]
  const sizes = question.configuration.itemSizes ?? []
  const lengths = question.configuration.itemLengths ?? []

  function updateItem(index: number, field: "size" | "length" | "quantity" | "code", nextValue: string) {
    const next = items.map((item, itemIndex) => itemIndex === index ? {
      ...item,
      [field]: field === "quantity" ? Math.max(0, Number(nextValue)) : nextValue,
    } : item)
    onChange({ items: next })
  }

  function toggleItem(index: number, field: "douglasFir" | "pressureTreated") {
    onChange({ items: items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: !item[field] } : item) })
  }

  return (
    <div className="grid gap-3">
      {items.map((item, index) => (
        <div key={index} className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className={`grid gap-2 ${moldingMode ? "sm:grid-cols-[1.2fr_1fr_minmax(7rem,.7fr)_2.75rem]" : "sm:grid-cols-[1fr_1fr_minmax(7rem,.7fr)_2.75rem]"} sm:items-end`}>
          {moldingMode ? <label className="grid gap-1 text-xs font-semibold text-slate-600">Molding profile code<input disabled={disabled} value={item.code ?? ""} onChange={(event) => updateItem(index, "code", event.target.value)} placeholder="Garden State code" className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950" /></label> : <label className="grid gap-1 text-xs font-semibold text-slate-600">Lumber size<select disabled={disabled} value={item.size} onChange={(event) => updateItem(index, "size", event.target.value)} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950"><option value="">Choose size</option>{sizes.map((size) => <option key={size} value={size}>{size}</option>)}</select></label>}
          <label className="grid gap-1 text-xs font-semibold text-slate-600">Length<select disabled={disabled} value={item.length} onChange={(event) => updateItem(index, "length", event.target.value)} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950"><option value="">Choose length</option>{lengths.map((length) => <option key={length} value={length}>{length}</option>)}</select></label>
          <label className="grid gap-1 text-xs font-semibold text-slate-600">Quantity<input disabled={disabled} type="number" min="1" inputMode="numeric" value={item.quantity || ""} placeholder="0" onChange={(event) => updateItem(index, "quantity", event.target.value)} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950" /></label>
          <button type="button" disabled={disabled || items.length === 1} onClick={() => onChange({ items: items.filter((_, itemIndex) => itemIndex !== index) })} className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-500 disabled:opacity-30" aria-label={`Remove ${moldingMode ? "molding" : "lumber"} item ${index + 1}`}><Trash2 className="h-4 w-4" /></button>
          </div>
          {!moldingMode ? <div className="flex flex-wrap gap-2">
            <label className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700"><input type="checkbox" checked={Boolean(item.douglasFir)} onChange={() => toggleItem(index, "douglasFir")} className="h-4 w-4 accent-[#0071e3]" />Douglas Fir</label>
            <label className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700"><input type="checkbox" checked={Boolean(item.pressureTreated)} onChange={() => toggleItem(index, "pressureTreated")} className="h-4 w-4 accent-[#0071e3]" />Pressure Treated</label>
          </div> : <p className="text-xs text-slate-500">Enter a catalog code above or attach a molding photo below.</p>}
        </div>
      ))}
      <button type="button" disabled={disabled} onClick={() => onChange({ items: [...items, emptyItem] })} className="inline-flex min-h-11 w-fit items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:border-slate-500"><Plus className="h-4 w-4" />Add Another {moldingMode ? "Molding" : "Item"}</button>
    </div>
  )
}

function CardOptions({ question, value, onChange, disabled, compact = false }: { question: MaterialQuestion; value: MaterialAnswerValue; onChange: (value: MaterialAnswerValue, autoAdvance?: boolean) => void; disabled: boolean; compact?: boolean }) {
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
    <div className={compact ? "flex flex-wrap gap-2" : "grid gap-3 sm:grid-cols-2"}>
      {options.map((option) => {
        const active = selectedValues.includes(option.value)
        return (
          <button
            key={option.id}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            onClick={() => toggle(option.value)}
            className={`${compact ? "min-h-11 rounded-lg px-3 py-2 text-sm" : "min-h-16 rounded-[18px] px-4 py-3 text-[15px]"} relative flex touch-manipulation items-center justify-between gap-2 border-2 text-left font-semibold transition-[border-color,background-color,box-shadow,color] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-100 disabled:cursor-default ${active ? compact ? "border-[#0071e3] bg-sky-50 text-slate-950 shadow-[0_0_0_1px_#0071e3]" : "border-[#0071e3] bg-sky-50 text-slate-950 shadow-[0_8px_20px_rgba(0,113,227,0.12)]" : "border-slate-300 bg-white text-slate-800 hover:border-slate-500 active:bg-slate-50"}`}
          >
            <span>{option.label}</span>
            <span className={`${compact ? "h-4 w-4" : "h-6 w-6"} inline-flex shrink-0 items-center justify-center rounded-full border ${active ? "border-[#0071e3] bg-[#0071e3] text-white" : compact ? "border-transparent text-transparent" : "border-slate-300 text-transparent"}`}><Check className={compact ? "h-3 w-3" : "h-4 w-4"} strokeWidth={3} /></span>
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

function QuestionControl({ question, value, onChange, disabled, onUpload, compact = false }: {
  question: MaterialQuestion
  value: MaterialAnswerValue
  onChange: (value: MaterialAnswerValue, autoAdvance?: boolean) => void
  disabled: boolean
  onUpload?: MaterialQuestionnaireWizardProps["onUpload"]
  compact?: boolean
}) {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const controlId = `material-question-${question.id}`

  if (["single_select", "multi_select", "yes_no"].includes(question.question_type)) {
    return <CardOptions question={question} value={value} onChange={onChange} disabled={disabled} compact={compact} />
  }
  if (question.question_type === "item_list") {
    return <LumberItemList question={question} value={value} onChange={onChange} disabled={disabled} />
  }
  if (question.question_type === "dropdown") {
    return <select id={controlId} name={question.question_key} aria-label={question.label} disabled={disabled} value={typeof value === "string" ? value : ""} onChange={(event) => onChange(event.target.value)} className="min-h-13 w-full rounded-2xl border border-slate-300 bg-white px-4 text-base outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"><option value="">Choose one</option>{question.options.map((option) => <option key={option.id} value={option.value}>{option.label}</option>)}</select>
  }
  if (question.question_type === "long_text") {
    return <textarea id={controlId} name={question.question_key} aria-label={question.label} autoComplete="off" disabled={disabled} rows={5} value={typeof value === "string" ? value : ""} placeholder={question.placeholder} onChange={(event) => onChange(event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 disabled:bg-slate-50" />
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
  return <div className={`relative ${compact ? "max-w-sm" : ""}`}><input id={controlId} name={question.question_key} aria-label={question.label} autoComplete="off" disabled={disabled} type={numeric ? "number" : "text"} min={numeric ? 0 : undefined} inputMode={numeric ? "decimal" : undefined} value={typeof value === "number" || typeof value === "string" ? value : ""} placeholder={question.placeholder} onChange={(event) => onChange(numeric ? event.target.value === "" ? "" : Math.max(0, Number(event.target.value)) : event.target.value)} className={`${compact ? "min-h-11 rounded-lg text-sm" : "min-h-13 rounded-2xl text-base"} w-full border border-slate-300 px-4 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 disabled:bg-slate-50 ${question.unit ? "pr-24" : ""}`} />{question.unit ? <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs font-semibold text-slate-500">{question.unit}</span> : null}</div>
}

function configuratorGroupsFor(snapshot: MaterialQuestionnaireSnapshot) {
  const isDrywall = snapshot.category.slug.includes("sheetrock") || snapshot.category.slug.includes("drywall")
  const isTile = snapshot.category.department_key === "Tile work"
  const isDoor = snapshot.category.department_key === "Door and molding"
  const isFraming = snapshot.category.department_key === "Framing"
  return [
    { id: "material", title: isDoor ? "Order Type" : "Material", description: isDrywall ? "Choose the board and performance type." : isTile ? "Choose the tile-setting materials." : isDoor ? "Choose molding, doors, or both." : isFraming ? "Build a lumber list for this project." : "Choose the flooring construction and appearance." },
    { id: "size", title: "Size & Quantity", description: isDrywall ? "Set sheet dimensions, thickness, and quantity." : isTile ? "Enter the amount needed for each selected material." : isDoor ? "Add profile, length, door, and measurement details." : isFraming ? "Choose a common size and length for every lumber line." : "Set the dimensions and the amount required." },
    { id: "extras", title: isDoor ? "Reference & Notes" : isTile ? "Waterproofing" : "Accessories", description: isDrywall ? "Include screws, compound, tape, corner bead, and metal studs." : isTile ? "Add liquid waterproofing only when the job needs it." : isDoor ? "Add catalog references and jobsite notes." : isFraming ? "Add any hardware or delivery requirements." : "Include the supporting materials needed on site." },
  ] as const
}

function configuratorGroupFor(question: MaterialQuestion) {
  const key = question.question_key.toLowerCase()
  if (key === "lumber_items") return "material"
  if (key === "lumber_grade") return "extras"
  if (key === "drywall_type") return "size"
  if (/(accessor|underlay|adhesive|glue|paper|nosing|transition|waste|bullnose|screw|compound|corner|bead|reference|catalog|note|spacer|waterproof|primer|sealant)/.test(key)) return "extras"
  if (/(width|length|area|square|quantity|amount|count|size|thickness|sand|cement|mesh|measurement|door_type)/.test(key)) return "size"
  return "material"
}

function answerForQuestion(question: MaterialQuestion, answers: Record<string, MaterialAnswerValue>) {
  return answers[question.id] ?? answers[question.question_key] ?? null
}

function initialQuestionnaireAnswers(snapshot: MaterialQuestionnaireSnapshot, initialAnswers: Record<string, MaterialAnswerValue>) {
  const answers = { ...initialAnswers }
  snapshot.questions.forEach((question) => {
    if (question.question_type === "single_select" && question.options.length === 1 && !hasMaterialAnswer(answerForQuestion(question, answers))) {
      answers[question.id] = question.options[0].value
    }
  })
  return answers
}

export function MaterialQuestionnaireWizard({ snapshot, initialAnswers = {}, displayMode = "steps", density = "comfortable", configurator = false, embedded = false, locked = false, requireCompletion = false, onAnswersChange, onClose, onSave, onUpload }: MaterialQuestionnaireWizardProps) {
  const [answers, setAnswers] = useState<Record<string, MaterialAnswerValue>>(() => initialQuestionnaireAnswers(snapshot, initialAnswers))
  const [step, setStep] = useState(0)
  const [reviewing, setReviewing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorQuestionId, setErrorQuestionId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const visibleQuestions = useMemo(() => snapshot.questions.filter((question) => isQuestionVisible(question, answers)), [answers, snapshot.questions])
  const current = visibleQuestions[Math.min(step, Math.max(visibleQuestions.length - 1, 0))]
  const progress = visibleQuestions.length ? ((Math.min(step, visibleQuestions.length - 1) + 1) / visibleQuestions.length) * 100 : 100
  const showAllQuestions = displayMode === "all"
  const compact = density === "compact"
  const answeredQuestions = visibleQuestions.filter((question) => hasMaterialAnswer(answerForQuestion(question, answers)))
  const completionPercent = visibleQuestions.length ? Math.round((answeredQuestions.length / visibleQuestions.length) * 100) : 100
  const requiredQuestions = visibleQuestions.filter((question) => question.is_required)
  const requiredAnswered = requiredQuestions.filter((question) => hasCompleteMaterialAnswer(question, answerForQuestion(question, answers))).length
  const quantityQuestion = visibleQuestions.find((question) => question.question_type === "square_feet" || /area|square|count|quantity|amount/.test(question.question_key.toLowerCase()))
  const quantityAnswer = quantityQuestion ? answerForQuestion(quantityQuestion, answers) : null
  const quantityLabel = quantityQuestion && hasMaterialAnswer(quantityAnswer) ? formatMaterialAnswer(quantityQuestion, quantityAnswer) : ""
  const questionGroups = configuratorGroupsFor(snapshot).map((group) => ({
    ...group,
    questions: visibleQuestions.filter((question) => configuratorGroupFor(question) === group.id),
  })).filter((group) => group.questions.length > 0)

  function update(questionId: string, value: MaterialAnswerValue, autoAdvance = false) {
    const nextAnswers = { ...answers, [questionId]: value }
    setAnswers(nextAnswers)
    onAnswersChange?.(nextAnswers)
    setError(null)
    const updatedQuestion = snapshot.questions.find((question) => question.id === questionId)
    if (errorQuestionId === questionId && updatedQuestion && hasCompleteMaterialAnswer(updatedQuestion, value)) setErrorQuestionId(null)
    if (!autoAdvance || showAllQuestions) return

    window.setTimeout(() => {
      const nextVisibleQuestions = snapshot.questions.filter((question) => isQuestionVisible(question, nextAnswers))
      const currentIndex = nextVisibleQuestions.findIndex((question) => question.id === questionId)
      if (currentIndex >= nextVisibleQuestions.length - 1) setReviewing(true)
      else setStep(currentIndex + 1)
    }, 220)
  }

  function next() {
    if (current?.is_required && !hasCompleteMaterialAnswer(current, answerForQuestion(current, answers))) return setError("This answer is required before continuing.")
    setError(null)
    if (step >= visibleQuestions.length - 1) setReviewing(true)
    else setStep((value) => value + 1)
  }

  function reviewAll() {
    const missing = visibleQuestions.find((question) => question.is_required && !hasCompleteMaterialAnswer(question, answerForQuestion(question, answers)))
    if (missing) {
      setErrorQuestionId(missing.id)
      setError(`Please answer: ${missing.label}`)
      window.requestAnimationFrame(() => {
        const field = document.getElementById(`question-${missing.id}`)
        field?.scrollIntoView({ behavior: "smooth", block: "center" })
        field?.querySelector<HTMLElement>("button, input, select, textarea")?.focus({ preventScroll: true })
      })
      return
    }
    setError(null)
    setErrorQuestionId(null)
    setReviewing(true)
  }

  function save(complete: boolean) {
    if (!onSave) return
    if (complete) {
      const missing = visibleQuestions.find((question) => question.is_required && !hasCompleteMaterialAnswer(question, answerForQuestion(question, answers)))
      if (missing) { setStep(visibleQuestions.findIndex((question) => question.id === missing.id)); setReviewing(false); setErrorQuestionId(missing.id); return setError(`Please answer: ${missing.label}`) }
    }
    startTransition(async () => {
      const result = await onSave(answers, complete)
      if (!result.ok) return setError(result.error || "Could not save your answers.")
      if (complete) onClose?.()
    })
  }

  function editQuestion(question: MaterialQuestion, index: number) {
    setStep(index)
    setReviewing(false)
    setError(null)
    window.requestAnimationFrame(() => document.getElementById(`question-${question.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }))
  }

  function renderQuestion(question: MaterialQuestion, index: number) {
    const hasError = errorQuestionId === question.id
    const singleSpecification = configurator && question.question_type === "single_select" && question.options.length === 1
    if (singleSpecification) {
      return (
        <div key={question.id} id={`question-${question.id}`} className="flex min-h-12 scroll-mt-28 flex-col items-start justify-between gap-2 border-b border-slate-100 py-3 last:border-b-0 sm:flex-row sm:items-center sm:gap-4">
          <p className="text-sm font-semibold text-slate-600">{question.label}</p>
          <span className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 text-sm font-bold text-slate-950"><Check className="h-3.5 w-3.5 text-[#0071e3]" aria-hidden="true" />{question.options[0].label}</span>
        </div>
      )
    }
    return (
      <fieldset
        key={question.id}
        id={`question-${question.id}`}
        className={`${compact ? "scroll-mt-28 py-4 first:pt-0 last:pb-0" : "scroll-mt-24 pb-7"} min-w-0 border-b border-slate-100 last:border-b-0`}
        aria-describedby={question.help_text ? `question-help-${question.id}` : undefined}
      >
        {!compact ? <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0071e3]">Question {index + 1}</p> : null}
        <div className="flex items-start gap-3">
          {question.configuration.imageUrl ? <span role="img" aria-label="" className="h-12 w-12 shrink-0 rounded-lg border border-slate-200 bg-white bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${question.configuration.imageUrl})`, backgroundPosition: question.configuration.imagePosition, backgroundSize: question.configuration.imageSprite ? "400% 200%" : undefined }} /> : null}
          <legend className={`${compact ? "text-sm" : "mt-1 text-lg sm:text-xl"} font-bold leading-tight text-slate-950`}>
            {question.label}{question.is_required ? <span aria-hidden="true" className="text-rose-500"> *</span> : null}
          </legend>
        </div>
        {question.help_text ? <p id={`question-help-${question.id}`} className={`${compact ? "mt-1 text-xs leading-5" : "mt-2 text-sm leading-6"} text-slate-600`}>{question.help_text}</p> : null}
        <div className={compact ? "mt-2.5" : "mt-4"}>
          <QuestionControl
            question={question}
            value={answerForQuestion(question, answers)}
            onChange={(value, autoAdvance) => update(question.id, value, autoAdvance)}
            disabled={locked}
            onUpload={onUpload}
            compact={compact}
          />
        </div>
        {hasError ? <p role="alert" className="mt-2 text-xs font-semibold text-rose-700">This field is required.</p> : null}
      </fieldset>
    )
  }

  const summaryRows = answeredQuestions

  const content = (
    <section className={`${embedded ? "w-full" : "max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-[24px] border border-white/70 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.32)]"}`} aria-label={`${snapshot.category.name} material questions`}>
      <header className={`border-b border-slate-100 bg-white ${configurator ? "px-4 py-4 sm:px-6 sm:py-5" : compact ? "px-4 py-3 sm:px-5" : "px-5 py-4 sm:px-7"}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0066cc]">{configurator ? "Contractor order builder" : "Material order details"}</p>
            <h2 className="mt-1 text-xl font-bold text-slate-950 sm:text-2xl">{snapshot.category.name}</h2>
            {configurator ? <p className="mt-1 max-w-2xl text-sm leading-5 text-slate-600">Set the material specifications, quantity, and jobsite accessories.</p> : requireCompletion ? <p className="mt-1 text-xs font-semibold text-slate-500">Required to complete this department request</p> : null}
          </div>
          {onClose && !requireCompletion ? <button type="button" onClick={onClose} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:border-slate-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-100" aria-label="Close questionnaire"><X className="h-5 w-5" /></button> : null}
        </div>
        {!reviewing ? configurator ? (
          <div className="mt-4 flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100" aria-hidden="true"><div className="h-full rounded-full bg-[#0071e3] transition-[width] motion-reduce:transition-none" style={{ width: `${completionPercent}%` }} /></div>
            <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-500">{answeredQuestions.length}/{visibleQuestions.length} answered</span>
          </div>
        ) : showAllQuestions ? <p className="mt-3 text-xs font-semibold text-slate-500">{visibleQuestions.length} questions</p> : <div className="mt-4"><div className="flex justify-between text-xs font-semibold text-slate-500"><span>Question {Math.min(step + 1, visibleQuestions.length)} of {visibleQuestions.length}</span><span>{Math.round(progress)}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#0071e3] transition-[width] motion-reduce:transition-none" style={{ width: `${progress}%` }} /></div></div> : null}
      </header>

      <div className={`${embedded ? "" : "max-h-[62vh] overflow-y-auto"} ${configurator ? "p-0" : compact ? "px-4 py-4 sm:px-5" : "px-5 py-6 sm:px-7"}`}>
        {reviewing ? (
          <div className={configurator ? "px-4 py-5 sm:px-6" : ""}>
            <div className="mb-5"><h3 className="text-xl font-bold text-slate-950">Review Your Request</h3><p className="mt-1 text-sm text-slate-600">Check the details before choosing a project.</p></div>
            <div className="grid gap-5">
              {questionGroups.map((group) => (
                <section key={group.id}>
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{group.title}</h4>
                  <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                    {group.questions.map((question) => {
                      const index = visibleQuestions.findIndex((entry) => entry.id === question.id)
                      return <button key={question.id} type="button" onClick={() => editQuestion(question, index)} className="flex min-h-14 w-full items-start justify-between gap-4 border-b border-slate-100 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400"><span className="min-w-0"><span className="block text-xs font-semibold text-slate-500">{question.label}</span><span className="mt-0.5 block break-words text-sm font-bold text-slate-950">{formatMaterialAnswer(question, answerForQuestion(question, answers)) || "Not answered"}</span></span><Pencil className="mt-1 h-4 w-4 shrink-0 text-[#0071e3]" aria-hidden="true" /></button>
                    })}
                  </div>
                </section>
              ))}
            </div>
          </div>
        ) : showAllQuestions ? configurator ? (
          <div className="grid items-start lg:grid-cols-[minmax(0,1fr)_19rem]">
            <div className="min-w-0 px-4 pb-24 sm:px-6 sm:pb-24 lg:pb-6 lg:pr-8">
              {questionGroups.map((group, groupIndex) => (
                <section key={group.id} data-testid={`flooring-group-${group.id}`} className="border-b border-slate-200 py-5 last:border-b-0 sm:py-6">
                  <div className="mb-1 flex items-center gap-3">
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white">{groupIndex + 1}</span>
                    <div><h3 className="text-base font-bold text-slate-950">{group.title}</h3><p className="mt-0.5 text-xs leading-5 text-slate-500">{group.description}</p></div>
                  </div>
                  <div className="ml-0 mt-3 sm:ml-10">{group.questions.map((question) => renderQuestion(question, visibleQuestions.findIndex((entry) => entry.id === question.id)))}</div>
                </section>
              ))}
              {error ? <div aria-live="polite" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">{error}</div> : null}
            </div>

            <aside className="sticky top-24 hidden border-l border-slate-100 bg-slate-50/70 p-5 lg:block" data-testid="flooring-order-summary">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0066cc]">Request Summary</p>
              <div className="mt-3 flex items-end justify-between gap-3"><p className="text-2xl font-bold tabular-nums text-slate-950">{completionPercent}%</p><p className="text-xs font-semibold text-slate-500">{requiredAnswered}/{requiredQuestions.length} required</p></div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-[#0071e3] transition-[width] motion-reduce:transition-none" style={{ width: `${completionPercent}%` }} /></div>
              {quantityLabel ? <div className="mt-5 rounded-lg border border-sky-100 bg-white px-4 py-3"><p className="text-xs font-semibold text-slate-500">Requested Quantity</p><p className="mt-1 text-lg font-bold tabular-nums text-slate-950">{quantityLabel}</p></div> : null}
              <dl className="mt-5 grid gap-3">
                {summaryRows.map((question) => <div key={question.id} className="min-w-0"><dt className="truncate text-xs font-semibold text-slate-500">{question.label}</dt><dd className="mt-0.5 break-words text-sm font-bold text-slate-950">{formatMaterialAnswer(question, answerForQuestion(question, answers))}</dd></div>)}
              </dl>
              {!summaryRows.length ? <p className="mt-5 text-sm leading-6 text-slate-500">Your selections will appear here as you build the request.</p> : null}
              <button type="button" onClick={reviewAll} className="mt-6 inline-flex min-h-12 w-full touch-manipulation items-center justify-center gap-1 rounded-lg bg-slate-950 px-5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-200">Review Request<ChevronRight className="h-4 w-4" aria-hidden="true" /></button>
            </aside>

            <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.8rem)] left-1/2 z-40 flex min-h-16 w-[calc(100%-1.5rem)] max-w-[30rem] -translate-x-1/2 items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 shadow-[0_14px_38px_rgba(15,23,42,0.18)] backdrop-blur-lg lg:hidden" data-testid="flooring-mobile-summary">
              <div className="min-w-0"><p className="truncate text-sm font-bold text-slate-950">{quantityLabel || `${answeredQuestions.length} selections`}</p><p className="text-xs font-semibold tabular-nums text-slate-500">{requiredAnswered}/{requiredQuestions.length} required answered</p></div>
              <button type="button" onClick={reviewAll} className="inline-flex min-h-11 shrink-0 touch-manipulation items-center justify-center gap-1 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-200">Review<ChevronRight className="h-4 w-4" aria-hidden="true" /></button>
            </div>
          </div>
        ) : <div className={compact ? "grid gap-4" : "grid gap-7"}>{visibleQuestions.map(renderQuestion)}</div> : current ? <div><h3 className="text-[1.35rem] font-bold leading-tight text-slate-950 sm:text-2xl">{current.label}{current.is_required ? <span className="text-rose-500"> *</span> : null}</h3>{current.help_text ? <p className="mt-2 text-sm leading-6 text-slate-600">{current.help_text}</p> : null}<div className="mt-5"><QuestionControl question={current} value={answerForQuestion(current, answers)} onChange={(value, autoAdvance) => update(current.id, value, autoAdvance)} disabled={locked} onUpload={onUpload} /></div></div> : <p className="text-sm text-slate-600">No active questions are configured.</p>}
        {!configurator && error ? <div aria-live="polite" className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">{error}</div> : null}
      </div>

      {!locked && (!configurator || reviewing) ? <footer className="grid gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:grid-cols-[auto_1fr_auto] sm:px-7"><button type="button" onClick={() => reviewing ? setReviewing(false) : setStep((value) => Math.max(0, value - 1))} disabled={!reviewing && (showAllQuestions || step === 0)} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 disabled:opacity-40"><ChevronLeft className="h-4 w-4" aria-hidden="true" />Back</button>{onSave && !requireCompletion ? <button type="button" disabled={isPending} onClick={() => save(false)} className="min-h-11 rounded-lg px-4 text-sm font-semibold text-slate-600 hover:bg-white">Answer Later</button> : <span />}{reviewing ? <button type="button" disabled={isPending} onClick={() => save(true)} className="min-h-11 rounded-lg bg-[#0071e3] px-5 text-sm font-semibold text-white disabled:opacity-50">{isPending ? "Saving…" : configurator ? "Choose Project" : "Save & Finish"}</button> : showAllQuestions ? <button type="button" onClick={reviewAll} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg bg-slate-950 px-5 text-sm font-semibold text-white">Review Answers<ChevronRight className="h-4 w-4" aria-hidden="true" /></button> : <button type="button" onClick={next} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg bg-slate-950 px-5 text-sm font-semibold text-white">{step >= visibleQuestions.length - 1 ? "Review" : "Next"}<ChevronRight className="h-4 w-4" aria-hidden="true" /></button>}</footer> : null}
    </section>
  )

  if (embedded) return content
  return <div className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-950/50 px-3 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-8 backdrop-blur-sm sm:items-center sm:p-6">{content}</div>
}
