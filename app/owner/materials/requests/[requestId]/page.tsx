import Link from "next/link"
import { notFound } from "next/navigation"
import { CustomerRequestStatus } from "@/components/buildflow/customer-request-status"
import { OrganizeMaterialListButton } from "@/components/buildflow/organize-material-list-button"
import { OrganizedMaterialList } from "@/components/buildflow/organized-material-list"
import { RequestManagementPanel, type RequestComparisonSummary } from "@/components/buildflow/request-management-panel"
import { RequestWorkflowStepHeader } from "@/components/buildflow/request-workflow-step-header"
import { requireStaffProfile } from "@/lib/auth"
import { contactEmailForDisplay } from "@/lib/auth-phone"
import { normalizeMaterialCatalogDepartment } from "@/lib/material-catalog"
import type { MaterialQuestionnaireResponse, MaterialRequestAnswer } from "@/lib/material-questionnaires"
import { quoteRequestStatusLabel, type QuoteRequestStatus } from "@/lib/quote-requests"
import type { SupplierRoutingOption } from "@/lib/shop-qualification"
import { analyzeQuoteComparison, type QuoteComparisonBidRecord, type QuoteComparisonItemRecord, type QuoteComparisonRecord } from "@/lib/quote-comparison"
import { managerPipelineStage } from "@/lib/manager-dashboard"

type RequestDetails = { id: string; project_id: string; owner_id: string; title: string; status: QuoteRequestStatus; created_at: string; updated_at: string; submitted_at: string | null; projects: { name: string; address: string | null } | null }
type Attachment = { id: string; material_response_id: string | null; file_name: string; file_path: string; file_type: string | null }
type RequestItem = { id: string; name: string; department: string; item_type: string; quantity: number; unit: string | null; answers: unknown; metadata: Record<string, unknown> | null }
type LegacyAnswer = { questionId?: string; label?: string; value?: string; question?: string; answer?: string }
type SupplierPackage = { id: string; department: string; supplier_id: string | null; status: string }
type ComparisonRecord = Pick<QuoteComparisonRecord, "id" | "request_id" | "title" | "status" | "client_quote_status" | "quote_number" | "updated_at">

const workflowStepCardClass = "group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition hover:border-slate-300 hover:shadow-[0_12px_30px_rgba(15,23,42,0.08)]"

function legacyAnswers(value: unknown): LegacyAnswer[] {
  return Array.isArray(value) ? value.filter((answer): answer is LegacyAnswer => Boolean(answer) && typeof answer === "object") : []
}

export default async function OwnerMaterialRequestPage({ params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params
  const { supabase } = await requireStaffProfile("customers")
  const [{ data: request, error: requestError }, { data: responses }, { data: attachments }, { data: items }, { data: managerSettings }, { data: packages }, { data: clientActionEvents }, { data: comparisons }] = await Promise.all([
    supabase.from("quote_requests").select("id,project_id,owner_id,title,status,created_at,updated_at,submitted_at,projects(name,address)").eq("id", requestId).maybeSingle<RequestDetails>(),
    supabase.from("material_questionnaire_responses").select("id, request_id, project_id, owner_id, category_id, category_name_snapshot, category_slug_snapshot, definition_version, definition_snapshot, status, completed_at, created_at, updated_at").eq("request_id", requestId).order("created_at").returns<MaterialQuestionnaireResponse[]>(),
    supabase.from("quote_request_attachments").select("id,material_response_id,file_name,file_path,file_type").eq("request_id", requestId).returns<Attachment[]>(),
    supabase.from("quote_request_items").select("id,name,department,item_type,quantity,unit,answers,metadata").eq("request_id", requestId).order("created_at").returns<RequestItem[]>(),
    supabase.from("workflow_manager_settings").select("state").eq("id", "singleton").maybeSingle<{ state: { qualificationSettings?: { suppliers?: SupplierRoutingOption[] } } }>(),
    supabase.from("supplier_packages").select("id,department,supplier_id,status").eq("request_id", requestId).order("created_at").returns<SupplierPackage[]>(),
    supabase.from("project_events").select("id,title,description,metadata,created_at").contains("metadata", { quote_request_id: requestId }).order("created_at", { ascending: false }).limit(20).returns<Array<{ id: string; title: string; description: string | null; metadata: Record<string, unknown>; created_at: string }>>(),
    supabase.from("quote_comparisons").select("id,request_id,title,status,client_quote_status,quote_number,updated_at").eq("request_id", requestId).order("updated_at", { ascending: false }).returns<ComparisonRecord[]>(),
  ])
  if (requestError) throw new Error(`Could not load this material request: ${requestError.message}`)
  if (!request) notFound()
  const clientActions = (clientActionEvents ?? []).filter((event) => typeof event.metadata?.client_action === "string")
  const clientReplyCompleted = clientActions.some((event) => ["email_reply", "estimate_sent"].includes(String(event.metadata.client_action)))
  const workflowOverrides = new Map<number, boolean>()
  for (const event of clientActionEvents ?? []) {
    if (event.metadata?.manager_action !== "workflow_step_status") continue
    const step = Number(event.metadata.workflow_step)
    if (workflowOverrides.has(step) || typeof event.metadata.workflow_completed !== "boolean") continue
    workflowOverrides.set(step, event.metadata.workflow_completed)
  }

  const [{ data: profile }, answersResult] = await Promise.all([
    supabase.from("profiles").select("full_name,email,phone").eq("id", request.owner_id).maybeSingle<{ full_name: string | null; email: string | null; phone: string | null }>(),
    responses?.length
      ? supabase.from("material_request_answers").select("id,response_id,question_id,question_key,question_label_snapshot,question_type_snapshot,answer_value,answer_display_snapshot,unit_snapshot").in("response_id", responses.map((response) => response.id)).order("created_at").returns<MaterialRequestAnswer[]>()
      : Promise.resolve({ data: [] as MaterialRequestAnswer[] }),
  ])
  const answers = answersResult.data ?? []
  const clientEmail = contactEmailForDisplay(profile?.email)
  const comparisonIds = (comparisons ?? []).map((comparison) => comparison.id)
  const [comparisonItemsResult, comparisonBidsResult] = comparisonIds.length ? await Promise.all([
    supabase.from("quote_comparison_items").select("*").in("comparison_id", comparisonIds).order("sort_order").returns<QuoteComparisonItemRecord[]>(),
    supabase.from("quote_comparison_bids").select("*,quote_comparison_prices(*)").in("comparison_id", comparisonIds).order("created_at").returns<QuoteComparisonBidRecord[]>(),
  ]) : [{ data: [] as QuoteComparisonItemRecord[] }, { data: [] as QuoteComparisonBidRecord[] }]
  const signedFiles = await Promise.all((attachments ?? []).map(async (file) => ({ ...file, url: (await supabase.storage.from("project-uploads").createSignedUrl(file.file_path, 1800)).data?.signedUrl ?? null })))
  const generalFiles = signedFiles.filter((file) => !file.material_response_id)
  const suppliers = managerSettings?.state?.qualificationSettings?.suppliers ?? []
  const organizedItems = (items ?? []).filter((item) => item.metadata?.ai_organized === true)
  const originalItems = (items ?? []).filter((item) => item.metadata?.ai_organized !== true)
  const organizationStatus = typeof originalItems[0]?.metadata?.ai_organization_status === "string" ? originalItems[0].metadata.ai_organization_status : ""
  const organizationCompletedAt = typeof originalItems[0]?.metadata?.ai_organization_completed_at === "string" ? originalItems[0].metadata.ai_organization_completed_at : ""
  const organizationCompletedLabel = organizationCompletedAt && Number.isFinite(Date.parse(organizationCompletedAt))
    ? new Date(organizationCompletedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" })
    : ""
  const departmentItems = organizedItems.length ? organizedItems : items ?? []
  const departments = Array.from(new Set(departmentItems.map((item) => normalizeMaterialCatalogDepartment(item.department))))
  if (!departments.length) departments.push("Others")
  const projectLabel = request.projects?.name === "Material Requests" ? request.projects.address : request.projects?.name
  const currentStage = managerPipelineStage(request, comparisons ?? [], (packages ?? []).map((pkg) => ({ request_id: request.id, ...pkg })))
  const comparisonSummaries: RequestComparisonSummary[] = (comparisons ?? []).map((comparison) => {
    const comparisonItems = (comparisonItemsResult.data ?? []).filter((item) => item.comparison_id === comparison.id)
    const comparisonBids = (comparisonBidsResult.data ?? []).filter((bid) => bid.comparison_id === comparison.id)
    const analyses = analyzeQuoteComparison(comparisonItems, comparisonBids)
    return { id: comparison.id, title: comparison.title, status: comparison.status, quoteNumber: comparison.quote_number, updatedAt: comparison.updated_at, bids: analyses.map((analysis) => ({ id: analysis.bidId, supplierName: analysis.supplierName, landedTotal: analysis.landedTotal, pricedItemCount: analysis.pricedItemCount, itemCount: analysis.itemCount, recommended: analysis.isRecommended })) }
  })
  const step1Complete = workflowOverrides.get(1) ?? true
  const step2Complete = workflowOverrides.get(2) ?? organizedItems.length > 0

  return (
    <main className="min-h-screen bg-[#f5f5f7] px-3 pb-28 pt-4 text-slate-950 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <Link href="/admin/users?view=requests" className="text-sm font-semibold text-[#0066cc]">Back to Customer Requests</Link>
        <header className="mt-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#0066cc]">{quoteRequestStatusLabel(request.status)}</p><span className="text-xs text-slate-400">#{request.id.slice(0, 8).toUpperCase()}</span></div><h1 className="mt-0.5 truncate text-xl font-bold sm:text-2xl">{request.title}</h1>{projectLabel ? <p className="mt-0.5 truncate text-xs text-slate-500">{projectLabel}{request.projects?.name !== "Material Requests" && request.projects?.address ? ` · ${request.projects.address}` : ""}</p> : null}</div><div className="min-w-0 border-t border-slate-100 pt-2 text-sm sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0"><p className="font-bold text-slate-950">{profile?.full_name || "Client"}</p><div className="flex flex-wrap gap-x-3 text-xs text-slate-500">{clientEmail ? <span>{clientEmail}</span> : null}{profile?.phone ? <span>{profile.phone}</span> : null}</div></div></div>
        </header>
        <CustomerRequestStatus requestId={request.id} status={request.status} currentStage={currentStage} updatedAt={request.updated_at} assignedTo="Carlos" />
        <div className="mt-3 grid gap-2">
          <details open={currentStage === "received"} className={`order-2 ${workflowStepCardClass}`}>
            <RequestWorkflowStepHeader requestId={request.id} step={2} title="Organize request" detail={organizedItems.length ? `${organizedItems.length} organized item${organizedItems.length === 1 ? "" : "s"}` : "Create a clean material list"} status={step2Complete ? "complete" : "active"} icon="organize" />
            <div className="border-t border-slate-200 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm text-slate-500">Create a structured copy without changing the original request.</p>{organizationCompletedLabel ? <p className="mt-1 text-xs font-semibold text-slate-400">Last review: {organizationCompletedLabel} ET</p> : null}</div>{organizationStatus !== "processing" ? <OrganizeMaterialListButton requestId={request.id} refresh={organizedItems.length > 0} /> : null}</div>
            {organizedItems.length ? <div className="mt-4 border-t border-slate-200 pt-3"><h3 className="text-sm font-bold">Confirmed material list</h3><OrganizedMaterialList requestId={request.id} items={organizedItems} /></div> : <div className={`mt-4 rounded-lg px-4 py-3 text-sm font-semibold ${organizationStatus === "failed" ? "bg-rose-50 text-rose-800" : organizationStatus === "plan_requires_takeoff" ? "bg-amber-50 text-amber-800" : "bg-sky-50 text-sky-800"}`}>{organizationStatus === "processing" ? "The material list is being organized." : organizationStatus === "failed" ? "Automatic organization needs another attempt." : organizationStatus === "plan_requires_takeoff" ? "This appears to be a plan and requires a takeoff before materials can be listed." : "The original request is saved. Select Organize request to create the material chart."}</div>}
            </div>
          </details>
          <details open={currentStage === "received" && organizedItems.length === 0} className={`order-1 ${workflowStepCardClass}`}>
            <RequestWorkflowStepHeader requestId={request.id} step={1} title="Review client list" detail={`${originalItems.length} item${originalItems.length === 1 ? "" : "s"} · ${signedFiles.length} file${signedFiles.length === 1 ? "" : "s"}`} status={step1Complete ? "complete" : "active"} icon="review" />
            <div className="border-t border-slate-200 p-4"><p className="text-sm text-slate-500">The customer’s original notes, selections, and files remain unchanged.</p>
            <div className="mt-4 divide-y divide-slate-100">
              {originalItems.length ? originalItems.map((item) => {
                const itemAnswers = legacyAnswers(item.answers)
                const requestDetails = typeof item.metadata?.request_details === "string" ? item.metadata.request_details.trim() : ""
                return <article key={item.id} className="py-4 first:pt-0 last:pb-0"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold">{item.name}</h3><p className="mt-1 text-sm text-slate-500">{item.department} · {item.item_type.replaceAll("_", " ")}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{item.quantity} {item.unit || "each"}</span></div>{requestDetails ? <div className="mt-3 whitespace-pre-wrap rounded-lg bg-sky-50 px-4 py-3 text-sm leading-6 text-slate-800">{requestDetails}</div> : null}{itemAnswers.length ? <dl className="mt-3 grid gap-2">{itemAnswers.filter((answer) => Boolean(answer.value || answer.answer)).map((answer, index) => <div key={`${answer.questionId || answer.question || index}`} className="grid gap-1 rounded-lg bg-slate-50 px-4 py-3 sm:grid-cols-[minmax(12rem,.8fr)_1.2fr]"><dt className="text-sm font-semibold text-slate-600">{answer.label || answer.question || "Question"}</dt><dd className="text-sm font-semibold text-slate-950">{answer.value || answer.answer}</dd></div>)}</dl> : null}</article>
              }) : <p className="text-sm text-slate-500">No request items found.</p>}
            </div>
            {(responses ?? []).map((response) => {
              const responseFiles = signedFiles.filter((file) => file.material_response_id === response.id)
              const responseAnswers = answers.filter((answer) => answer.response_id === response.id && answer.answer_display_snapshot.trim())
              return <article key={response.id} className="mt-5 border-t border-slate-200 pt-5"><div className="flex items-center justify-between gap-3"><h3 className="text-lg font-bold">{response.category_name_snapshot} details</h3><span className={`rounded-full px-3 py-1 text-xs font-semibold ${response.status === "complete" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{response.status === "complete" ? "Complete" : "In progress"}</span></div>{responseAnswers.length ? <dl className="mt-4 grid gap-2">{responseAnswers.map((answer) => <div key={answer.question_key} className="grid gap-1 rounded-lg bg-slate-50 px-4 py-3 sm:grid-cols-[minmax(12rem,.8fr)_1.2fr]"><dt className="text-sm font-semibold text-slate-700">{answer.question_label_snapshot}</dt><dd className="whitespace-pre-wrap text-sm font-semibold text-slate-950">{answer.answer_display_snapshot}{answer.unit_snapshot && !answer.answer_display_snapshot.includes(answer.unit_snapshot) ? ` ${answer.unit_snapshot}` : ""}</dd></div>)}</dl> : <p className="mt-3 text-sm text-amber-700">No material details were saved with this questionnaire.</p>}{responseFiles.length ? <div className="mt-4"><h4 className="text-sm font-bold">Files</h4><div className="mt-2 flex flex-wrap gap-2">{responseFiles.map((file) => file.url ? <a key={file.id} href={file.url} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-[#0066cc]">{file.file_name}</a> : <span key={file.id}>{file.file_name}</span>)}</div></div> : null}</article>
            })}
            {generalFiles.length ? <div className="mt-5 border-t border-slate-200 pt-5"><h3 className="text-sm font-bold">Attachments</h3><div className="mt-2 flex flex-wrap gap-2">{generalFiles.map((file) => file.url ? <a key={file.id} href={file.url} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-[#0066cc]">{file.file_name}</a> : <span key={file.id} className="text-sm">{file.file_name}</span>)}</div></div> : null}
            </div>
          </details>
        </div>
        <div className="mt-2"><RequestManagementPanel requestId={request.id} requestTitle={request.title} client={{ name: profile?.full_name || "Client", email: clientEmail, phone: profile?.phone || "" }} departments={departments} suppliers={suppliers} packages={packages ?? []} requestItems={departmentItems.map((item) => ({ id: item.id, name: item.name, quantity: item.quantity, unit: item.unit, reviewReasons: Array.isArray(item.metadata?.review_reasons) ? item.metadata.review_reasons.filter((reason): reason is string => typeof reason === "string" && Boolean(reason.trim())) : [] }))} projectAddress={request.projects?.address || ""} currentStage={currentStage} comparisons={comparisonSummaries} clientReplyCompleted={clientReplyCompleted} step3CompletedOverride={workflowOverrides.get(3) ?? null} step4CompletedOverride={workflowOverrides.get(4) ?? null} /></div>
        {clientActions.length ? <section className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-5"><h2 className="text-lg font-bold text-slate-950">Activity history</h2><div className="mt-3 divide-y divide-amber-200">{clientActions.map((event) => <article key={event.id} className="py-3 first:pt-0 last:pb-0"><div className="flex flex-wrap items-start justify-between gap-2"><h3 className="text-sm font-bold text-slate-900">{event.title}</h3><time className="text-xs text-slate-500">{new Date(event.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</time></div>{event.description ? <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{event.description}</p> : null}</article>)}</div></section> : null}
      </div>
    </main>
  )
}
