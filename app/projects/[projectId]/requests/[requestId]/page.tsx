import Link from "next/link"
import { notFound } from "next/navigation"

import { ExportRequestPdfButton, MaterialQuestionnaireRequestEditor, QuoteItemAnswersEditor, SubmitQuoteRequestButton } from "@/components/buildflow/project-workspace-controls"
import { requireSignedInProfile } from "@/lib/auth"
import { PROJECT_UPLOAD_STORAGE_BUCKET } from "@/lib/projects"
import { quoteRequestProgressIndex, quoteRequestStatusClass, quoteRequestStatusLabel, QUOTE_REQUEST_PROGRESS_STEPS, type QuoteRequestItemRecord, type QuoteRequestRecord } from "@/lib/quote-requests"
import { getQualificationSettingForPlanRequest, getQualificationSettingForProduct } from "@/lib/shop-qualification"
import type { MaterialQuestionnaireResponse, MaterialRequestAnswer } from "@/lib/material-questionnaires"

type AttachmentRecord = { id: string; item_id: string | null; file_name: string; file_path: string; file_type: string | null; file_size: number | null }

export default async function QuoteRequestDetailPage({ params }: { params: Promise<{ projectId: string; requestId: string }> }) {
  const { projectId, requestId } = await params
  const { supabase, user } = await requireSignedInProfile()
  const [{ data: request }, { data: items }, { data: attachments }, { data: materialResponses }] = await Promise.all([
    supabase.from("quote_requests").select("id, project_id, owner_id, title, status, submitted_at, created_at, updated_at").eq("id", requestId).eq("project_id", projectId).eq("owner_id", user.id).maybeSingle<QuoteRequestRecord>(),
    supabase.from("quote_request_items").select("id, request_id, project_id, owner_id, catalog_item_id, name, department, item_type, quantity, unit, unit_price, qualification_status, answers, metadata, created_at, updated_at").eq("request_id", requestId).eq("owner_id", user.id).order("created_at").returns<QuoteRequestItemRecord[]>(),
    supabase.from("quote_request_attachments").select("id, item_id, file_name, file_path, file_type, file_size").eq("request_id", requestId).eq("owner_id", user.id).returns<AttachmentRecord[]>(),
    supabase.from("material_questionnaire_responses").select("id, request_id, project_id, owner_id, category_id, category_name_snapshot, category_slug_snapshot, definition_version, definition_snapshot, status, completed_at, created_at, updated_at").eq("request_id", requestId).eq("owner_id", user.id).order("created_at").returns<MaterialQuestionnaireResponse[]>(),
  ])
  if (!request) notFound()

  const files = await Promise.all((attachments ?? []).map(async (file) => {
    const { data } = await supabase.storage.from(PROJECT_UPLOAD_STORAGE_BUCKET).createSignedUrl(file.file_path, 60 * 30)
    return { ...file, signedUrl: data?.signedUrl ?? null }
  }))
  const locked = request.status !== "draft"
  const activeProgressIndex = quoteRequestProgressIndex(request.status)
  const { data: materialAnswers } = materialResponses?.length
    ? await supabase.from("material_request_answers").select("id, response_id, question_id, question_key, question_label_snapshot, question_type_snapshot, answer_value, answer_display_snapshot, unit_snapshot").in("response_id", materialResponses.map((response) => response.id)).returns<MaterialRequestAnswer[]>()
    : { data: [] as MaterialRequestAnswer[] }
  const materialResponseDepartments = new Set((materialResponses ?? []).map((response) => response.definition_snapshot.category.department_key))
  const requestDate = new Date(request.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

  return (
    <main className="min-h-screen bg-[#f5f5f7] pb-28 text-slate-950 sm:pb-12">
      <section className="request-print-sheet hidden bg-white text-black">
        <div className="flex items-start justify-between border-b-2 border-slate-950 pb-3">
          <div><p className="text-lg font-bold">Avantia Build</p><p className="text-[10px] text-slate-500">You build. We handle the materials.</p></div>
          <div className="text-right"><p className="text-[10px] font-semibold uppercase text-slate-500">Material Request</p><p className="text-xs">{requestDate}</p></div>
        </div>
        <div className="py-3"><h1 className="text-xl font-bold">{request.title}</h1><p className="mt-1 text-xs text-slate-600">Status: {quoteRequestStatusLabel(request.status)}</p></div>
        <div className="grid gap-3">
          {(materialResponses ?? []).map((response) => {
            const responseAnswers = (materialAnswers ?? []).filter((answer) => answer.response_id === response.id && answer.answer_display_snapshot.trim())
            return <section key={response.id} className="border-t border-slate-300 pt-2"><h2 className="text-sm font-bold">{response.category_name_snapshot}</h2><dl className="mt-1 grid grid-cols-2 gap-x-5 gap-y-1">{responseAnswers.map((answer) => <div key={answer.question_key} className="min-w-0"><dt className="truncate text-[9px] font-semibold text-slate-500">{answer.question_label_snapshot}</dt><dd className="break-words text-[10px] font-semibold">{answer.answer_display_snapshot}</dd></div>)}</dl></section>
          })}
          {(items ?? []).filter((item) => !materialResponseDepartments.has(item.department)).map((item) => <section key={item.id} className="border-t border-slate-300 pt-2"><div className="flex justify-between gap-4"><h2 className="text-xs font-bold">{item.name}</h2><p className="text-[10px]">{item.quantity} {item.unit || "item"}</p></div></section>)}
          {files.length ? <section className="border-t border-slate-300 pt-2"><h2 className="text-xs font-bold">Attachments</h2><p className="mt-1 text-[10px] text-slate-600">{files.map((file) => file.file_name).join(" · ")}</p></section> : null}
        </div>
        <p className="mt-5 border-t border-slate-300 pt-2 text-center text-[9px] text-slate-500">Avantia Build · (929) 207-7156</p>
      </section>
      <header className="border-b border-slate-200 bg-white print:border-0">
        <div className="mx-auto max-w-4xl px-4 py-5 sm:px-8">
          <Link href={`/projects/${projectId}`} className="text-sm font-semibold text-[#0066cc] print:hidden">Back to Project</Link>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div><p className="text-[11px] font-semibold uppercase text-slate-500">Project Request</p><h1 className="mt-1 text-2xl font-semibold sm:text-3xl">{request.title}</h1></div>
            <div className="flex flex-wrap items-center gap-2"><span className={`w-fit rounded-full border px-3 py-1.5 text-xs font-semibold uppercase ${quoteRequestStatusClass(request.status)}`}>{quoteRequestStatusLabel(request.status)}</span><ExportRequestPdfButton /></div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-4xl gap-4 px-4 py-5 sm:px-8">
        <ol className="grid grid-cols-2 gap-2 rounded-[20px] border border-slate-200 bg-white p-3 sm:grid-cols-4 print:hidden" aria-label={`Request progress: ${quoteRequestStatusLabel(request.status)}`}>
          {QUOTE_REQUEST_PROGRESS_STEPS.map((label, index) => <li key={label} className={`rounded-xl px-2 py-2 text-[11px] font-semibold leading-4 ${index <= activeProgressIndex ? "bg-sky-50 text-sky-800" : "bg-slate-50 text-slate-400"}`}><span className="mr-1">{index + 1}.</span>{label}</li>)}
        </ol>
        {locked ? <div className="rounded-[18px] border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">This request is locked while it is being reviewed.</div> : null}
        {(materialResponses ?? []).map((response) => <article key={response.id} className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)] print:break-inside-avoid print:shadow-none"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-3"><div><p className="text-[11px] font-semibold uppercase tracking-[.14em] text-[#0066cc]">Order details</p><h2 className="mt-0.5 font-semibold">{response.category_name_snapshot}</h2></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${response.status === "complete" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{response.status === "complete" ? "Details saved" : "Needs review"}</span></div><MaterialQuestionnaireRequestEditor response={response} savedAnswers={(materialAnswers ?? []).filter((answer) => answer.response_id === response.id)} userId={user.id} itemId={(items ?? [])[0]?.id ?? ""} locked={locked} /></article>)}
        {(items ?? []).map((item) => {
          const qualificationTarget = { id: item.catalog_item_id || item.id, name: item.name, category: item.department, price: item.unit_price, productType: item.item_type === "material" ? "material" as const : "service" as const }
          const hasDepartmentQuestionnaire = materialResponseDepartments.has(item.department)
          const questions = hasDepartmentQuestionnaire ? [] : item.item_type === "file_upload" || item.item_type === "service"
            ? getQualificationSettingForPlanRequest(qualificationTarget.id, item.name, item.department).questions
            : getQualificationSettingForProduct(qualificationTarget).questions
          const itemFiles = files.filter((file) => file.item_id === item.id)
          const requestDetails = typeof item.metadata?.request_details === "string" ? item.metadata.request_details.trim() : ""
          if (hasDepartmentQuestionnaire && !questions.length && !itemFiles.length && !requestDetails) return null
          return (
            <article key={item.id} className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
              <div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0066cc]">{item.department}</p><h2 className="mt-1 text-base font-semibold">{item.name}</h2></div><span className="text-sm font-medium text-slate-500">{item.quantity} {item.unit || "item"}</span></div>
              {requestDetails ? <p className="mt-3 whitespace-pre-wrap border-l-4 border-sky-200 bg-sky-50 px-3 py-2 text-sm leading-6 text-slate-700">{requestDetails}</p> : null}
              {itemFiles.length ? <div className="mt-3 grid gap-2">{itemFiles.map((file) => file.signedUrl ? <a key={file.id} href={file.signedUrl} target="_blank" rel="noreferrer" className="truncate rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-[#0066cc]">{file.file_name}</a> : <span key={file.id} className="truncate text-sm text-slate-600">{file.file_name}</span>)}</div> : null}
              <QuoteItemAnswersEditor projectId={projectId} requestId={requestId} itemId={item.id} questions={questions} initialAnswers={item.answers ?? []} locked={locked} />
            </article>
          )
        })}
        {!locked ? <section className="rounded-[18px] border border-slate-200 bg-white p-4"><h2 className="font-semibold">Send this request</h2><p className="mt-1 mb-3 text-sm text-slate-600">Submit the saved order details for review.</p><SubmitQuoteRequestButton projectId={projectId} requestId={requestId} /></section> : null}
      </div>
    </main>
  )
}
