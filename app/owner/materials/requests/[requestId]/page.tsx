import Link from "next/link"
import { notFound } from "next/navigation"

import type { MaterialQuestionnaireResponse, MaterialRequestAnswer } from "@/lib/material-questionnaires"
import { requireOwnerAccess } from "@/lib/owner-access"

type RequestDetails = { id: string; owner_id: string; title: string; status: string; created_at: string; submitted_at: string | null; projects: { name: string; address: string | null } | null }
type Attachment = { id: string; material_response_id: string | null; file_name: string; file_path: string; file_type: string | null }

export default async function OwnerMaterialRequestPage({ params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params
  const { supabase } = await requireOwnerAccess()
  const [{ data: request }, { data: responses }, { data: attachments }] = await Promise.all([
    supabase.from("quote_requests").select("id,owner_id,title,status,created_at,submitted_at,projects(name,address)").eq("id", requestId).maybeSingle<RequestDetails>(),
    supabase.from("material_questionnaire_responses").select("id, request_id, project_id, owner_id, category_id, category_name_snapshot, category_slug_snapshot, definition_version, definition_snapshot, status, completed_at, created_at, updated_at").eq("request_id", requestId).order("created_at").returns<MaterialQuestionnaireResponse[]>(),
    supabase.from("quote_request_attachments").select("id,material_response_id,file_name,file_path,file_type").eq("request_id", requestId).returns<Attachment[]>(),
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

  return (
    <main className="min-h-screen bg-[#f5f5f7] px-4 pb-28 pt-5 text-slate-950 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/owner/materials/requests" className="text-sm font-semibold text-[#0066cc]">Back to Material Requests</Link>
        <header className="mt-5 rounded-[20px] border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[11px] font-semibold uppercase tracking-[.14em] text-[#0066cc]">{request.status.replaceAll("_", " ")}</p><h1 className="mt-1 text-2xl font-bold">{request.title}</h1><p className="mt-2 text-sm text-slate-600">{request.projects?.name}{request.projects?.address ? ` · ${request.projects.address}` : ""}</p></div><div className="text-right text-sm text-slate-600"><p className="font-semibold text-slate-950">{profile?.full_name || "Client"}</p><p>{profile?.email}</p><p>{profile?.phone}</p></div></div>
        </header>
        <div className="mt-4 grid gap-4">
          {(responses ?? []).map((response) => {
            const responseFiles = signedFiles.filter((file) => file.material_response_id === response.id)
            return <article key={response.id} className="rounded-[20px] border border-slate-200 bg-white p-5"><div className="flex items-center justify-between gap-3"><div><p className="text-[11px] font-semibold uppercase tracking-[.14em] text-[#0066cc]">Version {response.definition_version}</p><h2 className="mt-1 text-xl font-bold">{response.category_name_snapshot}</h2></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${response.status === "complete" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{response.status === "complete" ? "Complete" : "In progress"}</span></div><dl className="mt-5 grid gap-2">{answers.filter((answer) => answer.response_id === response.id).map((answer) => <div key={answer.question_key} className="grid gap-1 rounded-xl bg-slate-50 px-4 py-3 sm:grid-cols-[minmax(12rem,.8fr)_1.2fr]"><dt className="text-sm font-semibold text-slate-700">{answer.question_label_snapshot}</dt><dd className="text-sm text-slate-950">{answer.answer_display_snapshot || "Not answered"}{answer.unit_snapshot && !answer.answer_display_snapshot.includes(answer.unit_snapshot) ? ` ${answer.unit_snapshot}` : ""}</dd></div>)}</dl>{responseFiles.length ? <div className="mt-4 border-t border-slate-100 pt-4"><h3 className="text-sm font-bold">Files</h3><div className="mt-2 flex flex-wrap gap-2">{responseFiles.map((file) => file.url ? <a key={file.id} href={file.url} target="_blank" rel="noreferrer" className="rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-[#0066cc]">{file.file_name}</a> : <span key={file.id}>{file.file_name}</span>)}</div></div> : null}</article>
          })}
        </div>
      </div>
    </main>
  )
}
