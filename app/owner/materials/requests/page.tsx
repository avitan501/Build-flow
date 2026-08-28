import Link from "next/link"

import { ManagerCreateClientRequest } from "@/components/buildflow/manager-create-client-request"
import { MaterialRequestStatusControl } from "@/components/buildflow/material-request-status-control"
import { requireStaffProfile } from "@/lib/auth"
import { MATERIAL_DEPARTMENTS } from "@/lib/material-questionnaires"
import { convertSmsRequestDraftAction, updateSmsRequestDraftAction } from "./actions"

type InboxRequest = {
  id: string
  owner_id: string
  title: string
  status: string
  manager_assignee: string
  created_at: string
  submitted_at: string | null
  projects: { name: string; address: string | null } | null
  material_questionnaire_responses: Array<{ id: string; category_name_snapshot: string; status: string }>
}

export default async function MaterialRequestsInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>
}) {
  const { created = "" } = await searchParams
  const { supabase } = await requireStaffProfile("customers")
  const [{ data, error }, { data: customerProfiles }, { data: categories }, { data: textDrafts }] = await Promise.all([
    supabase
      .from("quote_requests")
      .select("id, owner_id, title, status, manager_assignee, created_at, submitted_at, projects(name,address), material_questionnaire_responses(id,category_name_snapshot,status)")
      .order("created_at", { ascending: false })
      .returns<InboxRequest[]>(),
    supabase.from("profiles").select("id,full_name,email,role,is_active").order("full_name").returns<Array<{ id: string; full_name: string | null; email: string | null; role: string; is_active: boolean }>>(),
    supabase.from("material_questionnaire_categories").select("department_key").eq("is_active", true).order("sort_order").returns<Array<{ department_key: string }>>(),
    supabase.from("aura_sms_request_drafts").select("id,sender_phone,customer_name,title,department,items,original_message,created_at").eq("status", "new").order("created_at", { ascending: false }).limit(50).returns<Array<{ id: string; sender_phone: string; customer_name: string; title: string; department: string; items: Array<{ name: string; quantity: number; unit: string }>; original_message: string | null; created_at: string }>>(),
  ])
  if (error) throw new Error(`Could not load material requests: ${error.message}`)

  const requests = data ?? []
  const profileMap = new Map((customerProfiles ?? []).map((profile) => [profile.id, profile]))
  const customerOptions = (customerProfiles ?? []).filter((profile) => profile.role === "client" && profile.is_active).map((profile) => ({ id: profile.id, name: profile.full_name?.trim() || profile.email || "Customer", email: profile.email }))
  const departments = Array.from(new Set([...(categories ?? []).map((category) => category.department_key), ...MATERIAL_DEPARTMENTS]))
  const activeRequests = requests.filter((request) => request.status !== "closed")
  const closedRequests = requests.filter((request) => request.status === "closed")
  const statusLabels: Record<string, string> = { draft: "Draft", submitted: "New", in_review: "In progress", quoted: "Quote sent", closed: "Archived" }

  function requestCard(request: InboxRequest) {
    const profile = profileMap.get(request.owner_id)
    return <article key={request.id} className={`grid gap-4 rounded-[20px] border bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,.05)] sm:grid-cols-[minmax(0,1fr)_13rem] sm:items-center ${created === request.id ? "border-emerald-400 ring-2 ring-emerald-100" : "border-slate-200"}`}>
      <Link href={`/owner/materials/requests/${request.id}`} className="min-w-0 rounded-lg outline-none transition hover:text-[#0066cc] focus-visible:ring-2 focus-visible:ring-[#0066cc] focus-visible:ring-offset-4">
        <div className="flex flex-wrap items-center gap-2"><h2 className="font-bold">{request.title}</h2><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase text-slate-600">{statusLabels[request.status] || request.status.replaceAll("_", " ")}</span></div>
        <p className="mt-1 text-sm text-slate-600">{request.projects?.name === "Material Requests" ? "Direct material request" : request.projects?.name || "Direct material request"}{request.projects?.name !== "Material Requests" && request.projects?.address ? ` · ${request.projects.address}` : ""}</p>
        <p className="mt-2 text-xs text-slate-500">{profile?.full_name || profile?.email || "Client"} · {new Date(request.created_at).toLocaleString()}</p>
        <div className="mt-3 flex flex-wrap gap-2">{request.material_questionnaire_responses.length ? request.material_questionnaire_responses.map((response) => <span key={response.id} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${response.status === "complete" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{response.category_name_snapshot}</span>) : <span className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700">Direct quote request</span>}</div>
      </Link>
      <MaterialRequestStatusControl requestId={request.id} status={request.status} assignee={request.manager_assignee} />
    </article>
  }

  return (
    <main className="min-h-screen bg-[#f5f5f7] px-4 pb-28 pt-5 text-slate-950 sm:px-8">
      <div className="mx-auto max-w-6xl">
        {created ? <div role="status" className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">Client request created successfully. The order is listed below.</div> : null}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link href="/admin/users?view=requests" className="text-sm font-semibold text-[#0066cc]">Back to Customer Requests</Link>
            <p className="mt-5 text-[11px] font-semibold uppercase tracking-[.16em] text-[#0066cc]">Manager inbox</p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Material requests</h1>
            <p className="mt-2 text-sm text-slate-600">Client questionnaire answers, project details, and uploaded plans.</p>
          </div>
          <ManagerCreateClientRequest customers={customerOptions} departments={departments} />
        </div>
        {textDrafts?.length ? <section className="mt-7 rounded-[20px] border border-sky-200 bg-sky-50/70 p-3 sm:p-4" aria-label="Text request drafts"><div className="flex items-center justify-between gap-3"><div><h2 className="font-bold text-slate-950">Requests found in text messages</h2><p className="mt-0.5 text-xs text-slate-600">AI extracted the list. Check the name and items before creating the customer request.</p></div><span className="rounded-full bg-sky-700 px-2.5 py-1 text-[10px] font-bold text-white">{textDrafts.length} to review</span></div><div className="mt-3 grid gap-2">{textDrafts.map((draft) => <article key={draft.id} className="rounded-xl border border-sky-100 bg-white p-3 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="text-sm font-bold">{draft.title}</h3><p className="mt-0.5 text-[11px] text-slate-500">{draft.sender_phone} · {draft.department} · {new Date(draft.created_at).toLocaleString()}</p></div><Link href={`/admin/communications?channel=sms&q=${encodeURIComponent(draft.sender_phone)}`} className="rounded-full border border-slate-200 px-2.5 py-1 text-[10px] font-bold text-sky-700">Open text</Link></div><div className="mt-2 flex flex-wrap gap-1">{draft.items.map((item, index) => <span key={`${item.name}-${index}`} className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-700">{item.quantity || 1} {item.unit || "each"} · {item.name}</span>)}</div><form action={updateSmsRequestDraftAction} className="mt-3 flex flex-wrap gap-2"><input type="hidden" name="draftId" value={draft.id} /><input name="customerName" defaultValue={draft.customer_name || draft.sender_phone} aria-label="Customer name" className="h-9 min-w-48 flex-1 rounded-md border border-slate-300 px-2.5 text-xs" /><button name="intent" value="save" className="h-9 rounded-md border border-slate-300 bg-white px-3 text-[11px] font-bold">Save name</button><button name="intent" value="dismiss" className="h-9 rounded-md px-2 text-[11px] font-semibold text-slate-500">Dismiss</button></form><form action={convertSmsRequestDraftAction} className="mt-2 flex flex-wrap gap-2"><input type="hidden" name="draftId" value={draft.id} /><select name="customerId" required className="h-9 min-w-48 flex-1 rounded-md border border-slate-300 bg-white px-2 text-xs"><option value="">Choose linked customer</option>{customerOptions.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select><button className="h-9 rounded-md bg-slate-950 px-3 text-[11px] font-bold text-white">Create request</button></form></article>)}</div></section> : null}
        <div className="mt-7 grid gap-3">
          {activeRequests.map(requestCard)}
          {requests.length === 0 ? <div className="rounded-[20px] border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No customer requests have been submitted yet.</div> : null}
        </div>
        {closedRequests.length ? <details className="group mt-6 overflow-hidden rounded-[20px] border border-slate-200 bg-white"><summary className="flex min-h-14 cursor-pointer list-none items-center justify-between px-4 text-sm font-bold text-slate-700"><span>Archived requests</span><span className="text-xs text-slate-500">{closedRequests.length} · <span className="group-open:hidden">Show</span><span className="hidden group-open:inline">Hide</span></span></summary><div className="grid gap-3 border-t border-slate-200 bg-slate-50 p-3 sm:p-4">{closedRequests.map(requestCard)}</div></details> : null}
      </div>
    </main>
  )
}
