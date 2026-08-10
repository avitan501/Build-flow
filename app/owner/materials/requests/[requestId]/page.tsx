import Link from "next/link"
import { notFound } from "next/navigation"

import { CustomerRequestStatus } from "@/components/buildflow/customer-request-status"
import { RequestManagementPanel } from "@/components/buildflow/request-management-panel"
import type { MaterialQuestionnaireResponse, MaterialRequestAnswer } from "@/lib/material-questionnaires"
import { requireOwnerAccess } from "@/lib/owner-access"
import { quoteRequestStatusLabel, type QuoteRequestStatus } from "@/lib/quote-requests"
import type { SupplierRoutingOption } from "@/lib/shop-qualification"

type RequestDetails = { id: string; owner_id: string; title: string; status: QuoteRequestStatus; created_at: string; submitted_at: string | null; projects: { name: string; address: string | null } | null }
type Attachment = { id: string; material_response_id: string | null; file_name: string; file_path: string; file_type: string | null }
type RequestItem = { id: string; name: string; department: string; item_type: string; quantity: number; unit: string | null; answers: unknown }
type LegacyAnswer = { questionId?: string; label?: string; value?: string; question?: string; answer?: string }
type SupplierPackage = { id: string; department: string; supplier_id: string | null; status: string }

function legacyAnswers(value: unknown): LegacyAnswer[] {
  return Array.isArray(value) ? value.filter((answer): answer is LegacyAnswer => Boolean(answer) && typeof answer === "object") : []
}

export default async function OwnerMaterialRequestPage({ params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params
  const { supabase } = await requireOwnerAccess()
  const [{ data: request }, { data: responses }, { data: attachments }, { data: items }, { data: managerSettings }, { data: packages }] = await Promise.all([
    supabase.from("quote_requests").select("id,owner_id,title,status,created_at,submitted_at,projects(name,address)").eq("id", requestId).maybeSingle<RequestDetails>(),
    supabase.from("material_questionnaire_responses").select("id, request_id, project_id, owner_id, category_id, category_name_snapshot, category_slug_snapshot, definition_version, definition_snapshot, status, completed_at, created_at, updated_at").eq("request_id", requestId).order("created_at").returns<MaterialQuestionnaireResponse[]>(),
    supabase.from("quote_request_attachments").select("id,material_response_id,file_name,file_path,file_type").eq("request_id", requestId).returns<Attachment[]>(),
    supabase.from("quote_request_items").select("id,name,department,item_type,quantity,unit,answers").eq("request_id", requestId).order("created_at").returns<RequestItem[]>(),
    supabase.from("workflow_manager_settings").select("state").eq("id", "singleton").maybeSingle<{ state: { qualificationSettings?: { suppliers?: SupplierRoutingOption[] } } }>(),
    supabase.from("supplier_packages").select("id,department,supplier_id,status").eq("request_id", requestId).order("created_at").returns<SupplierPackage[]>(),
  ])
  if (!request) notFound()

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
  const departments = Array.from(new Set((items ?? []).map((item) => item.department).filter(Boolean)))
  if (!departments.length) departments.push("General request")

  return (
    <main className="min-h-screen bg-[#f5f5f7] px-4 pb-28 pt-5 text-slate-950 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/owner/materials/requests" className="text-sm font-semibold text-[#0066cc]">Back to Material Requests</Link>
        <header className="mt-5 rounded-[20px] border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[11px] font-semibold uppercase tracking-[.14em] text-[#0066cc]">{quoteRequestStatusLabel(request.status)}</p><h1 className="mt-1 text-2xl font-bold">{request.title}</h1><p className="mt-2 text-sm text-slate-600">{request.projects?.name}{request.projects?.address ? ` · ${request.projects.address}` : ""}</p></div><div className="text-right text-sm text-slate-600"><p className="font-semibold text-slate-950">{profile?.full_name || "Client"}</p><p>{profile?.email}</p><p>{profile?.phone}</p></div></div>
        </header>
        <CustomerRequestStatus requestId={request.id} status={request.status} />
        <RequestManagementPanel requestId={request.id} requestTitle={request.title} client={{ name: profile?.full_name || "Client", email: profile?.email || "", phone: profile?.phone || "" }} departments={departments} suppliers={suppliers} packages={packages ?? []} />
        <div className="mt-4 grid gap-4">
          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="text-xl font-bold">Requested items</h2>
            <div className="mt-4 divide-y divide-slate-100">
              {(items ?? []).length ? items!.map((item) => {
                const itemAnswers = legacyAnswers(item.answers)
                return <article key={item.id} className="py-4 first:pt-0 last:pb-0"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold">{item.name}</h3><p className="mt-1 text-sm text-slate-500">{item.department} · {item.item_type.replaceAll("_", " ")}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{item.quantity} {item.unit || "each"}</span></div>{itemAnswers.length ? <dl className="mt-3 grid gap-2">{itemAnswers.map((answer, index) => <div key={`${answer.questionId || answer.question || index}`} className="grid gap-1 rounded-lg bg-slate-50 px-4 py-3 sm:grid-cols-[minmax(12rem,.8fr)_1.2fr]"><dt className="text-sm font-semibold text-slate-600">{answer.label || answer.question || "Question"}</dt><dd className="text-sm font-semibold text-slate-950">{answer.value || answer.answer || "Not answered"}</dd></div>)}</dl> : null}</article>
              }) : <p className="text-sm text-slate-500">No request items found.</p>}
            </div>
          </section>
          {generalFiles.length ? <section className="rounded-lg border border-slate-200 bg-white p-5"><h2 className="text-xl font-bold">Attachments</h2><p className="mt-1 text-sm text-slate-500">Plans and material lists submitted with this request.</p><div className="mt-4 flex flex-wrap gap-2">{generalFiles.map((file) => file.url ? <a key={file.id} href={file.url} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-[#0066cc]">{file.file_name}</a> : <span key={file.id} className="text-sm">{file.file_name}</span>)}</div></section> : null}
          {(responses ?? []).map((response) => {
            const responseFiles = signedFiles.filter((file) => file.material_response_id === response.id)
            return <article key={response.id} className="rounded-[20px] border border-slate-200 bg-white p-5"><div className="flex items-center justify-between gap-3"><div><p className="text-[11px] font-semibold uppercase tracking-[.14em] text-[#0066cc]">Version {response.definition_version}</p><h2 className="mt-1 text-xl font-bold">{response.category_name_snapshot}</h2></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${response.status === "complete" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{response.status === "complete" ? "Complete" : "In progress"}</span></div><dl className="mt-5 grid gap-2">{answers.filter((answer) => answer.response_id === response.id).map((answer) => <div key={answer.question_key} className="grid gap-1 rounded-xl bg-slate-50 px-4 py-3 sm:grid-cols-[minmax(12rem,.8fr)_1.2fr]"><dt className="text-sm font-semibold text-slate-700">{answer.question_label_snapshot}</dt><dd className="text-sm text-slate-950">{answer.answer_display_snapshot || "Not answered"}{answer.unit_snapshot && !answer.answer_display_snapshot.includes(answer.unit_snapshot) ? ` ${answer.unit_snapshot}` : ""}</dd></div>)}</dl>{responseFiles.length ? <div className="mt-4 border-t border-slate-100 pt-4"><h3 className="text-sm font-bold">Files</h3><div className="mt-2 flex flex-wrap gap-2">{responseFiles.map((file) => file.url ? <a key={file.id} href={file.url} target="_blank" rel="noreferrer" className="rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-[#0066cc]">{file.file_name}</a> : <span key={file.id}>{file.file_name}</span>)}</div></div> : null}</article>
          })}
        </div>
      </div>
    </main>
  )
}
