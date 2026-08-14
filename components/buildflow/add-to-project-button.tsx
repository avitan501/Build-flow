"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import { createPortal } from "react-dom"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import {
  addCatalogItemToProjectAction,
  getAddToProjectOptionsAction,
  saveMaterialQuestionnaireResponseAction,
  saveQuoteAttachmentRecordAction,
  saveQuoteItemAnswersAction,
} from "@/app/projects/quote-request-actions"
import type { ShopCatalogProduct } from "@/lib/shop-catalog"
import { MaterialQuestionnaireWizard } from "@/components/buildflow/material-questionnaire-wizard"
import type { MaterialAnswerValue, MaterialQuestion, MaterialQuestionnaireResponse, MaterialRequestAnswer } from "@/lib/material-questionnaires"
import { createClient } from "@/lib/supabase/client"
import { getQualificationSettingForProduct, type QualifyingQuestion } from "@/lib/shop-qualification"

const PENDING_PRODUCT_KEY = "avantia-pending-project-product"

type AddToProjectButtonProps = {
  product: Pick<ShopCatalogProduct, "id" | "name" | "category" | "productType" | "price" | "unit">
  quantity?: number
  className?: string
  compact?: boolean
  label?: string
  file?: File | null
  questions?: QualifyingQuestion[]
  details?: string
  questionnaireDepartment?: string
  materialAnswers?: Record<string, MaterialAnswerValue>
  onAdded?: () => void
  autoOpen?: boolean
}

type Options = {
  userId: string
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function AddToProjectButton({ product, quantity = 1, className = "", compact = false, label = "Request Item", file = null, questions: questionOverride, details, questionnaireDepartment, materialAnswers, onAdded, autoOpen = false }: AddToProjectButtonProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<Options | null>(null)
  const [created, setCreated] = useState<{ projectId: string; requestId: string; itemId: string; materialResponse: MaterialQuestionnaireResponse | null; materialAnswers: MaterialRequestAnswer[] } | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [questionnaireCompleted, setQuestionnaireCompleted] = useState(false)
  const [authRequired, setAuthRequired] = useState(false)
  const autoOpened = useRef(false)
  const [isPending, startTransition] = useTransition()
  const qualification = useMemo(() => getQualificationSettingForProduct(product), [product])
  const questions = questionOverride ?? (qualification.enabled ? qualification.questions : [])

  useEffect(() => {
    if (typeof window === "undefined") return
    let shouldBegin = false
    if (window.sessionStorage.getItem(PENDING_PRODUCT_KEY) === product.id) {
      window.sessionStorage.removeItem(PENDING_PRODUCT_KEY)
      shouldBegin = true
    }
    if (autoOpen && !autoOpened.current) {
      autoOpened.current = true
      shouldBegin = true
    }
    if (shouldBegin) void begin()
    // Run only when this product is mounted after returning from authentication.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen, product.id])

  async function begin() {
    setOpen(true)
    setOptions(null)
    setError(null)
    setCreated(null)
    setQuestionnaireCompleted(false)
    setAuthRequired(false)
    const result = await getAddToProjectOptionsAction()
    if (!result.ok) {
      if (result.authRequired) {
        window.sessionStorage.setItem(PENDING_PRODUCT_KEY, product.id)
        setAuthRequired(true)
        return
      }
      setError(result.error)
      return
    }
    setOptions(result.data)
    addItem(result.data)
  }

  function addItem(context: Options) {
    if (file && file.size > 25 * 1024 * 1024) {
      setError("The attachment is larger than 25 MB. Choose a smaller file.")
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await addCatalogItemToProjectAction({
        requestId: undefined,
        requestTitle: `${product.category} request`,
        product: {
          id: product.id,
          name: product.name,
          department: product.category,
          itemType: file ? "file_upload" : product.productType === "service" ? "service" : product.price <= 0 ? "custom_priced" : "material",
          quantity,
          unit: product.unit,
          unitPrice: product.price,
          requiredQuestionIds: questions.filter((question) => question.required).map((question) => question.id),
          details,
          questionnaireDepartment,
        },
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      if (file) {
        const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-|-$/g, "") || "upload"
        const filePath = `${context.userId}/${result.data.projectId}/${crypto.randomUUID()}-${safeName}`
        const supabase = createClient()
        const { error: uploadError } = await supabase.storage.from("project-uploads").upload(filePath, file, { upsert: false })
        if (uploadError) {
          setError(`Item added, but the file upload failed: ${uploadError.message}`)
        } else {
          const attachmentResult = await saveQuoteAttachmentRecordAction({
            ...result.data,
            fileName: file.name,
            filePath,
            fileType: file.type,
            fileSize: file.size,
            materialResponseId: result.data.materialResponse?.id,
          })
          if (!attachmentResult.ok) setError(attachmentResult.error)
        }
      }
      if (materialAnswers && result.data.materialResponse) {
        const answersResult = await saveMaterialQuestionnaireResponseAction({
          projectId: result.data.projectId,
          requestId: result.data.requestId,
          responseId: result.data.materialResponse.id,
          answers: materialAnswers,
          complete: true,
        })
        if (!answersResult.ok) {
          setError(answersResult.error)
          setCreated(result.data)
          return
        }
        setQuestionnaireCompleted(true)
        onAdded?.()
      }
      if (!result.data.materialResponse && questions.length === 0) {
        const finishResult = await saveQuoteItemAnswersAction({ ...result.data, answers: [] })
        if (!finishResult.ok) {
          setError(finishResult.error)
          setCreated(result.data)
          return
        }
        setQuestionnaireCompleted(true)
        onAdded?.()
      }
      setCreated(result.data)
      router.refresh()
    })
  }

  async function saveMaterialAnswers(nextAnswers: Record<string, MaterialAnswerValue>, complete: boolean) {
    if (!created?.materialResponse) return { ok: false, error: "Questionnaire not found." }
    const result = await saveMaterialQuestionnaireResponseAction({
      projectId: created.projectId,
      requestId: created.requestId,
      responseId: created.materialResponse.id,
      answers: nextAnswers,
      complete,
    })
    if (result.ok) {
      router.refresh()
      if (!complete) setOpen(false)
    }
    return result.ok ? { ok: true } : { ok: false, error: result.error }
  }

  async function uploadQuestionFiles(_question: MaterialQuestion, files: File[]) {
    if (!created?.materialResponse || !options) return { ok: false, error: "Questionnaire upload is not ready." }
    const attachmentIds: string[] = []
    for (const upload of files) {
      if (upload.size > 25 * 1024 * 1024) return { ok: false, error: `${upload.name} is larger than 25 MB.` }
      const safeName = upload.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-|-$/g, "") || "upload"
      const filePath = `${options.userId}/${created.projectId}/${crypto.randomUUID()}-${safeName}`
      const supabase = createClient()
      const { error: uploadError } = await supabase.storage.from("project-uploads").upload(filePath, upload, { upsert: false })
      if (uploadError) return { ok: false, error: `Could not upload ${upload.name}: ${uploadError.message}` }
      const record = await saveQuoteAttachmentRecordAction({
        projectId: created.projectId,
        requestId: created.requestId,
        itemId: created.itemId,
        materialResponseId: created.materialResponse.id,
        fileName: upload.name,
        filePath,
        fileType: upload.type,
        fileSize: upload.size,
      })
      if (!record.ok) return { ok: false, error: record.error }
      attachmentIds.push(record.data.id)
    }
    return { ok: true, attachmentIds }
  }

  function finishAnswers(skipped = false) {
    if (!created) return
    setError(null)
    const formatted = questions
      .map((question) => ({ questionId: question.id, label: question.label, value: answers[question.id]?.trim() || "" }))
      .filter((answer) => answer.value)
    startTransition(async () => {
      const result = await saveQuoteItemAnswersAction({ ...created, answers: formatted, skipped })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setAnswers({})
      setQuestionnaireCompleted(true)
      onAdded?.()
      router.refresh()
    })
  }

  function saveRequiredAnswers() {
    const missing = questions.find((question) => question.required && !answers[question.id]?.trim())
    if (missing) {
      setError(`Please answer: ${missing.label}`)
      return
    }
    finishAnswers(false)
  }

  const buttonClass = compact
    ? `inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0071e3] text-white shadow-[0_10px_20px_rgba(0,113,227,0.24)] transition hover:bg-[#0066cc] ${className}`
    : `inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#0071e3] px-5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(0,113,227,0.22)] transition hover:bg-[#0066cc] ${className}`
  const currentQuery = searchParams.toString()
  const returnPath = `${pathname}${currentQuery ? `?${currentQuery}` : ""}`

  return (
    <>
      <button type="button" onClick={() => void begin()} className={buttonClass} aria-label={`${label}: ${product.name}`}>
        <PlusIcon />
        {compact ? null : <span>{label}</span>}
      </button>

      {open && typeof document !== "undefined" ? createPortal((
        <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-sm sm:p-6">
          <section role="dialog" aria-modal="true" aria-labelledby={`add-project-${product.id}`} className="max-h-[min(90dvh,48rem)] w-full max-w-md overflow-hidden rounded-[22px] border border-white/70 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.3)]">
            <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0066cc]">{authRequired ? "Continue Request" : created ? "Request Ready" : "Submitting Request"}</p>
                <h2 id={`add-project-${product.id}`} className="mt-1 truncate text-xl font-semibold text-slate-950">{product.name}</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-xl text-slate-500" aria-label="Close">
                ×
              </button>
            </header>

            <div className="max-h-[min(72dvh,38rem)] overflow-x-hidden overflow-y-auto px-5 py-5">
              {!options && !error && !authRequired ? <p className="text-sm text-slate-600">Preparing your request...</p> : null}

              {authRequired ? (
                <div className="grid gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-950">Sign in to send your request</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">Your answers are saved on this device. After signing in, the request will continue automatically.</p>
                  </div>
                  <Link href={`/login?next=${encodeURIComponent(returnPath)}`} className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#0071e3] px-5 text-sm font-semibold text-white hover:bg-[#0066cc]">Log in</Link>
                  <Link href={`/signup?next=${encodeURIComponent(returnPath)}`} className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 hover:border-slate-500">Create account</Link>
                </div>
              ) : null}

              {options && !created && isPending ? <div className="rounded-[20px] border border-sky-100 bg-sky-50 px-4 py-5 text-center text-sm font-semibold text-sky-900">Saving your request...</div> : null}

              {created && !created.materialResponse && !questionnaireCompleted ? (
                <div className="grid gap-4">
                  <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
                    Request created. Add the remaining details to send it.
                  </div>
                  {questions.length > 0 ? questions.map((question) => (
                    <label key={question.id} className="grid gap-2 text-sm font-semibold text-slate-900">
                      <span>{question.label}{question.required ? <span className="text-rose-500"> *</span> : null}</span>
                      <QuestionInput question={question} value={answers[question.id] || ""} onChange={(value) => setAnswers((current) => ({ ...current, [question.id]: value }))} />
                    </label>
                  )) : <p className="text-sm text-slate-600">No additional questions are required.</p>}
                  <div className="grid gap-2 sm:grid-cols-2">
                    {questions.length > 0 ? <p className="self-center text-center text-xs font-semibold text-slate-500 sm:text-left">Required before this request can be submitted.</p> : null}
                    <button type="button" disabled={isPending} onClick={saveRequiredAnswers} className="min-h-11 rounded-full bg-[#0071e3] px-4 text-sm font-semibold text-white disabled:opacity-50">
                      {questions.length > 0 ? "Save Answers" : "Done"}
                    </button>
                  </div>
                  <Link href={`/projects/${created.projectId}/requests/${created.requestId}`} className="text-center text-sm font-semibold text-[#0066cc]">View request</Link>
                </div>
              ) : null}

              {created && questionnaireCompleted ? (
                <div className="grid gap-4">
                  <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
                    {`Your ${product.category} request was created. Someone from Avantia Build will get back to you within 24 hours.`}
                  </div>
                  <Link href={`/projects/${created.projectId}/requests/${created.requestId}`} className="text-center text-sm font-semibold text-[#0066cc]">View request</Link>
                </div>
              ) : null}

              {error ? <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div> : null}
            </div>
          </section>
        </div>
      ), document.body) : null}
      {open && created?.materialResponse && !questionnaireCompleted ? (
        <MaterialQuestionnaireWizard
          snapshot={created.materialResponse.definition_snapshot}
          displayMode={created.materialResponse.definition_snapshot.category.department_key === "Wood Floor" ? "all" : "steps"}
          initialAnswers={Object.fromEntries(created.materialAnswers.map((answer) => [answer.question_id || answer.question_key, answer.answer_value]))}
          onClose={() => setOpen(false)}
          requireCompletion
          onSave={saveMaterialAnswers}
          onUpload={uploadQuestionFiles}
        />
      ) : null}
    </>
  )
}

function QuestionInput({ question, value, onChange }: { question: QualifyingQuestion; value: string; onChange: (value: string) => void }) {
  if (question.type === "textarea") return <textarea rows={4} value={value} onChange={(event) => onChange(event.target.value)} className="rounded-2xl border border-slate-300 px-4 py-3 text-base" />
  if (question.type === "select") {
    return (
      <select value={value} onChange={(event) => onChange(event.target.value)} className="min-h-12 rounded-2xl border border-slate-300 bg-white px-4 text-base">
        <option value="">Choose one</option>
        {(question.options ?? []).map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    )
  }
  return <input value={value} onChange={(event) => onChange(event.target.value)} className="min-h-12 rounded-2xl border border-slate-300 px-4 text-base" />
}
