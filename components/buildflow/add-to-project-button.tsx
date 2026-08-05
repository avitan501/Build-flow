"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import {
  addCatalogItemToProjectAction,
  getAddToProjectOptionsAction,
  saveQuoteAttachmentRecordAction,
  saveQuoteItemAnswersAction,
} from "@/app/projects/quote-request-actions"
import type { ShopCatalogProduct } from "@/lib/shop-catalog"
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
}

type Options = {
  userId: string
  projects: Array<{ id: string; name: string; address: string | null }>
  drafts: Array<{ id: string; projectId: string; title: string }>
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function AddToProjectButton({ product, quantity = 1, className = "", compact = false, label = "Add to Project", file = null, questions: questionOverride }: AddToProjectButtonProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<Options | null>(null)
  const [projectId, setProjectId] = useState("")
  const [requestChoice, setRequestChoice] = useState("new")
  const [requestTitle, setRequestTitle] = useState(`${product.category} request`)
  const [created, setCreated] = useState<{ projectId: string; requestId: string; itemId: string } | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const qualification = useMemo(() => getQualificationSettingForProduct(product), [product])
  const questions = questionOverride ?? (qualification.enabled ? qualification.questions : [])
  const projectDrafts = options?.drafts.filter((draft) => draft.projectId === projectId) ?? []

  useEffect(() => {
    if (typeof window === "undefined") return
    if (window.sessionStorage.getItem(PENDING_PRODUCT_KEY) === product.id) {
      window.sessionStorage.removeItem(PENDING_PRODUCT_KEY)
      void begin()
    }
    // Run only when this product is mounted after returning from authentication.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id])

  async function begin() {
    setOpen(true)
    setError(null)
    setCreated(null)
    const result = await getAddToProjectOptionsAction()
    if (!result.ok) {
      if (result.authRequired) {
        window.sessionStorage.setItem(PENDING_PRODUCT_KEY, product.id)
        const query = searchParams.toString()
        const next = `${pathname}${query ? `?${query}` : ""}`
        router.push(`/login?next=${encodeURIComponent(next)}`)
        return
      }
      setError(result.error)
      return
    }
    setOptions(result.data)
    const firstProject = result.data.projects[0]
    setProjectId(firstProject?.id ?? "")
  }

  function addItem() {
    if (!projectId) {
      setError("Choose a project first.")
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await addCatalogItemToProjectAction({
        projectId,
        requestId: requestChoice === "new" ? undefined : requestChoice,
        requestTitle,
        product: {
          id: product.id,
          name: product.name,
          department: product.category,
          itemType: file ? "file_upload" : product.productType === "service" ? "service" : product.price <= 0 ? "custom_priced" : "material",
          quantity,
          unit: product.unit,
          unitPrice: product.price,
          requiredQuestionIds: questions.filter((question) => question.required).map((question) => question.id),
        },
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      if (file && options) {
        const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-|-$/g, "") || "upload"
        const filePath = `${options.userId}/${projectId}/${crypto.randomUUID()}-${safeName}`
        const supabase = createClient()
        const { error: uploadError } = await supabase.storage.from("project-uploads").upload(filePath, file, { upsert: false })
        if (uploadError) {
          setError(`Item added, but the file upload failed: ${uploadError.message}`)
        } else {
          const attachmentResult = await saveQuoteAttachmentRecordAction({
            ...result.data,
            projectId,
            fileName: file.name,
            filePath,
            fileType: file.type,
            fileSize: file.size,
          })
          if (!attachmentResult.ok) setError(attachmentResult.error)
        }
      }
      setCreated({ projectId, ...result.data })
      router.refresh()
    })
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
      router.refresh()
      if (!skipped || questions.length === 0) setOpen(false)
    })
  }

  const buttonClass = compact
    ? `inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0071e3] text-white shadow-[0_10px_20px_rgba(0,113,227,0.24)] transition hover:bg-[#0066cc] ${className}`
    : `inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#0071e3] px-5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(0,113,227,0.22)] transition hover:bg-[#0066cc] ${className}`

  return (
    <>
      <button type="button" onClick={() => void begin()} className={buttonClass} aria-label={`${label}: ${product.name}`}>
        <PlusIcon />
        {compact ? null : <span>{label}</span>}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/45 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-8 backdrop-blur-sm sm:items-center sm:p-6">
          <section role="dialog" aria-modal="true" aria-labelledby={`add-project-${product.id}`} className="max-h-[90vh] w-full max-w-lg overflow-hidden rounded-[24px] border border-white/70 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.3)]">
            <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0066cc]">Add to Project</p>
                <h2 id={`add-project-${product.id}`} className="mt-1 truncate text-xl font-semibold text-slate-950">{product.name}</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-xl text-slate-500" aria-label="Close">
                ×
              </button>
            </header>

            <div className="max-h-[66vh] overflow-y-auto px-5 py-5">
              {!options && !error ? <p className="text-sm text-slate-600">Loading your projects...</p> : null}

              {options && options.projects.length === 0 ? (
                <div className="rounded-[20px] border border-sky-100 bg-sky-50 p-4">
                  <h3 className="font-semibold text-slate-950">Create a project first</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">A project keeps the request, answers, and files together.</p>
                  <Link href={`/projects/new?next=${encodeURIComponent(pathname)}`} className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white">New Project</Link>
                </div>
              ) : null}

              {options && options.projects.length > 0 && !created ? (
                <div className="grid gap-4">
                  <label className="grid gap-2 text-sm font-semibold text-slate-900">
                    Project
                    <select value={projectId} onChange={(event) => { setProjectId(event.target.value); setRequestChoice("new") }} className="min-h-12 rounded-2xl border border-slate-300 bg-white px-4 text-base">
                      {options.projects.map((project) => <option key={project.id} value={project.id}>{project.name}{project.address ? ` - ${project.address}` : ""}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-slate-900">
                    Quote Request
                    <select value={requestChoice} onChange={(event) => setRequestChoice(event.target.value)} className="min-h-12 rounded-2xl border border-slate-300 bg-white px-4 text-base">
                      <option value="new">Start a new request</option>
                      {projectDrafts.map((draft) => <option key={draft.id} value={draft.id}>Add to: {draft.title}</option>)}
                    </select>
                  </label>
                  {requestChoice === "new" ? (
                    <label className="grid gap-2 text-sm font-semibold text-slate-900">
                      Request name
                      <input value={requestTitle} onChange={(event) => setRequestTitle(event.target.value)} className="min-h-12 rounded-2xl border border-slate-300 px-4 text-base" />
                    </label>
                  ) : null}
                  <button type="button" disabled={isPending} onClick={addItem} className="inline-flex min-h-12 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white disabled:opacity-50">
                    {isPending ? "Adding..." : "Add to Project"}
                  </button>
                </div>
              ) : null}

              {created ? (
                <div className="grid gap-4">
                  <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
                    Added to the project. Complete these details now or return before submitting.
                  </div>
                  {questions.length > 0 ? questions.map((question) => (
                    <label key={question.id} className="grid gap-2 text-sm font-semibold text-slate-900">
                      <span>{question.label}{question.required ? <span className="text-rose-500"> *</span> : null}</span>
                      <QuestionInput question={question} value={answers[question.id] || ""} onChange={(value) => setAnswers((current) => ({ ...current, [question.id]: value }))} />
                    </label>
                  )) : <p className="text-sm text-slate-600">No additional questions are required.</p>}
                  <div className="grid gap-2 sm:grid-cols-2">
                    {questions.length > 0 ? <button type="button" disabled={isPending} onClick={() => finishAnswers(true)} className="min-h-11 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700">Answer later</button> : null}
                    <button type="button" disabled={isPending} onClick={() => finishAnswers(false)} className="min-h-11 rounded-full bg-[#0071e3] px-4 text-sm font-semibold text-white disabled:opacity-50">
                      {questions.length > 0 ? "Save Answers" : "Done"}
                    </button>
                  </div>
                  <Link href={`/projects/${created.projectId}`} className="text-center text-sm font-semibold text-[#0066cc]">Open project</Link>
                </div>
              ) : null}

              {error ? <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div> : null}
            </div>
          </section>
        </div>
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
