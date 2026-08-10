import Link from "next/link"

import { requireOwnerAccess } from "@/lib/owner-access"

type InboxRequest = {
  id: string
  owner_id: string
  title: string
  status: string
  created_at: string
  submitted_at: string | null
  projects: { name: string; address: string | null } | null
  material_questionnaire_responses: Array<{ id: string; category_name_snapshot: string; status: string }>
}

export default async function MaterialRequestsInboxPage() {
  const { supabase } = await requireOwnerAccess()
  const { data, error } = await supabase
    .from("quote_requests")
    .select("id, owner_id, title, status, created_at, submitted_at, projects(name,address), material_questionnaire_responses(id,category_name_snapshot,status)")
    .order("created_at", { ascending: false })
    .returns<InboxRequest[]>()
  if (error) throw new Error(`Could not load material requests: ${error.message}`)

  const requests = data ?? []
  const { data: profiles } = requests.length
    ? await supabase.from("profiles").select("id,full_name,email").in("id", requests.map((request) => request.owner_id))
    : { data: [] as Array<{ id: string; full_name: string | null; email: string | null }> }
  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]))

  return (
    <main className="min-h-screen bg-[#f5f5f7] px-4 pb-28 pt-5 text-slate-950 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link href="/owner/materials" className="text-sm font-semibold text-[#0066cc]">Back to Material Admin</Link>
            <p className="mt-5 text-[11px] font-semibold uppercase tracking-[.16em] text-[#0066cc]">Owner inbox</p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Material requests</h1>
            <p className="mt-2 text-sm text-slate-600">Client questionnaire answers, project details, and uploaded plans.</p>
          </div>
          <Link href="/admin/settings/material-order-questions" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold">Manage questions</Link>
        </div>
        <div className="mt-7 grid gap-3">
          {requests.map((request) => {
            const profile = profileMap.get(request.owner_id)
            return (
              <Link key={request.id} href={`/owner/materials/requests/${request.id}`} className="grid gap-4 rounded-[20px] border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,.05)] transition hover:border-sky-300 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2"><h2 className="font-bold">{request.title}</h2><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase text-slate-600">{request.status.replaceAll("_", " ")}</span></div>
                  <p className="mt-1 text-sm text-slate-600">{request.projects?.name || "Project"}{request.projects?.address ? ` · ${request.projects.address}` : ""}</p>
                  <p className="mt-2 text-xs text-slate-500">{profile?.full_name || profile?.email || "Client"} · {new Date(request.created_at).toLocaleString()}</p>
                </div>
                <div className="flex flex-wrap gap-2">{request.material_questionnaire_responses.length ? request.material_questionnaire_responses.map((response) => <span key={response.id} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${response.status === "complete" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{response.category_name_snapshot}</span>) : <span className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700">Direct quote request</span>}</div>
              </Link>
            )
          })}
          {requests.length === 0 ? <div className="rounded-[20px] border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No customer requests have been submitted yet.</div> : null}
        </div>
      </div>
    </main>
  )
}
