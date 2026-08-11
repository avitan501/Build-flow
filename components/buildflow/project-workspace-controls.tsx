"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { CircleHelp, Download, Eye, MessageSquareText, PencilLine, Plus, XCircle } from "lucide-react"

import {
  saveMaterialQuestionnaireResponseAction,
  saveQuoteAttachmentRecordAction,
  saveProjectAnswersAction,
  submitQuoteRequestAction,
  updateProjectAction,
  createClientRequestAction,
  type ClientRequestActionType,
} from "@/app/projects/quote-request-actions"
import { MaterialQuestionnaireWizard } from "@/components/buildflow/material-questionnaire-wizard"
import type { MaterialAnswerValue, MaterialQuestion, MaterialQuestionnaireResponse, MaterialRequestAnswer } from "@/lib/material-questionnaires"
import { createClient } from "@/lib/supabase/client"
import type { ProjectQuestionRecord, QuoteRequestStatus } from "@/lib/quote-requests"
import type { QualifyingQuestion } from "@/lib/shop-qualification"
import { saveQuoteItemAnswersAction } from "@/app/projects/quote-request-actions"

export function ExportRequestPdfButton() {
  function printRequest() {
    document.body.classList.add("request-printing")
    window.addEventListener("afterprint", () => document.body.classList.remove("request-printing"), { once: true })
    window.print()
    window.setTimeout(() => document.body.classList.remove("request-printing"), 1000)
  }

  return (
    <button type="button" onClick={printRequest} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 print:hidden">
      <Download className="h-4 w-4" aria-hidden="true" />
      Export PDF
    </button>
  )
}

const requestActionContent: Record<ClientRequestActionType, { title: string; description: string; placeholder: string; submit: string }> = {
  addon: {
    title: "Add an item",
    description: "Tell us what you want to add to this request, including the quantity and any size, brand, or specification.",
    placeholder: "Example: Add 20 pieces of 2x4x8 Douglas Fir",
    submit: "Send Add-On Request",
  },
  change: {
    title: "Request a change",
    description: "Tell us exactly what should be changed. Your current request will stay unchanged until our team reviews it.",
    placeholder: "What would you like to change?",
    submit: "Send Change Request",
  },
  question: {
    title: "Ask a question",
    description: "Send a question about pricing, availability, delivery, or any item in this request.",
    placeholder: "Write your question",
    submit: "Send Question",
  },
  cancel: {
    title: "Request cancellation",
    description: "Tell us why you want to cancel. We will confirm the cancellation before stopping any work.",
    placeholder: "Reason for cancellation",
    submit: "Request Cancellation",
  },
}

export function ProjectRequestActions({ projectId, requestId, status, compact = false, showView = true }: {
  projectId: string
  requestId: string
  status: QuoteRequestStatus
  compact?: boolean
  showView?: boolean
}) {
  const router = useRouter()
  const [action, setAction] = useState<ClientRequestActionType | null>(null)
  const [message, setMessage] = useState("")
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const detailsHref = `/projects/${projectId}/requests/${requestId}`

  function close() {
    if (isPending) return
    setAction(null)
    setMessage("")
    setError(null)
  }

  function submitAction() {
    if (!action) return
    startTransition(async () => {
      const result = await createClientRequestAction({ projectId, requestId, action, message })
      if (!result.ok) return setError(result.error)
      setFeedback(result.data.notification === "sent" ? "Sent to Avantia Build." : "Saved. Our team can see it in this request.")
      setAction(null)
      setMessage("")
      setError(null)
      router.refresh()
    })
  }

  const secondaryClass = "inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"

  return (
    <div className={compact ? "mt-4" : ""}>
      <div className="flex flex-wrap gap-2">
        {showView ? <Link href={detailsHref} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-slate-950 px-4 text-sm font-semibold text-white">
          <Eye className="h-4 w-4" aria-hidden="true" /> View Request
        </Link> : null}
        <button type="button" onClick={() => { setAction("addon"); setFeedback(null) }} className={secondaryClass}>
          <Plus className="h-4 w-4" aria-hidden="true" /> Add Item
        </button>
        {status !== "closed" ? <button type="button" onClick={() => { setAction("change"); setFeedback(null) }} className={secondaryClass}><PencilLine className="h-4 w-4" aria-hidden="true" /> Make Change</button> : null}
        <button type="button" onClick={() => { setAction("question"); setFeedback(null) }} className={secondaryClass}><CircleHelp className="h-4 w-4" aria-hidden="true" /> Ask Question</button>
        {status !== "closed" ? <button type="button" onClick={() => { setAction("cancel"); setFeedback(null) }} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full px-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"><XCircle className="h-4 w-4" aria-hidden="true" /> Cancel Request</button> : null}
      </div>
      {feedback ? <p className="mt-2 text-sm font-medium text-emerald-700" role="status">{feedback}</p> : null}

      {action ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/45 p-3 backdrop-blur-[2px] sm:items-center" role="dialog" aria-modal="true" aria-labelledby="client-request-action-title" onMouseDown={(event) => { if (event.currentTarget === event.target) close() }}>
          <section className="w-full max-w-lg rounded-[20px] bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div><h2 id="client-request-action-title" className="text-xl font-semibold text-slate-950">{requestActionContent[action].title}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{requestActionContent[action].description}</p></div>
              <button type="button" onClick={close} aria-label="Close" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600">×</button>
            </div>
            <label className="mt-5 grid gap-2 text-sm font-semibold text-slate-900">
              Message
              <textarea autoFocus rows={4} value={message} onChange={(event) => setMessage(event.target.value)} placeholder={requestActionContent[action].placeholder} className="resize-none rounded-xl border border-slate-300 px-3 py-3 text-base font-normal outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-sky-100" />
            </label>
            {error ? <p className="mt-3 text-sm font-medium text-rose-700" role="alert">{error}</p> : null}
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={close} disabled={isPending} className="min-h-11 rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-700">Keep Request</button>
              <button type="button" onClick={submitAction} disabled={isPending || !message.trim()} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold text-white disabled:opacity-40 ${action === "cancel" ? "bg-rose-600" : "bg-[#0071e3]"}`}>
                <MessageSquareText className="h-4 w-4" aria-hidden="true" />{isPending ? "Sending..." : requestActionContent[action].submit}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}

export function ProjectInfoEditor({ project }: { project: { id: string; name: string; address: string | null; status: "draft" | "active" | "archived" } }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(project.name)
  const [address, setAddress] = useState(project.address ?? "")
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function save() {
    startTransition(async () => {
      const result = await updateProjectAction({ projectId: project.id, name, address })
      if (!result.ok) return setMessage(result.error)
      setMessage("Project updated.")
      setEditing(false)
      router.refresh()
    })
  }

  function toggleArchive() {
    startTransition(async () => {
      const result = await updateProjectAction({ projectId: project.id, status: project.status === "archived" ? "active" : "archived" })
      if (!result.ok) return setMessage(result.error)
      router.push("/projects")
      router.refresh()
    })
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">{project.address || "No address added"}</p>
        </div>
        <button type="button" onClick={() => setEditing((value) => !value)} className="shrink-0 text-sm font-semibold text-[#0066cc]">{editing ? "Close" : "Edit"}</button>
      </div>
      {editing ? (
        <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4">
          <label className="grid gap-1.5 text-sm font-semibold text-slate-900">Project name<input value={name} onChange={(event) => setName(event.target.value)} className="min-h-11 rounded-xl border border-slate-300 px-3 text-base" /></label>
          <label className="grid gap-1.5 text-sm font-semibold text-slate-900">Address<textarea value={address} onChange={(event) => setAddress(event.target.value)} rows={2} className="rounded-xl border border-slate-300 px-3 py-2 text-base" /></label>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={isPending} onClick={save} className="min-h-10 rounded-full bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-50">Save</button>
            <button type="button" disabled={isPending} onClick={toggleArchive} className="min-h-10 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 disabled:opacity-50">{project.status === "archived" ? "Restore Project" : "Archive Project"}</button>
          </div>
          {message ? <p className="text-sm text-slate-600">{message}</p> : null}
        </div>
      ) : null}
    </div>
  )
}

export function ProjectQuestionsForm({ projectId, questions, initialAnswers }: { projectId: string; questions: ProjectQuestionRecord[]; initialAnswers: Record<string, string> }) {
  const router = useRouter()
  const [answers, setAnswers] = useState(initialAnswers)
  const [editing, setEditing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const displayedQuestions = questions.map((question) => question.id === "contact_person" ? { ...question, required: false } : question)
  const requiredMissing = displayedQuestions.filter((question) => question.required && !answers[question.id]?.trim())

  function save() {
    startTransition(async () => {
      const result = await saveProjectAnswersAction({ projectId, answers: displayedQuestions.map((question) => ({ questionId: question.id, value: answers[question.id] ?? "" })) })
      if (!result.ok) return setMessage(result.error)
      setMessage("Project details saved.")
      setEditing(false)
      router.refresh()
    })
  }

  return (
    <section className="border-t border-slate-100 pt-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-950">Delivery and site details</h2>
          <p className="mt-0.5 text-xs text-slate-500">{requiredMissing.length ? `${requiredMissing.length} required answer${requiredMissing.length === 1 ? "" : "s"} missing` : "Ready for request submission"}</p>
        </div>
        <button type="button" onClick={() => setEditing((value) => !value)} className="text-sm font-semibold text-[#0066cc]">{editing ? "Close" : "Edit"}</button>
      </div>
      {editing ? (
        <div className="mt-4 grid gap-3">
          {displayedQuestions.map((question) => (
            <label key={question.id} className="grid gap-1.5 text-sm font-semibold text-slate-900">
              <span>{question.label}{question.required ? <span className="text-rose-500"> *</span> : null}</span>
              {question.question_type === "textarea" ? (
                <textarea rows={3} value={answers[question.id] || ""} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2 text-base" />
              ) : question.question_type === "select" ? (
                <select value={answers[question.id] || ""} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-base"><option value="">Choose one</option>{question.options.map((option) => <option key={option} value={option}>{option}</option>)}</select>
              ) : (
                <input type={question.question_type === "date" || question.question_type === "time" ? question.question_type : "text"} value={answers[question.id] || ""} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))} className="min-h-11 rounded-xl border border-slate-300 px-3 text-base" />
              )}
            </label>
          ))}
          <button type="button" disabled={isPending} onClick={save} className="min-h-11 rounded-full bg-[#0071e3] px-4 text-sm font-semibold text-white disabled:opacity-50">{isPending ? "Saving..." : "Save Project Details"}</button>
          {message ? <p className="text-sm text-slate-600">{message}</p> : null}
        </div>
      ) : null}
    </section>
  )
}

export function SubmitQuoteRequestButton({ projectId, requestId }: { projectId: string; requestId: string }) {
  const router = useRouter()
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function submit() {
    startTransition(async () => {
      const result = await submitQuoteRequestAction({ projectId, requestId })
      if (!result.ok) return setMessage(result.error)
      setMessage("Quote Request submitted for review.")
      router.refresh()
    })
  }

  return (
    <div className="grid gap-2">
      <button type="button" disabled={isPending} onClick={submit} className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#0071e3] px-4 text-sm font-semibold text-white disabled:opacity-50">{isPending ? "Submitting..." : "Submit Request"}</button>
      {message ? <p className="text-xs leading-5 text-slate-600">{message}</p> : null}
    </div>
  )
}

export function MaterialQuestionnaireRequestEditor({ response, savedAnswers, userId, itemId, locked }: {
  response: MaterialQuestionnaireResponse
  savedAnswers: MaterialRequestAnswer[]
  userId: string
  itemId: string
  locked: boolean
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(response.status !== "complete")
  const initialAnswers = Object.fromEntries(savedAnswers.map((answer) => [answer.question_id || answer.question_key, answer.answer_value])) as Record<string, MaterialAnswerValue>
  const answeredRows = savedAnswers.filter((answer) => answer.answer_display_snapshot.trim())

  async function save(answers: Record<string, MaterialAnswerValue>, complete: boolean) {
    const result = await saveMaterialQuestionnaireResponseAction({
      projectId: response.project_id,
      requestId: response.request_id,
      responseId: response.id,
      answers,
      complete,
    })
    if (result.ok) {
      if (complete) setEditing(false)
      router.refresh()
    }
    return result.ok ? { ok: true } : { ok: false, error: result.error }
  }

  async function upload(_question: MaterialQuestion, files: File[]) {
    const attachmentIds: string[] = []
    for (const file of files) {
      if (file.size > 25 * 1024 * 1024) return { ok: false, error: `${file.name} is larger than 25 MB.` }
      const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-|-$/g, "") || "upload"
      const filePath = `${userId}/${response.project_id}/${crypto.randomUUID()}-${safeName}`
      const { error } = await createClient().storage.from("project-uploads").upload(filePath, file, { upsert: false })
      if (error) return { ok: false, error: error.message }
      const record = await saveQuoteAttachmentRecordAction({ projectId: response.project_id, requestId: response.request_id, itemId, materialResponseId: response.id, fileName: file.name, filePath, fileType: file.type, fileSize: file.size })
      if (!record.ok) return { ok: false, error: record.error }
      attachmentIds.push(record.data.id)
    }
    return { ok: true, attachmentIds }
  }

  if (!editing) {
    return (
      <div className="px-4 py-3 sm:px-5">
        <dl className="grid gap-x-5 gap-y-2 sm:grid-cols-2">
          {answeredRows.map((answer) => <div key={answer.question_key} className="min-w-0"><dt className="truncate text-[11px] font-semibold text-slate-500">{answer.question_label_snapshot}</dt><dd className="mt-0.5 break-words text-sm font-semibold text-slate-950">{answer.answer_display_snapshot}</dd></div>)}
        </dl>
        {!answeredRows.length ? <p className="text-sm text-slate-500">No details were provided.</p> : null}
        {!locked ? <button type="button" onClick={() => setEditing(true)} className="mt-3 text-sm font-semibold text-[#0066cc] print:hidden">Edit details</button> : null}
      </div>
    )
  }

  return <div><MaterialQuestionnaireWizard snapshot={response.definition_snapshot} initialAnswers={initialAnswers} embedded locked={locked} onSave={save} onUpload={upload} />{!locked && response.status === "complete" ? <button type="button" onClick={() => setEditing(false)} className="mx-5 mb-4 text-sm font-semibold text-slate-600">Cancel</button> : null}</div>
}

export function QuoteItemAnswersEditor({ projectId, requestId, itemId, questions, initialAnswers, locked }: {
  projectId: string
  requestId: string
  itemId: string
  questions: QualifyingQuestion[]
  initialAnswers: Array<{ questionId: string; value: string }>
  locked: boolean
}) {
  const router = useRouter()
  const [answers, setAnswers] = useState<Record<string, string>>(Object.fromEntries(initialAnswers.map((answer) => [answer.questionId, answer.value])))
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  if (!questions.length) return null

  function save() {
    startTransition(async () => {
      const result = await saveQuoteItemAnswersAction({
        projectId,
        requestId,
        itemId,
        answers: questions.map((question) => ({ questionId: question.id, label: question.label, value: answers[question.id]?.trim() || "" })).filter((answer) => answer.value),
      })
      if (!result.ok) return setMessage(result.error)
      setMessage("Answers saved.")
      router.refresh()
    })
  }

  return (
    <details className="mt-3 rounded-xl border border-slate-200 bg-white" open={!locked && questions.some((question) => question.required && !answers[question.id])}>
      <summary className="cursor-pointer list-none px-3 py-2.5 text-sm font-semibold text-slate-800">Qualifying Questions</summary>
      <div className="grid gap-3 border-t border-slate-100 p-3">
        {questions.map((question) => (
          <label key={question.id} className="grid gap-1.5 text-sm font-semibold text-slate-800">
            <span>{question.label}{question.required ? <span className="text-rose-500"> *</span> : null}</span>
            {question.type === "textarea" ? <textarea disabled={locked} rows={3} value={answers[question.id] || ""} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2 text-base disabled:bg-slate-100" /> : question.type === "select" ? <select disabled={locked} value={answers[question.id] || ""} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-base disabled:bg-slate-100"><option value="">Choose one</option>{(question.options ?? []).map((option) => <option key={option} value={option}>{option}</option>)}</select> : <input disabled={locked} value={answers[question.id] || ""} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))} className="min-h-11 rounded-xl border border-slate-300 px-3 text-base disabled:bg-slate-100" />}
          </label>
        ))}
        {!locked ? <button type="button" disabled={isPending} onClick={save} className="min-h-10 rounded-full bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-50">Save Answers</button> : null}
        {message ? <p className="text-xs text-slate-600">{message}</p> : null}
      </div>
    </details>
  )
}
