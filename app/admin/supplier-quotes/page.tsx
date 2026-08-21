import { ArrowRight, FileCheck2, FileClock, Filter, FolderArchive, ReceiptText, X } from "lucide-react"
import Link from "next/link"

import { SupplierQuoteUploadForm } from "@/components/buildflow/supplier-quote-upload-form"
import { requireStaffProfile } from "@/lib/auth"
import { materialCatalogDepartmentOptions, type CatalogSupplier } from "@/lib/material-catalog"
import { supplierQuoteStatusLabel, type SupplierQuoteClient, type SupplierQuoteRecord, type SupplierQuoteRequestOption } from "@/lib/supplier-quotes"

type RequestRow = { id: string; title: string; status: string; project_id: string; owner_id: string; created_at: string }
type RequestProjectRow = { id: string; name: string; address: string | null }

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value))
}

export default async function SupplierQuotesPage({ searchParams }: {
  searchParams: Promise<{ supplier?: string; client?: string; date?: string }>
}) {
  const filters = await searchParams
  const supplierFilter = filters.supplier?.trim() || ""
  const clientFilter = filters.client?.trim() || ""
  const dateFilter = /^\d{4}-\d{2}-\d{2}$/.test(filters.date || "") ? filters.date || "" : ""
  const { supabase } = await requireStaffProfile("suppliers")
  const [quotesResult, suppliersResult, clientsResult, requestsResult, projectsResult, ocrStatus] = await Promise.all([
    supabase.from("supplier_quotes").select("*").neq("status", "archived").order("updated_at", { ascending: false }).limit(200).returns<SupplierQuoteRecord[]>(),
    supabase.rpc("staff_load_catalog_suppliers"),
    supabase.from("profiles").select("id,full_name,email").eq("role", "client").eq("is_active", true).order("full_name").limit(500),
    supabase.from("quote_requests").select("id,title,status,project_id,owner_id,created_at").order("created_at", { ascending: false }).limit(1000).returns<RequestRow[]>(),
    supabase.from("projects").select("id,name,address").limit(1000).returns<RequestProjectRow[]>(),
    supabase.functions.invoke<{ ok?: boolean; configured?: boolean }>("supplier-quote-ocr", { body: { action: "status" } }).catch(() => ({ data: null })),
  ])
  const quotes = quotesResult.data ?? []
  const suppliers = Array.isArray(suppliersResult.data) ? suppliersResult.data as CatalogSupplier[] : []
  const clients: SupplierQuoteClient[] = (clientsResult.data ?? []).map((client) => ({
    id: client.id,
    name: String(client.full_name || client.email || "Client"),
    email: String(client.email || ""),
  }))
  const projectById = new Map((projectsResult.data ?? []).map((project) => [project.id, project]))
  const requests: SupplierQuoteRequestOption[] = (requestsResult.data ?? []).map((request) => {
    const project = projectById.get(request.project_id)
    return {
      id: request.id,
      clientId: request.owner_id,
      title: request.title,
      caseNumber: `#${request.id.replaceAll("-", "").slice(0, 8).toUpperCase()}`,
      projectName: project?.name ?? "",
      projectAddress: project?.address ?? "",
      status: request.status,
      createdAt: request.created_at,
    }
  })
  const enabled = !quotesResult.error && !suppliersResult.error && !clientsResult.error && !requestsResult.error && !projectsResult.error
  const reviewCount = quotes.filter((quote) => quote.status === "needs_review").length
  const routedCount = quotes.filter((quote) => ["cataloged", "comparison", "client_quote"].includes(quote.status)).length
  const supplierOptions = [...new Set(quotes.map((quote) => quote.supplier_name).filter(Boolean))].sort((a, b) => a.localeCompare(b))
  const clientOptions = [...new Set(quotes.map((quote) => quote.client_name_snapshot).filter(Boolean))].sort((a, b) => a.localeCompare(b))
  const filteredQuotes = quotes.filter((quote) => {
    if (supplierFilter && quote.supplier_name !== supplierFilter) return false
    if (clientFilter === "__legacy__" && quote.client_name_snapshot) return false
    if (clientFilter && clientFilter !== "__legacy__" && quote.client_name_snapshot !== clientFilter) return false
    if (dateFilter && quote.updated_at.slice(0, 10) !== dateFilter) return false
    return true
  })
  const filtersActive = Boolean(supplierFilter || clientFilter || dateFilter)

  return (
    <main className="min-h-screen bg-[#f5f5f7] px-4 pb-16 pt-6 text-slate-950 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 border-b border-slate-200 pb-6 xl:flex-row xl:items-end xl:justify-between">
          <div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#0071e3]">Manager Portal</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Supplier Quote Storage</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">One private place for supplier documents, extracted materials, current pricing, and the next action.</p></div>
          <SupplierQuoteUploadForm clients={clients} requests={requests} suppliers={suppliers.map((supplier) => ({ id: supplier.id, name: supplier.name, catalogDepartments: supplier.catalogDepartments }))} departments={materialCatalogDepartmentOptions()} enabled={enabled} aiEnabled={Boolean(ocrStatus.data?.ok && ocrStatus.data.configured)} />
        </header>

        {!enabled ? <div className="mt-5 border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">Supplier Quote Storage is waiting for its database update.</div> : null}

        <section className="mt-5 grid grid-cols-3 gap-3" aria-label="Supplier quote summary">
          {[{ label: "Stored", value: quotes.length, icon: FolderArchive }, { label: "Needs review", value: reviewCount, icon: FileClock }, { label: "Routed", value: routedCount, icon: FileCheck2 }].map((metric) => <div key={metric.label} className="border border-slate-200 bg-white p-3 shadow-sm sm:p-4"><metric.icon className="h-4 w-4 text-[#0071e3]" /><p className="mt-3 text-2xl font-bold tabular-nums">{metric.value}</p><p className="mt-1 text-[11px] font-semibold text-slate-500 sm:text-xs">{metric.label}</p></div>)}
        </section>

        <section className="mt-5 border border-slate-200 bg-white shadow-sm" aria-labelledby="stored-quotes-heading">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 sm:px-6"><div><h2 id="stored-quotes-heading" className="text-lg font-bold">Stored quotes</h2><p className="mt-1 text-xs text-slate-500">{filtersActive ? `Showing ${filteredQuotes.length} of ${quotes.length}` : "Newest activity first"}</p></div><ReceiptText className="h-5 w-5 text-slate-400" /></div>
          <form method="get" action="/admin/supplier-quotes" className="grid gap-3 border-b border-slate-200 bg-slate-50 px-4 py-4 sm:grid-cols-3 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_11rem_auto] lg:items-end" aria-label="Filter supplier quotes">
            <label className="grid min-w-0 gap-1 text-xs font-bold text-slate-600">Supplier<select name="supplier" defaultValue={supplierFilter} className="min-h-10 min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-950"><option value="">All suppliers</option>{supplierOptions.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
            <label className="grid min-w-0 gap-1 text-xs font-bold text-slate-600">Client<select name="client" defaultValue={clientFilter} className="min-h-10 min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-950"><option value="">All clients</option>{clientOptions.map((name) => <option key={name} value={name}>{name}</option>)}{quotes.some((quote) => !quote.client_name_snapshot) ? <option value="__legacy__">Not linked to a client</option> : null}</select></label>
            <label className="grid min-w-0 gap-1 text-xs font-bold text-slate-600">Date<input name="date" type="date" defaultValue={dateFilter} className="min-h-10 min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-950" /></label>
            <div className="flex gap-2 sm:col-span-3 lg:col-span-1"><button type="submit" className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-bold text-white"><Filter className="h-4 w-4" />Apply</button>{filtersActive ? <Link href="/admin/supplier-quotes" aria-label="Clear filters" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600"><X className="h-4 w-4" /></Link> : null}</div>
          </form>
          {filteredQuotes.length ? <div className="divide-y divide-slate-200">{filteredQuotes.map((quote) => <Link key={quote.id} href={`/admin/supplier-quotes/${quote.id}`} className="group grid gap-3 px-4 py-4 transition hover:bg-slate-50 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-bold">{quote.supplier_name}</h3><span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-slate-600">{supplierQuoteStatusLabel(quote.status)}</span></div><p className="mt-1 truncate text-sm text-slate-600">{quote.client_name_snapshot ? `For ${quote.client_name_snapshot}` : "Not linked to a client"} · {quote.quote_number ? `Quote ${quote.quote_number} · ` : ""}{quote.file_name}</p><div className="mt-2 flex flex-wrap gap-x-3 text-xs font-medium text-slate-500"><span>{quote.department}</span><span>{formatDate(quote.updated_at)}</span></div></div><span className="inline-flex items-center gap-2 text-sm font-bold text-[#0071e3]">Open <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></span></Link>)}</div> : <div className="px-5 py-14 text-center"><ReceiptText className="mx-auto h-9 w-9 text-slate-300" /><h3 className="mt-4 text-lg font-bold">{filtersActive ? "No quotes match these filters" : "No supplier quotes stored"}</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{filtersActive ? "Clear one or more filters to see other stored quotes." : "Upload the first supplier document. The original stays private while you review the extracted items."}</p></div>}
        </section>
      </div>
    </main>
  )
}
