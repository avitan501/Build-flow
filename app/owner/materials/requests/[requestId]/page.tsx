import Link from "next/link"
import { notFound } from "next/navigation"

import { CustomerRequestStatus } from "@/components/buildflow/customer-request-status"
import { RequestManagementPanel } from "@/components/buildflow/request-management-panel"
import { organizeClientMaterialRequestAction } from "@/app/owner/materials/requests/actions"
import { requireStaffProfile } from "@/lib/auth"
import { normalizeMaterialCatalogDepartment } from "@/lib/material-catalog"
import type { MaterialQuestionnaireResponse, MaterialRequestAnswer } from "@/lib/material-questionnaires"
import { quoteRequestStatusLabel, type QuoteRequestStatus } from "@/lib/quote-requests"
import type { SupplierRoutingOption } from "@/lib/shop-qualification"

type RequestDetails = { id: string; project_id: string; owner_id: string; title: string; status: QuoteRequestStatus; created_at: string; submitted_at: string | null; projects: { name: string; address: string | null } | null }
type Attachment = { id: string; material_response_id: string | null; file_name: string; file_path: string; file_type: string | null }
type RequestItem = { id: string; name: string; department: string; item_type: string; quantity: number; unit: string | null; answers: unknown; metadata: Record<string, unknown> | null }
type LegacyAnswer = { questionId?: string; label?: string; value?: string; question?: string; answer?: string }
type SupplierPackage = { id: string; department: string; supplier_id: string | null; status: string }

function legacyAnswers(value: unknown): LegacyAnswer[] {
  return Array.isArray(value) ? value.filter((answer): answer is LegacyAnswer => Boolean(answer) && typeof answer === "object") : []
}

export default async function OwnerMaterialRequestPage({ params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params
  const { supabase } = await requireStaffProfile("customers")
  const [{ data: request, error: requestError }, { data: responses }, { data: attachments }, { data: items }, { data: managerSettings }, { data: packages }, { data: clientActionEvents }] = await Promise.all([
    supabase.from("quote_requests").select("id,project_id,owner_id,title,status,created_at,submitted_at,projects(name,address)").eq("id", requestId).maybeSingle<RequestDetails>(),
    supabase.from("material_questionnaire_responses").select("id, request_id, project_id, owner_id, category_id, category_name_snapshot, category_slug_snapshot, definition_version, definition_snapshot, status, completed_at, created_at, updated_at").eq("request_id", requestId).order("created_at").returns<MaterialQuestionnaireResponse[]>(),
    supabase.from("quote_request_attachments").select("id,material_response_id,file_name,file_path,file_type").eq("request_id", requestId).returns<Attachment[]>(),
    supabase.from("quote_request_items").select("id,name,department,item_type,quantity,unit,answers,metadata").eq("request_id", requestId).order("created_at").returns<RequestItem[]>(),
    supabase.from("workflow_manager_settings").select("state").eq("id", "singleton").maybeSingle<{ state: { qualificationSettings?: { suppliers?: SupplierRoutingOption[] } } }>(),
    supabase.from("supplier_packages").select("id,department,supplier_id,status").eq("request_id", requestId).order("created_at").returns<SupplierPackage[]>(),
    supabase.from("project_events").select("id,title,description,metadata,created_at").contains("metadata", { quote_request_id: requestId }).order("created_at", { ascending: false }).limit(20).returns<Array<{ id: string; title: string; description: string | null; metadata: Record<string, unknown>; created_at: string }>>(),
  ])
  if (requestError) throw new Error(`Could not load this material request: ${requestError.message}`)
  if (!request) notFound()
  const clientActions = (clientActionEvents ?? []).filter((event) => typeof event.metadata?.client_action === "string")

  const [{ data: profile }, answersResult] = await Promise.all([
    supabase.from("profiles").select("full_name,email,phone").eq("id", request.owner_id).maybeSingle<{ full_name: string | null; email: string | null; phone: string | null }>(),
    responses?.length
      ? supabase.from("material_request_answers").select("id,response_id,question_id,question_key,question_label_snapshot,question_type_snapshot,answer_value,answer_display_snapshot,unit_snapshot").in("response_id", responses.map((response) => response.id)).order("created_at").returns<MaterialRequestAnswer[]>()
      : Promise.resolve({ data: [] as MaterialRequestAnswer[] }),
  ])
  const answers = answersResult.data ?? []
  const signedFiles = await Promise.all((attachments ?? []).map(async (file) => ({ ...file, url: (await supabase.storage.from("project-uploads").createSignedUrl(file.file_path, 1800)).data?.signedUrl ?? null })))
  const generalFiles = signedFiles.filter((file) => !file.material_response_id)
  const suppliers = managerSettings?.state?.qualificationSettings?.suppliers ?? []
  const organizedItems = (items ?? []).filter((item) => item.metadata?.ai_organized === true)
  const originalItems = (items ?? []).filter((item) => item.metadata?.ai_organized !== true)
  const organizationStatus = typeof originalItems[0]?.metadata?.ai_organization_status === "string" ? originalItems[0].metadata.ai_organization_status : ""
  const departmentItems = organizedItems.length ? organizedItems : items ?? []
  const departments = Array.from(new Set(departmentItems.map((item) => normalizeMaterialCatalogDepartment(item.department))))
  if (!departments.length) departments.push("Others")
  const projectLabel = request.projects?.name === "Material Requests" ? request.projects.address : request.projects?.name

  return (
    <main className="min-h-screen bg-[#f5f5f7] px-4 pb-28 pt-5 text-slate-950 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/admin/users?view=requests" className="text-sm font-semibold text-[#0066cc]">Back to Customer Requests</Link>
        <header className="mt-5 rounded-[20px] border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[11px] font-semibold uppercase tracking-[.14em] text-[#0066cc]">{quoteRequestStatusLabel(request.status)}</p><h1 className="mt-1 text-2xl font-bold">{request.title}</h1>{projectLabel ? <p className="mt-2 text-sm text-slate-600">{projectLabel}{request.projects?.name !== "Material Requests" && request.projects?.address ? ` · ${request.projects.address}` : ""}</p> : null}</div><div className="text-right text-sm text-slate-600"><p className="font-semibold text-slate-950">{profile?.full_name || "Client"}</p><p>{profile?.email}</p><p>{profile?.phone}</p></div></div>
        </header>
        <div className="mt-4 grid gap-4">
          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-[.12em] text-[#0071e3]">AI organized</p><h2 className="mt-1 text-xl font-bold">Material list</h2><p className="mt-1 text-sm text-slate-500">Review quantities and specifications before requesting supplier pricing.</p></div>{!organizedItems.length && organizationStatus !== "processing" ? <form action={organizeClientMaterialRequestAction}><input type="hidden" name="requestId" value={request.id} /><button type="submit" className="min-h-10 rounded-lg bg-slate-950 px-4 text-sm font-bold text-white">Organize with AI</button></form> : null}</div>
            {organizedItems.length ? <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200"><table className="w-full min-w-[42rem] border-collapse text-left text-sm"><thead className="bg-slate-950 text-white"><tr><th className="w-28 px-3 py-2.5">Quantity</th><th className="w-1/3 px-3 py-2.5">Item</th><th className="px-3 py-2.5">Size and details</th></tr></thead><tbody className="divide-y divide-slate-200">{organizedItems.map((item) => { const dimensions = typeof item.metadata?.dimensions === "string" ? item.metadata.dimensions : ""; const thickness = typeof item.metadata?.thickness === "string" ? item.metadata.thickness : ""; const details = typeof item.metadata?.request_details === "string" ? item.metadata.request_details : ""; return <tr key={item.id} className="align-top"><td className="bg-slate-50 px-3 py-3 font-bold tabular-nums">{item.quantity} {item.unit || "each"}</td><td className="px-3 py-3 font-semibold">{item.name}{item.metadata?.needs_review === true ? <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">Review</span> : null}</td><td className="px-3 py-3 leading-5 text-slate-600">{[dimensions && `Size: ${dimensions}`, thickness && `Thickness: ${thickness}`, details].filter(Boolean).join(" · ") || "No additional details"}</td></tr> })}</tbody></table></div> : <div className={`mt-4 rounded-lg px-4 py-3 text-sm font-semibold ${organizationStatus === "failed" ? "bg-rose-50 text-rose-800" : organizationStatus === "plan_requires_takeoff" ? "bg-amber-50 text-amber-800" : "bg-sky-50 text-sky-800"}`}>{organizationStatus === "processing" ? "AI is organizing this material list." : organizationStatus === "failed" ? "Automatic organization needs another attempt." : organizationStatus === "plan_requires_takeoff" ? "This appears to be a plan and requires a takeoff before materials can be listed." : "The original request is saved. Select Organize with AI to create the material chart."}</div>}
          </section>
          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="text-xl font-bold">{organizedItems.length ? "Original request" : "Request breakdown"}</h2>
            <p className="mt-1 text-sm text-slate-500">The customer’s original notes, selections, and uploaded files remain unchanged.</p>
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
          </section>
        </div>
        <CustomerRequestStatus requestId={request.id} status={request.status} />
        <RequestManagementPanel requestId={request.id} requestTitle={request.title} client={{ name: profile?.full_name || "Client", email: profile?.email || "", phone: profile?.phone || "" }} departments={departments} suppliers={suppliers} packages={packages ?? []} requestItems={departmentItems.map((item) => ({ id: item.id, name: item.name, quantity: item.quantity, unit: item.unit }))} projectAddress={request.projects?.address || ""} />
        {clientActions.length ? <section className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-5"><h2 className="text-lg font-bold text-slate-950">Client updates</h2><div className="mt-3 divide-y divide-amber-200">{clientActions.map((event) => <article key={event.id} className="py-3 first:pt-0 last:pb-0"><div className="flex flex-wrap items-start justify-between gap-2"><h3 className="text-sm font-bold text-slate-900">{event.title}</h3><time className="text-xs text-slate-500">{new Date(event.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</time></div>{event.description ? <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{event.description}</p> : null}</article>)}</div></section> : null}
      </div>
    </main>
  )
}
