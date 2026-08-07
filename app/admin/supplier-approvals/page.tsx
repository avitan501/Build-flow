import { CheckCircle2, CircleAlert, Clock3, PackageCheck, XCircle } from "lucide-react"
import Link from "next/link"

import { requireAdminProfile } from "@/lib/auth"

type PackageRow = {
  id: string
  request_id: string
  department: string
  supplier_id: string | null
  status: "pending_approval" | "approved" | "sent" | "failed" | "cancelled"
  payload: Record<string, unknown>
  created_at: string
  updated_at: string
  quote_requests: {
    id: string
    owner_id: string
    title: string
    status: string
    submitted_at: string | null
    projects: { name: string; address: string | null } | null
  } | null
}

type ManagerState = { qualificationSettings?: { suppliers?: Array<{ id: string; name: string }> } }

const filters = [
  { value: "pending", label: "Needs review" },
  { value: "approved", label: "Approved" },
  { value: "all", label: "All packages" },
] as const

const statusStyles: Record<string, string> = {
  pending_approval: "border-amber-200 bg-amber-50 text-amber-800",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  sent: "border-sky-200 bg-sky-50 text-sky-700",
  failed: "border-rose-200 bg-rose-50 text-rose-700",
  cancelled: "border-slate-200 bg-slate-100 text-slate-600",
}

function statusLabel(status: string) {
  if (status === "pending_approval") return "Needs review"
  return status.charAt(0).toUpperCase() + status.slice(1).replaceAll("_", " ")
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value))
}

export default async function SupplierApprovalsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const params = await searchParams
  const view = filters.some((filter) => filter.value === params.view) ? params.view! : "pending"
  const { supabase } = await requireAdminProfile()

  const [{ data: packageRows, error }, { data: managerState }] = await Promise.all([
    supabase
      .from("supplier_packages")
      .select("id,request_id,department,supplier_id,status,payload,created_at,updated_at,quote_requests(id,owner_id,title,status,submitted_at,projects(name,address))")
      .order("created_at", { ascending: false })
      .returns<PackageRow[]>(),
    supabase.from("workflow_manager_settings").select("state").eq("id", "singleton").maybeSingle<{ state: ManagerState }>(),
  ])
  if (error) throw new Error(`Could not load supplier approvals: ${error.message}`)

  const packages = packageRows ?? []
  const requestIds = [...new Set(packages.map((pkg) => pkg.request_id))]
  const ownerIds = [...new Set(packages.map((pkg) => pkg.quote_requests?.owner_id).filter((id): id is string => Boolean(id)))]
  const [{ data: profiles }, { data: items }, { data: attachments }] = await Promise.all([
    ownerIds.length ? supabase.from("profiles").select("id,full_name,email").in("id", ownerIds) : Promise.resolve({ data: [] }),
    requestIds.length ? supabase.from("quote_request_items").select("request_id").in("request_id", requestIds) : Promise.resolve({ data: [] }),
    requestIds.length ? supabase.from("quote_request_attachments").select("request_id").in("request_id", requestIds) : Promise.resolve({ data: [] }),
  ])

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]))
  const supplierMap = new Map((managerState?.state?.qualificationSettings?.suppliers ?? []).map((supplier) => [supplier.id, supplier.name]))
  const itemCounts = new Map<string, number>()
  const fileCounts = new Map<string, number>()
  for (const item of items ?? []) itemCounts.set(item.request_id, (itemCounts.get(item.request_id) ?? 0) + 1)
  for (const file of attachments ?? []) fileCounts.set(file.request_id, (fileCounts.get(file.request_id) ?? 0) + 1)

  const visiblePackages = packages.filter((pkg) => {
    if (view === "pending") return pkg.status === "pending_approval"
    if (view === "approved") return pkg.status === "approved" || pkg.status === "sent"
    return true
  })
  const pendingCount = packages.filter((pkg) => pkg.status === "pending_approval").length
  const approvedCount = packages.filter((pkg) => pkg.status === "approved").length

  return (
    <main className="min-h-screen bg-[#f5f5f7] px-4 pb-28 pt-6 text-slate-950 sm:px-8 sm:pb-12">
      <div className="mx-auto max-w-7xl">
        <header className="border-b border-slate-200 pb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0066cc]">Manager review</p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Supplier Approval Inbox</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Review customer details, answers, items, and files before approving a supplier package. Nothing is sent automatically.</p>
        </header>

        <section className="mt-6 grid gap-3 sm:grid-cols-3" aria-label="Approval summary">
          <div className="rounded-lg border border-amber-200 bg-white p-4"><Clock3 className="h-5 w-5 text-amber-700" /><p className="mt-3 text-3xl font-bold">{pendingCount}</p><p className="text-sm font-semibold text-slate-600">Needs review</p></div>
          <div className="rounded-lg border border-emerald-200 bg-white p-4"><PackageCheck className="h-5 w-5 text-emerald-700" /><p className="mt-3 text-3xl font-bold">{approvedCount}</p><p className="text-sm font-semibold text-slate-600">Approved, not sent</p></div>
          <div className="rounded-lg border border-slate-200 bg-white p-4"><CheckCircle2 className="h-5 w-5 text-[#0066cc]" /><p className="mt-3 text-3xl font-bold">{packages.length}</p><p className="text-sm font-semibold text-slate-600">Total packages</p></div>
        </section>

        <nav className="mt-6 grid grid-cols-3 rounded-lg border border-slate-200 bg-white p-1" aria-label="Approval filters">
          {filters.map((filter) => <Link key={filter.value} href={`/admin/supplier-approvals?view=${filter.value}`} className={`flex min-h-11 items-center justify-center rounded-md px-3 text-center text-sm font-semibold ${view === filter.value ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-50"}`}>{filter.label}</Link>)}
        </nav>

        <section className="mt-5 grid gap-3">
          {visiblePackages.length ? visiblePackages.map((pkg) => {
            const request = pkg.quote_requests
            const profile = request ? profileMap.get(request.owner_id) : null
            const supplierName = pkg.supplier_id ? supplierMap.get(pkg.supplier_id) : null
            const returned = pkg.payload?.review_status === "returned_for_information"
            return (
              <Link key={pkg.id} href={`/admin/supplier-approvals/${pkg.id}`} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-300 hover:shadow-md lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold text-slate-950">{request?.title || "Supplier package"}</h2>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase ${statusStyles[pkg.status] ?? statusStyles.cancelled}`}>{statusLabel(pkg.status)}</span>
                    {returned ? <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold uppercase text-sky-700">Returned for information</span> : null}
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{request?.projects?.name || "Project"}{request?.projects?.address ? ` · ${request.projects.address}` : ""}</p>
                  <p className="mt-1 text-sm text-slate-600">{profile?.full_name || profile?.email || "Client"} · {pkg.department}</p>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-slate-500">
                    <span>{itemCounts.get(pkg.request_id) ?? 0} item(s)</span>
                    <span>{fileCounts.get(pkg.request_id) ?? 0} file(s)</span>
                    <span>{formatDate(pkg.created_at)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 lg:block lg:min-w-52 lg:text-right">
                  <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Assigned supplier</p><p className="mt-1 text-sm font-bold text-slate-950">{supplierName || "Not assigned"}</p></div>
                  <span className="text-sm font-semibold text-[#0066cc]">Review request</span>
                </div>
              </Link>
            )
          }) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white px-5 py-14 text-center">
              {view === "pending" ? <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" /> : view === "approved" ? <CircleAlert className="mx-auto h-8 w-8 text-slate-400" /> : <XCircle className="mx-auto h-8 w-8 text-slate-400" />}
              <p className="mt-3 font-semibold text-slate-800">No packages in this view.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
