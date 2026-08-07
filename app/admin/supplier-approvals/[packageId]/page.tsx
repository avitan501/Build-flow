import { Download, FileText, PackageCheck, UserRound } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

import { SupplierApprovalActions } from "@/components/buildflow/supplier-approval-actions"
import { requireAdminProfile } from "@/lib/auth"
import type { MaterialQuestionnaireResponse, MaterialRequestAnswer } from "@/lib/material-questionnaires"

type PackageRecord = { id: string; request_id: string; department: string; supplier_id: string | null; status: string; payload: Record<string, unknown>; created_at: string; approved_at: string | null; sent_at: string | null }
type RequestRecord = { id: string; project_id: string; owner_id: string; title: string; status: string; created_at: string; submitted_at: string | null; projects: { name: string; address: string | null } | null }
type ItemRecord = { id: string; name: string; department: string; item_type: string; quantity: number; unit: string | null; qualification_status: string; answers: unknown; metadata: Record<string, unknown> }
type AttachmentRecord = { id: string; item_id: string | null; material_response_id: string | null; file_name: string; file_path: string; file_type: string | null; file_size: number | null }
type LegacyAnswer = { questionId?: string; label?: string; value?: string; question?: string; answer?: string }
type ManagerState = { qualificationSettings?: { suppliers?: Array<{ id: string; name: string }> } }

function readableBytes(bytes: number | null) {
  if (!bytes) return ""
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function packageStatusLabel(status: string) {
  if (status === "pending_approval") return "Needs review"
  if (status === "approved") return "Approved - not sent"
  return status.replaceAll("_", " ")
}

function legacyAnswers(value: unknown): LegacyAnswer[] {
  return Array.isArray(value) ? value.filter((answer): answer is LegacyAnswer => Boolean(answer) && typeof answer === "object") : []
}

export default async function SupplierApprovalDetailPage({ params }: { params: Promise<{ packageId: string }> }) {
  const { packageId } = await params
  const { supabase } = await requireAdminProfile()
  const { data: pkg } = await supabase.from("supplier_packages").select("id,request_id,department,supplier_id,status,payload,created_at,approved_at,sent_at").eq("id", packageId).maybeSingle<PackageRecord>()
  if (!pkg) notFound()

  const { data: request } = await supabase.from("quote_requests").select("id,project_id,owner_id,title,status,created_at,submitted_at,projects(name,address)").eq("id", pkg.request_id).maybeSingle<RequestRecord>()
  if (!request) notFound()

  const [
    { data: profile },
    { data: items },
    { data: responses },
    { data: attachments },
    { data: managerState },
    { data: projectAnswerRows },
  ] = await Promise.all([
    supabase.from("profiles").select("full_name,email,phone,company_name").eq("id", request.owner_id).maybeSingle<{ full_name: string | null; email: string | null; phone: string | null; company_name: string | null }>(),
    supabase.from("quote_request_items").select("id,name,department,item_type,quantity,unit,qualification_status,answers,metadata").eq("request_id", request.id).order("created_at").returns<ItemRecord[]>(),
    supabase.from("material_questionnaire_responses").select("id,request_id,project_id,owner_id,category_id,category_name_snapshot,category_slug_snapshot,definition_version,definition_snapshot,status,completed_at,created_at,updated_at").eq("request_id", request.id).order("created_at").returns<MaterialQuestionnaireResponse[]>(),
    supabase.from("quote_request_attachments").select("id,item_id,material_response_id,file_name,file_path,file_type,file_size").eq("request_id", request.id).order("created_at").returns<AttachmentRecord[]>(),
    supabase.from("workflow_manager_settings").select("state").eq("id", "singleton").maybeSingle<{ state: ManagerState }>(),
    supabase.from("project_question_answers").select("question_id,value").eq("project_id", request.project_id).returns<Array<{ question_id: string; value: string }>>(),
  ])

  const responseIds = (responses ?? []).map((response) => response.id)
  const questionIds = (projectAnswerRows ?? []).map((answer) => answer.question_id)
  const [{ data: answerRows }, { data: projectQuestions }] = await Promise.all([
    responseIds.length ? supabase.from("material_request_answers").select("id,response_id,question_id,question_key,question_label_snapshot,question_type_snapshot,answer_value,answer_display_snapshot,unit_snapshot").in("response_id", responseIds).order("created_at").returns<MaterialRequestAnswer[]>() : Promise.resolve({ data: [] as MaterialRequestAnswer[] }),
    questionIds.length ? supabase.from("project_questions").select("id,label").in("id", questionIds).returns<Array<{ id: string; label: string }>>() : Promise.resolve({ data: [] as Array<{ id: string; label: string }> }),
  ])
  const projectQuestionMap = new Map((projectQuestions ?? []).map((question) => [question.id, question.label]))
  const signedFiles = await Promise.all((attachments ?? []).map(async (file) => ({ ...file, url: (await supabase.storage.from("project-uploads").createSignedUrl(file.file_path, 1800)).data?.signedUrl ?? null })))
  const suppliers = managerState?.state?.qualificationSettings?.suppliers ?? []
  const selectedSupplier = suppliers.find((supplier) => supplier.id === pkg.supplier_id)
  const returnedForInfo = pkg.payload?.review_status === "returned_for_information"

  return (
    <main className="min-h-screen bg-[#f5f5f7] px-4 pb-28 pt-6 text-slate-950 sm:px-8 sm:pb-12">
      <div className="mx-auto max-w-6xl">
        <Link href="/admin/supplier-approvals" className="text-sm font-semibold text-[#0066cc]">Back to Supplier Requests</Link>

        <header className="mt-5 border-b border-slate-200 pb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0066cc]">{packageStatusLabel(pkg.status)}</p>
              <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{request.title}</h1>
              <p className="mt-2 text-sm text-slate-600">{pkg.department} · {request.projects?.name || "Project"}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 sm:min-w-56">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Assigned supplier</p>
              <p className="mt-1 font-bold">{selectedSupplier?.name || "Not assigned"}</p>
              {returnedForInfo ? <p className="mt-2 text-xs font-semibold text-sky-700">Returned for more information</p> : null}
            </div>
          </div>
        </header>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2"><UserRound className="h-5 w-5 text-[#0066cc]" /><h2 className="text-lg font-bold">Customer</h2></div>
            <dl className="mt-4 grid gap-3 text-sm"><div><dt className="text-slate-500">Name</dt><dd className="font-semibold">{profile?.full_name || "Not provided"}</dd></div><div><dt className="text-slate-500">Company</dt><dd className="font-semibold">{profile?.company_name || "Not provided"}</dd></div><div><dt className="text-slate-500">Email</dt><dd className="font-semibold break-all">{profile?.email || "Not provided"}</dd></div><div><dt className="text-slate-500">Phone</dt><dd className="font-semibold">{profile?.phone || "Not provided"}</dd></div></dl>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2"><PackageCheck className="h-5 w-5 text-[#0066cc]" /><h2 className="text-lg font-bold">Project</h2></div>
            <dl className="mt-4 grid gap-3 text-sm"><div><dt className="text-slate-500">Project name</dt><dd className="font-semibold">{request.projects?.name || "Not provided"}</dd></div><div><dt className="text-slate-500">Address</dt><dd className="font-semibold">{request.projects?.address || "Not provided"}</dd></div><div><dt className="text-slate-500">Request status</dt><dd className="font-semibold capitalize">{request.status.replaceAll("_", " ")}</dd></div></dl>
          </div>
        </section>

        {(projectAnswerRows ?? []).length ? <section className="mt-4 rounded-lg border border-slate-200 bg-white p-5"><h2 className="text-lg font-bold">Project information</h2><dl className="mt-4 divide-y divide-slate-100">{projectAnswerRows!.map((answer) => <div key={answer.question_id} className="grid gap-1 py-3 sm:grid-cols-[minmax(12rem,.8fr)_1.2fr]"><dt className="text-sm font-semibold text-slate-600">{projectQuestionMap.get(answer.question_id) || answer.question_id}</dt><dd className="text-sm font-semibold text-slate-950">{answer.value || "Not answered"}</dd></div>)}</dl></section> : null}

        <section className="mt-4 rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-bold">Requested items</h2>
          <div className="mt-4 divide-y divide-slate-100">
            {(items ?? []).length ? items!.map((item) => {
              const itemAnswers = legacyAnswers(item.answers)
              return <article key={item.id} className="py-5 first:pt-0 last:pb-0"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold">{item.name}</h3><p className="mt-1 text-sm text-slate-500">{item.department} · {item.item_type.replaceAll("_", " ")}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{item.quantity} {item.unit || "each"}</span></div>{itemAnswers.length ? <dl className="mt-4 grid gap-2">{itemAnswers.map((answer, index) => <div key={`${answer.questionId || answer.question || index}`} className="grid gap-1 rounded-lg bg-slate-50 px-4 py-3 sm:grid-cols-[minmax(12rem,.8fr)_1.2fr]"><dt className="text-sm font-semibold text-slate-600">{answer.label || answer.question || "Question"}</dt><dd className="text-sm font-semibold text-slate-950">{answer.value || answer.answer || "Not answered"}</dd></div>)}</dl> : <p className="mt-3 text-sm text-slate-500">No item-level answers were required.</p>}</article>
            }) : <p className="py-5 text-sm text-slate-500">No request items found.</p>}
          </div>
        </section>

        {(responses ?? []).map((response) => {
          const responseAnswers = (answerRows ?? []).filter((answer) => answer.response_id === response.id)
          return <section key={response.id} className="mt-4 rounded-lg border border-slate-200 bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0066cc]">Questionnaire · Version {response.definition_version}</p><h2 className="mt-1 text-lg font-bold">{response.category_name_snapshot}</h2></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${response.status === "complete" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{response.status === "complete" ? "Complete" : "In progress"}</span></div><dl className="mt-4 divide-y divide-slate-100">{responseAnswers.length ? responseAnswers.map((answer) => <div key={answer.question_key} className="grid gap-1 py-3 sm:grid-cols-[minmax(12rem,.8fr)_1.2fr]"><dt className="text-sm font-semibold text-slate-600">{answer.question_label_snapshot}</dt><dd className="text-sm font-semibold text-slate-950">{answer.answer_display_snapshot || "Not answered"}{answer.unit_snapshot && !answer.answer_display_snapshot.includes(answer.unit_snapshot) ? ` ${answer.unit_snapshot}` : ""}</dd></div>) : <p className="py-4 text-sm text-slate-500">No saved questionnaire answers.</p>}</dl></section>
        })}

        <section className="mt-4 rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2"><FileText className="h-5 w-5 text-[#0066cc]" /><h2 className="text-lg font-bold">Files and plans</h2></div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {signedFiles.length ? signedFiles.map((file) => file.url ? <a key={file.id} href={file.url} target="_blank" rel="noreferrer" className="flex min-h-14 items-center justify-between gap-3 rounded-lg border border-slate-200 px-4 py-3 hover:border-sky-300"><span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-950">{file.file_name}</span><span className="mt-1 block text-xs text-slate-500">{file.file_type || "File"}{file.file_size ? ` · ${readableBytes(file.file_size)}` : ""}</span></span><Download className="h-4 w-4 shrink-0 text-[#0066cc]" /></a> : <div key={file.id} className="rounded-lg border border-slate-200 px-4 py-3 text-sm">{file.file_name}</div>) : <p className="text-sm text-slate-500">No files were uploaded with this request.</p>}
          </div>
        </section>

        <section className="mt-4 rounded-lg border border-slate-200 bg-white p-5">
          <SupplierApprovalActions packageId={pkg.id} requestId={request.id} status={pkg.status} initialSupplierId={pkg.supplier_id || ""} suppliers={suppliers} />
        </section>
      </div>
    </main>
  )
}
