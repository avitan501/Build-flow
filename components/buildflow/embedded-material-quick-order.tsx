"use client"

import { CheckCircle2, ExternalLink, FileImage, Pencil, X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { AddToProjectButton } from "@/components/buildflow/add-to-project-button"
import { MaterialQuestionnaireWizard } from "@/components/buildflow/material-questionnaire-wizard"
import { formatMaterialAnswer, hasMaterialAnswer, type MaterialAnswerValue, type MaterialQuestionnaireSnapshot } from "@/lib/material-questionnaires"

const MATERIAL_DRAFT_KEY = "avantia-material-order-draft"

type StoredDraft = {
  version: 1
  answers: Record<string, MaterialAnswerValue>
  complete: boolean
}

export function EmbeddedMaterialQuickOrder({ snapshot, category, displayCategory, requestId }: {
  snapshot: MaterialQuestionnaireSnapshot
  category: string
  displayCategory: string
  requestId: string
}) {
  const [draftAnswers, setDraftAnswers] = useState<Record<string, MaterialAnswerValue>>({})
  const [completedAnswers, setCompletedAnswers] = useState<Record<string, MaterialAnswerValue> | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [referenceFile, setReferenceFile] = useState<File | null>(null)
  const allowsReferencePhoto = category === "Door and molding"
  const requestTypeQuestion = snapshot.questions.find((question) => question.question_key === "request_type")
  const hasReferenceSelection = !requestTypeQuestion || hasMaterialAnswer(draftAnswers[requestTypeQuestion.id] ?? draftAnswers[requestTypeQuestion.question_key])

  useEffect(() => {
    let parsed: StoredDraft | null = null
    try {
      const stored = window.sessionStorage.getItem(`${MATERIAL_DRAFT_KEY}:${requestId}`)
      if (stored) {
        const candidate = JSON.parse(stored) as StoredDraft
        if (candidate.version === 1) parsed = candidate
        else window.sessionStorage.removeItem(`${MATERIAL_DRAFT_KEY}:${requestId}`)
      }
    } catch {
      window.sessionStorage.removeItem(`${MATERIAL_DRAFT_KEY}:${requestId}`)
    }
    const frame = window.requestAnimationFrame(() => {
      if (parsed) {
        setDraftAnswers(parsed.answers ?? {})
        if (parsed.complete) setCompletedAnswers(parsed.answers ?? {})
      }
      setHydrated(true)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [requestId])

  const completedRows = useMemo(() => completedAnswers ? snapshot.questions
    .map((question) => ({ question, value: completedAnswers[question.id] ?? completedAnswers[question.question_key] }))
    .filter(({ value }) => hasMaterialAnswer(value)) : [], [completedAnswers, snapshot.questions])

  function storeDraft(answers: Record<string, MaterialAnswerValue>, complete: boolean) {
    setDraftAnswers(answers)
    window.sessionStorage.setItem(`${MATERIAL_DRAFT_KEY}:${requestId}`, JSON.stringify({ version: 1, answers, complete } satisfies StoredDraft))
  }

  function answersForProject(answers: Record<string, MaterialAnswerValue>) {
    return Object.fromEntries(snapshot.questions.map((question) => [question.question_key, answers[question.id] ?? answers[question.question_key]]))
  }

  if (completedAnswers) {
    return (
      <section className="overflow-hidden rounded-lg border border-emerald-200 bg-white shadow-sm">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_21rem]">
          <div className="p-5 sm:p-6">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><CheckCircle2 className="h-6 w-6" aria-hidden="true" /></span>
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">Request Ready</p>
            <h2 className="mt-1 text-xl font-bold text-slate-950">Confirm This {displayCategory} Request</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Your selections are saved on this device. Confirm to connect the request to your account and project.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <AddToProjectButton
                product={{ id: `${requestId}-quick-order`, name: `${displayCategory} Quick Order`, category, productType: "service", price: 0, unit: "Request" }}
                questionnaireDepartment={category}
                materialAnswers={answersForProject(completedAnswers)}
                file={referenceFile}
                label="Confirm Request"
                autoOpen
                onAdded={() => window.sessionStorage.removeItem(`${MATERIAL_DRAFT_KEY}:${requestId}`)}
              />
              <button type="button" onClick={() => { setCompletedAnswers(null); storeDraft(completedAnswers, false) }} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 hover:border-slate-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-100"><Pencil className="h-4 w-4" aria-hidden="true" />Edit Selections</button>
            </div>
            {referenceFile ? <p className="mt-3 text-sm font-semibold text-slate-600">Reference attached: {referenceFile.name}</p> : null}
          </div>
          <div className="border-t border-emerald-100 bg-emerald-50/60 p-5 lg:border-l lg:border-t-0">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-800">Order Summary</p>
            <dl className="mt-4 grid gap-3">
              {completedRows.map(({ question, value }) => <div key={question.id}><dt className="text-xs font-semibold text-slate-500">{question.label}</dt><dd className="mt-0.5 break-words text-sm font-bold text-slate-950">{formatMaterialAnswer(question, value)}</dd></div>)}
            </dl>
          </div>
        </div>
      </section>
    )
  }

  if (!hydrated) {
    return <section className="min-h-72 animate-pulse rounded-lg border border-slate-200 bg-white" aria-label={`Loading ${displayCategory} order`} />
  }

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <MaterialQuestionnaireWizard
        snapshot={snapshot}
        initialAnswers={draftAnswers}
        displayMode="all"
        density="compact"
        configurator
        embedded
        requireCompletion
        onAnswersChange={(answers) => storeDraft(answers, false)}
        onSave={async (answers, complete) => {
          storeDraft(answers, complete)
          if (complete) setCompletedAnswers(answers)
          return { ok: true }
        }}
      />
      {allowsReferencePhoto && hasReferenceSelection ? <div className="grid gap-3 border-t border-slate-200 bg-slate-50 px-4 py-4 sm:grid-cols-[1fr_auto] sm:items-center sm:px-6">
        <div><p className="text-sm font-bold text-slate-950">Molding or door reference</p><p className="mt-1 text-xs leading-5 text-slate-500">Attach one photo, or enter a profile code in the questions above.</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <a href="https://www.gardenstatelumber.com/products-programs/moulding/" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700">Molding Catalog<ExternalLink className="h-4 w-4" /></a>
          {referenceFile ? <button type="button" onClick={() => setReferenceFile(null)} className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700"><span className="max-w-48 truncate">{referenceFile.name}</span><X className="h-4 w-4" /></button> : <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white"><FileImage className="h-4 w-4" />Add Photo<input type="file" accept="image/png,image/jpeg,image/webp,.pdf" className="sr-only" onChange={(event) => setReferenceFile(event.target.files?.[0] ?? null)} /></label>}
        </div>
      </div> : null}
    </section>
  )
}
