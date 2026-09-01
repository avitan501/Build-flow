import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, FileClock, Files, FolderArchive, Route, Search } from "lucide-react"
import Link from "next/link"

import { ManagerDocumentUpload } from "@/components/buildflow/manager-document-upload"
import { requireStaffProfile } from "@/lib/auth"
import { confidenceLabel, managerDocumentStatusLabel, managerDocumentTypeLabel, managerDocumentTypes, type ManagerDocumentRecord, type ManagerDocumentStatus } from "@/lib/manager-documents"
import type { CatalogSupplier } from "@/lib/material-catalog"

const PAGE_SIZE = 50
const statusOptions: Array<{ value: "all" | ManagerDocumentStatus; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "needs_review", label: "Needs review" },
  { value: "ready", label: "Approved" },
  { value: "routed", label: "Routed" },
  { value: "processing", label: "Reading" },
  { value: "error", label: "Needs attention" },
  { value: "archived", label: "Archived" },
]

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value))
}

function pageHref(input: { q: string; status: string; type: string; page: number }) {
  const params = new URLSearchParams()
  if (input.q) params.set("q", input.q)
  if (input.status !== "all") params.set("status", input.status)
  if (input.type !== "all") params.set("type", input.type)
  if (input.page > 1) params.set("page", String(input.page))
  const query = params.toString()
  return `/admin/documents${query ? `?${query}` : ""}`
}

export default async function ManagerDocumentsPage({ searchParams }: { searchParams: Promise<{ intent?: string; upload?: string; q?: string; status?: string; type?: string; page?: string }> }) {
  const params = await searchParams
  const { supabase } = await requireStaffProfile("suppliers")
  const q = String(params.q ?? "").replace(/[%,()]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80)
  const status = statusOptions.some((option) => option.value === params.status) ? String(params.status) : "all"
  const type = managerDocumentTypes.includes(params.type as (typeof managerDocumentTypes)[number]) ? String(params.type) : "all"
  const requestedPage = Math.max(1, Math.min(10_000, Number.parseInt(String(params.page ?? "1"), 10) || 1))
  const offset = (requestedPage - 1) * PAGE_SIZE

  let documentsQuery = supabase.from("manager_documents").select("*", { count: "exact" })
  if (status !== "all") documentsQuery = documentsQuery.eq("status", status)
  if (type !== "all") documentsQuery = documentsQuery.eq("document_type", type)
  if (q) documentsQuery = documentsQuery.or(`title.ilike.%${q}%,party_name.ilike.%${q}%,document_number.ilike.%${q}%,file_name.ilike.%${q}%`)

  const [documentsResult, totalResult, reviewResult, readyResult, routedResult, archivedResult, clientsResult, suppliersResult] = await Promise.all([
    documentsQuery.order("updated_at", { ascending: false }).range(offset, offset + PAGE_SIZE - 1).returns<ManagerDocumentRecord[]>(),
    supabase.from("manager_documents").select("id", { count: "exact", head: true }),
    supabase.from("manager_documents").select("id", { count: "exact", head: true }).in("status", ["needs_review", "error"]),
    supabase.from("manager_documents").select("id", { count: "exact", head: true }).eq("status", "ready"),
    supabase.from("manager_documents").select("id", { count: "exact", head: true }).eq("status", "routed"),
    supabase.from("manager_documents").select("id", { count: "exact", head: true }).eq("status", "archived"),
    supabase.from("profiles").select("id,full_name,email").eq("role", "client").eq("is_active", true).order("full_name").limit(500),
    supabase.rpc("staff_load_catalog_suppliers"),
  ])
  const clients = (clientsResult.data ?? []).map((client) => ({ id: client.id, name: String(client.full_name || client.email || "Client") }))
  const suppliers = (Array.isArray(suppliersResult.data) ? suppliersResult.data as CatalogSupplier[] : []).map((supplier) => ({ id: supplier.id, name: supplier.name }))

  const documents = documentsResult.data ?? []
  const filteredCount = documentsResult.count ?? 0
  const totalPages = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE))
  const page = Math.min(requestedPage, totalPages)
  const filtersActive = Boolean(q || status !== "all" || type !== "all")

  return <main className="min-h-screen bg-[#f2f4f7] px-3 pb-20 pt-4 text-slate-950 sm:px-8 sm:pt-7 lg:px-10"><div className="mx-auto max-w-7xl">
    <header className="relative overflow-hidden rounded-[1.75rem] bg-slate-950 px-5 py-6 text-white shadow-[0_24px_70px_rgba(15,23,42,.18)] sm:px-8 sm:py-8">
      <div className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full border-[42px] border-sky-400/10" />
      <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[.2em] text-sky-300">Manager document center</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-5xl">Every quote. One memory.</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">One private inbox for every document Avantia has received, including archived history. Open a source, choose only the dependable product rows, then send them to the catalog, a client quote, or a supplier comparison.</p></div><ManagerDocumentUpload initialIntent={params.intent || ""} initiallyOpen={params.upload === "1" || Boolean(params.intent)} clients={clients} suppliers={suppliers} /></div>
    </header>

    {documentsResult.error ? <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">Documents is waiting for its database update.</div> : null}

    <section className="relative z-10 -mt-3 grid grid-cols-2 gap-2 px-2 sm:-mt-5 sm:grid-cols-5 sm:gap-3 sm:px-5" aria-label="All-time document summary">{[
      { label: "All time", value: totalResult.count ?? 0, icon: Files },
      { label: "Needs review", value: reviewResult.count ?? 0, icon: FileClock },
      { label: "Approved", value: readyResult.count ?? 0, icon: CheckCircle2 },
      { label: "Routed", value: routedResult.count ?? 0, icon: Route },
      { label: "Archived", value: archivedResult.count ?? 0, icon: FolderArchive },
    ].map((metric) => <div key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_10px_30px_rgba(15,23,42,.07)] sm:p-4"><metric.icon className="h-4 w-4 text-[#0071e3]" /><p className="mt-2 text-2xl font-bold tabular-nums">{metric.value}</p><p className="mt-0.5 text-[11px] font-bold uppercase tracking-[.05em] text-slate-500">{metric.label}</p></div>)}</section>

    <section className="mt-5 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm" aria-labelledby="documents-history-heading">
      <div className="border-b border-slate-200 px-4 py-5 sm:px-6"><h2 id="documents-history-heading" className="text-xl font-bold">Document history</h2><p className="mt-1 text-sm text-slate-500">The original remains here even after information is routed, including archived history.</p>
        <form method="get" action="/admin/documents" className="mt-4 grid gap-2 lg:grid-cols-[minmax(16rem,1fr)_12rem_14rem_auto]" aria-label="Search document history">
          <label className="relative"><span className="sr-only">Search documents</span><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><input name="q" defaultValue={q} placeholder="Vendor, quote number, file or title" className="min-h-11 w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-3 text-sm font-medium outline-none focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100" /></label>
          <label><span className="sr-only">Status</span><select name="status" defaultValue={status} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold">{statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label><span className="sr-only">Document type</span><select name="type" defaultValue={type} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold"><option value="all">All document types</option>{managerDocumentTypes.map((documentType) => <option key={documentType} value={documentType}>{managerDocumentTypeLabel(documentType)}</option>)}</select></label>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-1"><button type="submit" className="min-h-11 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white">Find documents</button>{filtersActive ? <Link href="/admin/documents" className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-600"><ArrowLeft className="h-4 w-4" />Clear</Link> : null}</div>
        </form>
      </div>

      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500 sm:px-6"><span>{filteredCount} matching document{filteredCount === 1 ? "" : "s"}</span><span>Newest activity first</span></div>
      {documents.length ? <div className="divide-y divide-slate-200">{documents.map((document) => <Link key={document.id} href={`/admin/documents/${document.id}`} className="group grid gap-3 px-4 py-4 transition hover:bg-sky-50/40 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-bold">{document.title || document.file_name}</h3><span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[.05em] text-slate-600">{managerDocumentTypeLabel(document.document_type)}</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[.05em] ${document.status === "archived" ? "bg-slate-200 text-slate-600" : document.status === "routed" ? "bg-sky-100 text-sky-800" : document.status === "ready" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{managerDocumentStatusLabel(document.status)}</span>{document.status === "error" ? <AlertTriangle className="h-4 w-4 text-amber-600" /> : null}</div><p className="mt-1 truncate text-sm text-slate-600">{document.party_name || "Party needs review"}{document.document_number ? ` · ${document.document_number}` : ""} · {document.file_name}</p><div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-slate-500"><span>{document.department}</span><span>{document.source_label}</span><span>AI {confidenceLabel(document.classification_confidence)}</span><span>{dateLabel(document.updated_at)}</span></div></div><span className="inline-flex items-center gap-2 text-sm font-bold text-[#0071e3]">Open <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></span></Link>)}</div> : <div className="px-5 py-14 text-center"><Files className="mx-auto h-9 w-9 text-slate-300" /><h3 className="mt-3 font-bold">{filtersActive ? "No matching documents" : "No documents yet"}</h3><p className="mt-1 text-sm text-slate-500">{filtersActive ? "Try a broader search or clear the filters." : "Upload one file. The original will be preserved before AI starts reading."}</p></div>}

      {totalPages > 1 ? <nav className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-4 sm:px-6" aria-label="Document history pages"><Link aria-disabled={page <= 1} href={pageHref({ q, status, type, page: Math.max(1, page - 1) })} className={`inline-flex min-h-10 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold ${page <= 1 ? "pointer-events-none opacity-40" : ""}`}>Previous</Link><span className="text-xs font-bold text-slate-500">Page {page} of {totalPages}</span><Link aria-disabled={page >= totalPages} href={pageHref({ q, status, type, page: Math.min(totalPages, page + 1) })} className={`inline-flex min-h-10 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold ${page >= totalPages ? "pointer-events-none opacity-40" : ""}`}>Next</Link></nav> : null}
    </section>
  </div></main>
}
