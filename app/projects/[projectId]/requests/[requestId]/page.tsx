import Link from "next/link"
import { notFound } from "next/navigation"

import { QuoteItemAnswersEditor, SubmitQuoteRequestButton } from "@/components/buildflow/project-workspace-controls"
import { requireSignedInProfile } from "@/lib/auth"
import { PROJECT_UPLOAD_STORAGE_BUCKET } from "@/lib/projects"
import { quoteRequestProgressIndex, quoteRequestStatusClass, quoteRequestStatusLabel, QUOTE_REQUEST_PROGRESS_STEPS, type QuoteRequestItemRecord, type QuoteRequestRecord } from "@/lib/quote-requests"
import { getQualificationSettingForPlanRequest, getQualificationSettingForProduct } from "@/lib/shop-qualification"

type AttachmentRecord = { id: string; item_id: string | null; file_name: string; file_path: string; file_type: string | null; file_size: number | null }

export default async function QuoteRequestDetailPage({ params }: { params: Promise<{ projectId: string; requestId: string }> }) {
  const { projectId, requestId } = await params
  const { supabase, user } = await requireSignedInProfile()
  const [{ data: request }, { data: items }, { data: attachments }] = await Promise.all([
    supabase.from("quote_requests").select("id, project_id, owner_id, title, status, submitted_at, created_at, updated_at").eq("id", requestId).eq("project_id", projectId).eq("owner_id", user.id).maybeSingle<QuoteRequestRecord>(),
    supabase.from("quote_request_items").select("id, request_id, project_id, owner_id, catalog_item_id, name, department, item_type, quantity, unit, unit_price, qualification_status, answers, metadata, created_at, updated_at").eq("request_id", requestId).eq("owner_id", user.id).order("created_at").returns<QuoteRequestItemRecord[]>(),
    supabase.from("quote_request_attachments").select("id, item_id, file_name, file_path, file_type, file_size").eq("request_id", requestId).eq("owner_id", user.id).returns<AttachmentRecord[]>(),
  ])
  if (!request) notFound()

  const files = await Promise.all((attachments ?? []).map(async (file) => {
    const { data } = await supabase.storage.from(PROJECT_UPLOAD_STORAGE_BUCKET).createSignedUrl(file.file_path, 60 * 30)
    return { ...file, signedUrl: data?.signedUrl ?? null }
  }))
  const locked = request.status !== "draft"
  const activeProgressIndex = quoteRequestProgressIndex(request.status)

  return (
    <main className="min-h-screen bg-[#f5f5f7] pb-28 text-slate-950 sm:pb-12">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-5 sm:px-8">
          <Link href={`/projects/${projectId}`} className="text-sm font-semibold text-[#0066cc]">Back to Project</Link>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div><p className="text-[11px] font-semibold uppercase text-slate-500">Project Request</p><h1 className="mt-1 text-2xl font-semibold sm:text-3xl">{request.title}</h1></div>
            <span className={`w-fit rounded-full border px-3 py-1.5 text-xs font-semibold uppercase ${quoteRequestStatusClass(request.status)}`}>{quoteRequestStatusLabel(request.status)}</span>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-4xl gap-4 px-4 py-5 sm:px-8">
        <ol className="grid grid-cols-2 gap-2 rounded-[20px] border border-slate-200 bg-white p-3 sm:grid-cols-4" aria-label={`Request progress: ${quoteRequestStatusLabel(request.status)}`}>
          {QUOTE_REQUEST_PROGRESS_STEPS.map((label, index) => <li key={label} className={`rounded-xl px-2 py-2 text-[11px] font-semibold leading-4 ${index <= activeProgressIndex ? "bg-sky-50 text-sky-800" : "bg-slate-50 text-slate-400"}`}><span className="mr-1">{index + 1}.</span>{label}</li>)}
        </ol>
        {locked ? <div className="rounded-[18px] border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">This request is locked while it is being reviewed.</div> : null}
        {(items ?? []).map((item) => {
          const qualificationTarget = { id: item.catalog_item_id || item.id, name: item.name, category: item.department, price: item.unit_price, productType: item.item_type === "material" ? "material" as const : "service" as const }
          const questions = item.item_type === "file_upload" || item.item_type === "service"
            ? getQualificationSettingForPlanRequest(qualificationTarget.id, item.name, item.department).questions
            : getQualificationSettingForProduct(qualificationTarget).questions
          const itemFiles = files.filter((file) => file.item_id === item.id)
          const requestDetails = typeof item.metadata?.request_details === "string" ? item.metadata.request_details.trim() : ""
          return (
            <article key={item.id} className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
              <div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0066cc]">{item.department}</p><h2 className="mt-1 text-base font-semibold">{item.name}</h2></div><span className="text-sm font-medium text-slate-500">{item.quantity} {item.unit || "item"}</span></div>
              {requestDetails ? <p className="mt-3 whitespace-pre-wrap border-l-4 border-sky-200 bg-sky-50 px-3 py-2 text-sm leading-6 text-slate-700">{requestDetails}</p> : null}
              {itemFiles.length ? <div className="mt-3 grid gap-2">{itemFiles.map((file) => file.signedUrl ? <a key={file.id} href={file.signedUrl} target="_blank" rel="noreferrer" className="truncate rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-[#0066cc]">{file.file_name}</a> : <span key={file.id} className="truncate text-sm text-slate-600">{file.file_name}</span>)}</div> : null}
              <QuoteItemAnswersEditor projectId={projectId} requestId={requestId} itemId={item.id} questions={questions} initialAnswers={item.answers ?? []} locked={locked} />
            </article>
          )
        })}
        {!locked ? <section className="rounded-[20px] border border-slate-200 bg-white p-4"><h2 className="font-semibold">Ready to send?</h2><p className="mt-1 mb-4 text-sm text-slate-600">Required project and item questions must be complete.</p><SubmitQuoteRequestButton projectId={projectId} requestId={requestId} /></section> : null}
      </div>
    </main>
  )
}
