import Link from "next/link"
import { notFound } from "next/navigation"

import { ProjectInfoEditor, ProjectQuestionsForm, SubmitQuoteRequestButton } from "@/components/buildflow/project-workspace-controls"
import { requireSignedInProfile } from "@/lib/auth"
import { PROJECT_UPLOAD_STORAGE_BUCKET, type ProjectEventRecord, type ProjectRecord, type ProjectUploadRecord } from "@/lib/projects"
import {
  quoteRequestStatusClass,
  quoteRequestStatusLabel,
  quoteRequestProgressIndex,
  QUOTE_REQUEST_PROGRESS_STEPS,
  type ProjectQuestionAnswerRecord,
  type ProjectQuestionRecord,
  type QuoteRequestItemRecord,
  type QuoteRequestRecord,
} from "@/lib/quote-requests"

type AttachmentRecord = {
  id: string
  request_id: string
  item_id: string | null
  file_name: string
  file_path: string
  file_type: string | null
  file_size: number | null
  created_at: string
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function formatActivityDate(value: string) {
  return new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
}

function RequestProgress({ status }: { status: QuoteRequestRecord["status"] }) {
  const activeIndex = quoteRequestProgressIndex(status)
  return (
    <ol className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label={`Request progress: ${quoteRequestStatusLabel(status)}`}>
      {QUOTE_REQUEST_PROGRESS_STEPS.map((label, index) => {
        const complete = index <= activeIndex
        return (
          <li key={label} className={`rounded-xl border px-2.5 py-2 text-[11px] font-semibold leading-4 ${complete ? "border-sky-200 bg-sky-50 text-sky-800" : "border-slate-200 bg-white text-slate-400"}`}>
            <span className={`mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${complete ? "bg-[#0071e3] text-white" : "bg-slate-100 text-slate-400"}`}>{index + 1}</span>
            {label}
          </li>
        )
      })}
    </ol>
  )
}

export default async function ProjectWorkspacePage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const { supabase, user } = await requireSignedInProfile()
  const { data: project, error } = await supabase
    .from("projects")
    .select("id, owner_id, name, address, status, created_at, updated_at")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle<ProjectRecord>()
  if (error || !project) notFound()

  const [requestsResult, itemsResult, attachmentsResult, questionsResult, answersResult, eventsResult, uploadsResult] = await Promise.all([
    supabase.from("quote_requests").select("id, project_id, owner_id, title, status, submitted_at, created_at, updated_at").eq("project_id", projectId).eq("owner_id", user.id).order("updated_at", { ascending: false }).returns<QuoteRequestRecord[]>(),
    supabase.from("quote_request_items").select("id, request_id, project_id, owner_id, catalog_item_id, name, department, item_type, quantity, unit, unit_price, qualification_status, answers, metadata, created_at, updated_at").eq("project_id", projectId).eq("owner_id", user.id).order("created_at", { ascending: true }).returns<QuoteRequestItemRecord[]>(),
    supabase.from("quote_request_attachments").select("id, request_id, item_id, file_name, file_path, file_type, file_size, created_at").eq("project_id", projectId).eq("owner_id", user.id).order("created_at", { ascending: true }).returns<AttachmentRecord[]>(),
    supabase.from("project_questions").select("id, label, question_type, required, options, active, sort_order").eq("active", true).order("sort_order").returns<ProjectQuestionRecord[]>(),
    supabase.from("project_question_answers").select("project_id, question_id, owner_id, value").eq("project_id", projectId).eq("owner_id", user.id).returns<ProjectQuestionAnswerRecord[]>(),
    supabase.from("project_events").select("id, project_id, owner_id, event_type, source, title, description, metadata, created_at").eq("project_id", projectId).eq("owner_id", user.id).order("created_at", { ascending: false }).limit(20).returns<ProjectEventRecord[]>(),
    supabase.from("project_uploads").select("id, project_id, owner_id, file_name, file_path, file_type, file_size, status, created_at").eq("project_id", projectId).eq("owner_id", user.id).order("created_at", { ascending: false }).returns<ProjectUploadRecord[]>(),
  ])

  if (requestsResult.error || itemsResult.error || attachmentsResult.error || questionsResult.error || answersResult.error) {
    throw new Error("Failed to load the project workspace.")
  }

  const requests = requestsResult.data ?? []
  const items = itemsResult.data ?? []
  const attachments = await Promise.all((attachmentsResult.data ?? []).map(async (attachment) => {
    const { data } = await supabase.storage.from(PROJECT_UPLOAD_STORAGE_BUCKET).createSignedUrl(attachment.file_path, 60 * 30)
    return { ...attachment, signedUrl: data?.signedUrl ?? null }
  }))
  const legacyUploads = await Promise.all((uploadsResult.data ?? []).map(async (upload) => {
    const { data } = await supabase.storage.from(PROJECT_UPLOAD_STORAGE_BUCKET).createSignedUrl(upload.file_path, 60 * 30)
    return { ...upload, signedUrl: data?.signedUrl ?? null }
  }))
  const initialAnswers = Object.fromEntries((answersResult.data ?? []).map((answer) => [answer.question_id, answer.value]))

  return (
    <main className="min-h-screen bg-[#f5f5f7] pb-28 text-[#1d1d1f] sm:pb-12">
      <header className="border-b border-black/[0.06] bg-white">
        <div className="mx-auto flex max-w-6xl items-start justify-between gap-4 px-4 py-5 sm:px-8 sm:py-7">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0066cc]">Project Workspace</p>
            <h1 className="mt-1 truncate text-[1.8rem] font-semibold leading-tight text-slate-950 sm:text-[2.35rem]">{project.name}</h1>
          </div>
          <Link href="/projects" className="inline-flex min-h-10 shrink-0 items-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700">Projects</Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-4 px-4 py-5 sm:px-8 sm:py-7 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="grid content-start gap-4">
          <section className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_8px_28px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-slate-950">Project Info</h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase text-slate-600">{project.status}</span>
            </div>
            <div className="mt-3"><ProjectInfoEditor project={project} /></div>
            <div className="mt-4"><ProjectQuestionsForm projectId={project.id} questions={questionsResult.data ?? []} initialAnswers={initialAnswers} /></div>
          </section>

          <Link href="/shop" className="inline-flex min-h-10 w-fit items-center justify-center rounded-full bg-[#0071e3] px-5 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(0,113,227,0.18)]">Add a Request</Link>
        </aside>

        <div className="grid content-start gap-4">
          <section className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_8px_28px_rgba(15,23,42,0.05)] sm:p-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Requests</h2>
                <p className="mt-1 text-sm text-slate-500">Items, plans, questions, and files stay together.</p>
              </div>
              <span className="text-sm font-semibold text-slate-500">{requests.length}</span>
            </div>

            {requests.length ? (
              <div className="mt-4 grid gap-3">
                {requests.map((request) => {
                  const requestItems = items.filter((item) => item.request_id === request.id)
                  const requestAttachments = attachments.filter((attachment) => attachment.request_id === request.id)
                  const departments = [...new Set(requestItems.map((item) => item.department))]
                  const needsAnswers = requestItems.filter((item) => item.qualification_status === "pending" || item.qualification_status === "skipped").length
                  return (
                    <article key={request.id} className="rounded-[18px] border border-slate-200 bg-[#fbfbfd] p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold text-slate-950">{request.title}</h3>
                            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase ${quoteRequestStatusClass(request.status)}`}>{quoteRequestStatusLabel(request.status)}</span>
                          </div>
                          <p className="mt-1 text-xs text-slate-500">Updated {formatDate(request.updated_at)} · {requestItems.length} item{requestItems.length === 1 ? "" : "s"} · {requestAttachments.length} file{requestAttachments.length === 1 ? "" : "s"}</p>
                        </div>
                        {request.status === "draft" ? <SubmitQuoteRequestButton projectId={project.id} requestId={request.id} /> : null}
                      </div>
                      <RequestProgress status={request.status} />
                      {departments.length ? <div className="mt-3 flex flex-wrap gap-1.5">{departments.map((department) => <span key={department} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600">{department}</span>)}</div> : null}
                      {needsAnswers ? <p className="mt-3 text-xs font-semibold text-amber-700">{needsAnswers} item{needsAnswers === 1 ? " needs" : "s need"} qualifying answers before submission.</p> : null}
                      <div className="mt-4 grid gap-2 border-t border-slate-200 pt-3">
                        {requestItems.slice(0, 3).map((item) => {
                          const requestDetails = typeof item.metadata?.request_details === "string" ? item.metadata.request_details.trim() : ""
                          return (
                            <div key={item.id} className="grid gap-1 text-sm">
                              <div className="flex items-center justify-between gap-3">
                                <span className="min-w-0 truncate font-medium text-slate-800">{item.name}</span>
                                <span className="shrink-0 text-xs text-slate-500">{item.quantity} {item.unit || "item"}</span>
                              </div>
                              {requestDetails ? <p className="line-clamp-2 text-xs leading-5 text-slate-600">{requestDetails}</p> : null}
                            </div>
                          )
                        })}
                        {requestItems.length > 3 ? <p className="text-xs text-slate-500">+{requestItems.length - 3} more</p> : null}
                      </div>
                      <Link href={`/projects/${project.id}/requests/${request.id}`} className="mt-4 inline-flex text-sm font-semibold text-[#0066cc]">Open Request</Link>
                    </article>
                  )
                })}
              </div>
            ) : (
              <div className="mt-4 rounded-[18px] border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
                <p className="text-sm font-medium text-slate-700">No requests yet.</p>
                <Link href="/shop" className="mt-3 inline-flex text-sm font-semibold text-[#0066cc]">Browse departments</Link>
              </div>
            )}
          </section>

          {legacyUploads.length ? (
            <section className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_8px_28px_rgba(15,23,42,0.05)] sm:p-5">
              <h2 className="text-base font-semibold text-slate-950">Previous Project Files</h2>
              <div className="mt-3 grid gap-2">{legacyUploads.map((upload) => upload.signedUrl ? <a key={upload.id} href={upload.signedUrl} target="_blank" rel="noreferrer" className="truncate rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-[#0066cc]">{upload.file_name}</a> : <span key={upload.id} className="truncate text-sm text-slate-600">{upload.file_name}</span>)}</div>
            </section>
          ) : null}

          <section className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_8px_28px_rgba(15,23,42,0.05)] sm:p-5">
            <h2 className="text-base font-semibold text-slate-950">Project Activity</h2>
            <div className="mt-3 grid gap-3">
              {(eventsResult.data ?? []).length ? (eventsResult.data ?? []).map((event) => (
                <article key={event.id} className="border-l-2 border-sky-200 pl-3">
                  <div className="flex items-start justify-between gap-3"><h3 className="text-sm font-semibold text-slate-900">{event.title}</h3><time className="shrink-0 text-[11px] text-slate-500">{formatActivityDate(event.created_at)}</time></div>
                  {event.description ? <p className="mt-1 text-xs leading-5 text-slate-600">{event.description}</p> : null}
                </article>
              )) : <p className="text-sm text-slate-500">No activity yet.</p>}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
