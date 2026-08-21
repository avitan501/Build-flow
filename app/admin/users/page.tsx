import { Building2, ClipboardList, FolderKanban, Search, Users } from "lucide-react"
import Link from "next/link"

import { approvePendingUser, changeUserRole, rejectUser, suspendUser } from "@/app/admin/users/actions"
import { CustomerContactForm } from "@/components/buildflow/customer-contact-form"
import { DeleteManagerRecordButton } from "@/components/buildflow/delete-manager-record-button"
import { ManagerCreateClientRequest } from "@/components/buildflow/manager-create-client-request"
import { requireStaffProfile } from "@/lib/auth"
import { MATERIAL_DEPARTMENTS } from "@/lib/material-questionnaires"
import { COMMUNICATION_LOG_PREFIX, parseCommunicationLog, type CommunicationLog } from "@/lib/manager-command-center"
import { isApprovedManagerIdentity } from "@/lib/owner-identity"

const roleOptions = ["admin", "staff", "client"] as const
const deletableRequestStatuses = new Set(["draft", "submitted", "in_review", "quoted"])

type CustomerRecord = {
  id: string
  email: string | null
  full_name: string | null
  company_name: string | null
  phone: string | null
  role: string
  approval_status: string
  is_active: boolean
  created_at: string
}

type RequestRecord = {
  id: string
  project_id: string
  owner_id: string
  title: string
  status: string
  created_at: string
  updated_at: string
  submitted_at: string | null
  projects: { name: string; address: string | null } | null
  material_questionnaire_responses: Array<{ id: string; category_name_snapshot: string; status: string }>
}

type ProjectRecord = {
  id: string
  owner_id: string
  name: string
  address: string | null
  status: string
  created_at: string
  updated_at: string
}
type AuditRecord = { user_id: string; action: string; old_role: string | null; new_role: string | null; created_at: string }

function badgeTone(value: string) {
  if (["approved", "admin", "completed", "quoted", "closed"].includes(value)) return "border-emerald-200 bg-emerald-50 text-emerald-700"
  if (["pending", "staff", "submitted", "in_review", "under_review", "waiting_for_client"].includes(value)) return "border-amber-200 bg-amber-50 text-amber-800"
  if (["rejected", "cancelled"].includes(value)) return "border-rose-200 bg-rose-50 text-rose-700"
  return "border-slate-200 bg-slate-50 text-slate-600"
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value))
}

function customerName(customer: Pick<CustomerRecord, "full_name" | "email"> | undefined) {
  return customer?.full_name?.trim() || customer?.email || "Customer"
}

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ view?: string; q?: string; status?: string; customer?: string }> }) {
  const { supabase, profile, user } = await requireStaffProfile("customers")
  const isOwner = isApprovedManagerIdentity({
    email: user.email || profile?.email,
    role: profile?.role,
    approvalStatus: profile?.approval_status,
    isActive: profile?.is_active,
  })
  const params = await searchParams
  const view = params.view === "requests" ? "requests" : params.view === "projects" ? "projects" : "customers"
  const search = params.q?.trim().toLowerCase() || ""
  const status = params.status?.trim() || "all"

  const [customersResult, requestsResult, projectsResult, auditResult, categoriesResult, communicationResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, full_name, company_name, phone, role, approval_status, is_active, created_at")
      .order("created_at", { ascending: false })
      .returns<CustomerRecord[]>(),
    supabase
      .from("quote_requests")
      .select("id, project_id, owner_id, title, status, created_at, updated_at, submitted_at, projects(name,address), material_questionnaire_responses(id,category_name_snapshot,status)")
      .order("updated_at", { ascending: false })
      .returns<RequestRecord[]>(),
    supabase.from("projects").select("id, owner_id, name, address, status, created_at, updated_at").order("updated_at", { ascending: false }).returns<ProjectRecord[]>(),
    supabase
      .from("approval_actions")
      .select("user_id, action, old_role, new_role, created_at")
      .order("created_at", { ascending: false })
      .limit(6)
      .returns<AuditRecord[]>(),
    supabase
      .from("material_questionnaire_categories")
      .select("department_key")
      .eq("is_active", true)
      .order("sort_order")
      .returns<Array<{ department_key: string }>>(),
    supabase
      .from("manager_goals")
      .select("details")
      .like("details", `${COMMUNICATION_LOG_PREFIX}%`)
      .order("updated_at", { ascending: false })
      .limit(500)
      .returns<Array<{ details: string | null }>>(),
  ])

  if (customersResult.error) throw new Error("Failed to load customer accounts.")
  if (requestsResult.error) throw new Error("Failed to load customer requests.")
  if (projectsResult.error) throw new Error("Failed to load customer projects.")

  const customers = customersResult.data ?? []
  const clientCustomers = customers.filter((customer) => customer.role === "client")
  const requests = requestsResult.data ?? []
  const projects = projectsResult.data ?? []
  const audits = auditResult.data ?? []
  const managerCustomers = clientCustomers.filter((customer) => customer.is_active).map((customer) => ({ id: customer.id, name: customerName(customer), email: customer.email }))
  const departments = Array.from(new Set([...(categoriesResult.data ?? []).map((category) => category.department_key), ...MATERIAL_DEPARTMENTS]))
  const customerMap = new Map(customers.map((customer) => [customer.id, customer]))
  const requestCount = new Map<string, number>()
  const projectRequestCount = new Map<string, number>()
  const projectCount = new Map<string, number>()
  const communicationByClient = new Map<string, CommunicationLog[]>()
  for (const request of requests) {
    requestCount.set(request.owner_id, (requestCount.get(request.owner_id) ?? 0) + 1)
    projectRequestCount.set(request.project_id, (projectRequestCount.get(request.project_id) ?? 0) + 1)
  }
  for (const project of projects) projectCount.set(project.owner_id, (projectCount.get(project.owner_id) ?? 0) + 1)
  for (const row of communicationResult.data ?? []) {
    const log = parseCommunicationLog(row.details)
    if (!log) continue
    communicationByClient.set(log.clientId, [...(communicationByClient.get(log.clientId) ?? []), log])
  }

  const filteredCustomers = clientCustomers.filter((customer) => {
    if (!search) return true
    return [customer.full_name, customer.email, customer.company_name, customer.phone].filter(Boolean).join(" ").toLowerCase().includes(search)
  })
  const filteredRequests = requests.filter((request) => {
    if (params.customer && request.owner_id !== params.customer) return false
    if (status !== "all" && request.status !== status) return false
    if (!search) return true
    const customer = customerMap.get(request.owner_id)
    return [request.title, request.projects?.name, request.projects?.address, customer?.full_name, customer?.email].filter(Boolean).join(" ").toLowerCase().includes(search)
  })
  const filteredProjects = projects.filter((project) => {
    if (params.customer && project.owner_id !== params.customer) return false
    if (status !== "all" && project.status !== status) return false
    if (!search) return true
    const customer = customerMap.get(project.owner_id)
    return [project.name, project.address, customer?.full_name, customer?.email, customer?.company_name].filter(Boolean).join(" ").toLowerCase().includes(search)
  })

  const openRequests = requests.filter((request) => deletableRequestStatuses.has(request.status)).length
  const statuses = Array.from(new Set(requests.map((request) => request.status))).sort()
  const projectStatuses = Array.from(new Set(projects.map((project) => project.status))).sort()
  const pageTitle = view === "customers" ? "Customer Directory" : view === "projects" ? "Customer Projects" : "Customer Requests"
  const pageDescription = view === "customers"
    ? "Customer accounts, contact details, projects, and requests."
    : view === "projects"
      ? "Every customer project, its related requests, and permanent project controls."
      : "Every material and service request submitted by your customers."

  return (
    <main className="min-h-screen bg-[#f5f5f7] px-4 pb-28 pt-6 text-slate-950 sm:px-8 sm:pb-12">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-6">
          <div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0066cc]">Manager</p><h1 className="mt-2 text-3xl font-bold sm:text-4xl">{pageTitle}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{pageDescription}</p></div>
          <ManagerCreateClientRequest customers={managerCustomers} departments={departments} initialCustomerId={params.customer || ""} />
        </header>

        <nav className="mt-6 grid grid-cols-3 gap-1 rounded-lg border border-slate-200 bg-white p-1" aria-label="Customers, projects, and requests views">
          <Link href="/admin/users?view=customers" className={`flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-md px-2 text-sm font-semibold ${view === "customers" ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-50"}`}><Users className="h-4 w-4 shrink-0" /><span className="truncate">Customers</span><span className={`rounded-full px-2 py-0.5 text-xs ${view === "customers" ? "bg-white/15 text-white" : "bg-slate-100 text-slate-700"}`}>{clientCustomers.length}</span></Link>
          <Link href="/admin/users?view=projects" className={`flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-md px-2 text-sm font-semibold ${view === "projects" ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-50"}`}><FolderKanban className="h-4 w-4 shrink-0" /><span className="truncate">Projects</span><span className={`rounded-full px-2 py-0.5 text-xs ${view === "projects" ? "bg-white/15 text-white" : "bg-slate-100 text-slate-700"}`}>{projects.length}</span></Link>
          <Link href="/admin/users?view=requests" className={`flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-md px-2 text-sm font-semibold ${view === "requests" ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-50"}`}><ClipboardList className="h-4 w-4 shrink-0" /><span className="truncate">Requests</span><span className={`rounded-full px-2 py-0.5 text-xs ${view === "requests" ? "bg-white/15 text-white" : "bg-slate-100 text-slate-700"}`}>{openRequests}</span></Link>
        </nav>

        <form className="mt-4 grid gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-[minmax(0,1fr)_auto_auto]" action="/admin/users">
          <input type="hidden" name="view" value={view} />
          {params.customer ? <input type="hidden" name="customer" value={params.customer} /> : null}
          <label className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><span className="sr-only">Search</span><input name="q" defaultValue={params.q || ""} placeholder={view === "customers" ? "Search name, email, company, or phone" : view === "projects" ? "Search project, address, or customer" : "Search request, project, address, or customer"} className="min-h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" /></label>
          {view === "requests" ? <select name="status" defaultValue={status} aria-label="Request status" className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm"><option value="all">All statuses</option>{statuses.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select> : view === "projects" ? <select name="status" defaultValue={status} aria-label="Project status" className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm"><option value="all">All statuses</option>{projectStatuses.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select> : <span />}
          <button type="submit" className="min-h-11 rounded-lg bg-[#0071e3] px-5 text-sm font-semibold text-white">Apply</button>
        </form>

        {view === "customers" ? (
          <section className="mt-4 grid gap-3" aria-label="Customer accounts">
            {filteredCustomers.map((customer) => {
              const isSelf = customer.id === profile?.id
              const communicationLogs = communicationByClient.get(customer.id) ?? []
              return <article key={customer.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0"><h2 className="text-lg font-bold">{customerName(customer)}</h2><p className="mt-1 break-all text-sm text-slate-600">{customer.email || "No email"}</p><p className="mt-1 text-sm text-slate-500">{customer.company_name || "No company"}{customer.phone ? ` · ${customer.phone}` : " · No phone"}</p></div>
                  <div className="flex flex-wrap justify-end gap-2"><span className={`rounded-full border px-3 py-1 text-xs font-semibold ${badgeTone(customer.role)}`}>{customer.role}</span>{isSelf ? <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">Your account</span> : null}</div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-4 border-y border-slate-100 py-3 text-sm"><Link href={`/admin/users?view=projects&customer=${customer.id}`} className="font-semibold text-[#0066cc]"><strong>{projectCount.get(customer.id) ?? 0}</strong> projects</Link><Link href={`/admin/users?view=requests&customer=${customer.id}`} className="font-semibold text-[#0066cc]"><strong>{requestCount.get(customer.id) ?? 0}</strong> requests</Link><span className="text-slate-500">Joined {formatDate(customer.created_at)}</span></div>
                <details className="mt-3"><summary className="cursor-pointer text-sm font-semibold text-slate-700">Edit customer contact</summary><CustomerContactForm customer={{ id: customer.id, fullName: customer.full_name || "", companyName: customer.company_name || "", phone: customer.phone || "" }} /></details>
                {communicationLogs.length ? <details className="mt-3"><summary className="cursor-pointer text-sm font-semibold text-slate-700">Communication log ({communicationLogs.length})</summary><div className="mt-2 divide-y divide-slate-100 rounded-md border border-slate-200 bg-slate-50">{communicationLogs.slice(0, 12).map((log) => <div key={log.id} className="px-3 py-2.5"><div className="flex flex-wrap items-center justify-between gap-2 text-xs"><strong className="capitalize">{log.channel} · {log.direction}</strong><time className="text-slate-500">{formatDate(log.createdAt)}</time></div><p className="mt-1 text-sm text-slate-700">{log.summary}</p>{log.outcome ? <p className="mt-1 text-xs font-semibold text-[#0066cc]">Next: {log.outcome}</p> : null}</div>)}</div></details> : null}
                {isOwner ? <details className="mt-3"><summary className="cursor-pointer text-sm font-semibold text-slate-700">Owner-only account controls</summary><div className="mt-3 flex flex-wrap items-end gap-3 rounded-lg bg-slate-50 p-3">
                  <div className="flex flex-wrap gap-2"><form action={approvePendingUser}><input type="hidden" name="userId" value={customer.id} /><button type="submit" disabled={isSelf || customer.approval_status === "approved"} className="min-h-10 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white disabled:opacity-35">Approve</button></form><form action={suspendUser}><input type="hidden" name="userId" value={customer.id} /><button type="submit" disabled={isSelf || customer.approval_status === "suspended"} className="min-h-10 rounded-lg border border-amber-300 bg-white px-4 text-sm font-semibold text-amber-800 disabled:opacity-35">Suspend</button></form><form action={rejectUser}><input type="hidden" name="userId" value={customer.id} /><button type="submit" disabled={isSelf || customer.approval_status === "rejected"} className="min-h-10 rounded-lg border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-700 disabled:opacity-35">Reject</button></form></div>
                  <form action={changeUserRole} className="flex flex-wrap items-center gap-2"><input type="hidden" name="userId" value={customer.id} /><label className="text-xs font-semibold text-slate-600">Role <select name="role" defaultValue={customer.role} disabled={isSelf} className="ml-1 min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm">{roleOptions.map((role) => <option key={role}>{role}</option>)}</select></label><button type="submit" disabled={isSelf} className="min-h-10 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-35">Save role</button></form>
                  {!isSelf && customer.role === "client" ? <div className="w-full border-t border-slate-200 pt-3"><DeleteManagerRecordButton id={customer.id} kind="customer" label={customerName(customer)} projectCount={projectCount.get(customer.id) ?? 0} requestCount={requestCount.get(customer.id) ?? 0} /></div> : null}
                </div></details> : null}
              </article>
            })}
            {filteredCustomers.length === 0 ? <p className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No customers match this search.</p> : null}
          </section>
        ) : view === "projects" ? (
          <section className="mt-4 grid gap-3" aria-label="Customer projects">
            {params.customer ? <div className="flex items-center justify-between gap-3 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm"><span>Showing projects for <strong>{customerName(customerMap.get(params.customer))}</strong></span><Link href="/admin/users?view=projects" className="font-semibold text-[#0066cc]">Clear</Link></div> : null}
            {filteredProjects.map((project) => {
              const customer = customerMap.get(project.owner_id)
              const relatedRequests = projectRequestCount.get(project.id) ?? 0
              return <article key={project.id} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <Link href={`/projects/${project.id}`} className="min-w-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[#0066cc]"><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold">{project.name}</h2><span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${badgeTone(project.status)}`}>{project.status}</span></div><p className="mt-1 text-sm text-slate-600">{project.address || "No address"}</p><p className="mt-2 text-xs text-slate-500">{customerName(customer)} · {relatedRequests} request{relatedRequests === 1 ? "" : "s"} · Updated {formatDate(project.updated_at)}</p></Link>
                <DeleteManagerRecordButton id={project.id} kind="project" label={project.name} requestCount={relatedRequests} />
              </article>
            })}
            {filteredProjects.length === 0 ? <p className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No projects match these filters.</p> : null}
          </section>
        ) : (
          <section className="mt-4 grid gap-3" aria-label="Customer requests">
            {params.customer ? <div className="flex items-center justify-between gap-3 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm"><span>Showing requests for <strong>{customerName(customerMap.get(params.customer))}</strong></span><Link href="/admin/users?view=requests" className="font-semibold text-[#0066cc]">Clear</Link></div> : null}
            {filteredRequests.map((request) => { const customer = customerMap.get(request.owner_id); const isOpen = deletableRequestStatuses.has(request.status); return <article key={request.id} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <Link href={`/owner/materials/requests/${request.id}`} className="min-w-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[#0066cc]"><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold">{request.title}</h2><span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${badgeTone(request.status)}`}>{request.status.replaceAll("_", " ")}</span></div><p className="mt-1 text-sm text-slate-600">{request.projects?.name === "Material Requests" ? "Direct material request" : request.projects?.name || "Direct material request"}{request.projects?.name !== "Material Requests" && request.projects?.address ? ` · ${request.projects.address}` : ""}</p><p className="mt-2 text-xs text-slate-500">{customerName(customer)} · Updated {formatDate(request.updated_at)}</p><div className="mt-3 flex flex-wrap gap-2">{request.material_questionnaire_responses.length ? request.material_questionnaire_responses.map((response) => <span key={response.id} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${response.status === "complete" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{response.category_name_snapshot}</span>) : <span className="text-xs font-semibold text-slate-400">Manual material list</span>}</div></Link>
              {isOpen ? <DeleteManagerRecordButton id={request.id} kind="request" label={request.title} /> : <span className="text-xs font-semibold text-slate-400">Closed requests are retained</span>}
            </article> })}
            {filteredRequests.length === 0 ? <p className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No requests match these filters.</p> : null}
          </section>
        )}

        {view === "customers" && isOwner && audits.length ? <section className="mt-6 border-t border-slate-200 pt-5"><div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-[#0066cc]" /><h2 className="text-sm font-bold">Recent account changes</h2></div><div className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">{audits.map((audit, index) => <div key={`${audit.user_id}-${audit.created_at}-${index}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"><span><strong>{customerName(customerMap.get(audit.user_id))}</strong> · {audit.action.replaceAll("_", " ")}{audit.new_role ? ` to ${audit.new_role}` : ""}</span><time className="text-xs text-slate-500">{formatDate(audit.created_at)}</time></div>)}</div></section> : null}
      </div>
    </main>
  )
}
