import { ArrowRight, ClipboardList, Columns3, Download, FileCheck2, FileClock, Filter, FolderArchive, ReceiptText, Upload, X } from "lucide-react"
import Link from "next/link"

import { SupplierQuoteUploadForm } from "@/components/buildflow/supplier-quote-upload-form"
import { requireStaffProfile } from "@/lib/auth"
import { materialCatalogDepartmentOptions, type CatalogSupplier } from "@/lib/material-catalog"
import { preferredRequestMaterialSources, toRequestMaterialChartRow, type RequestMaterialChartSource } from "@/lib/request-material-chart"
import { supplierQuoteStatusLabel, type SupplierQuoteClient, type SupplierQuoteRecord, type SupplierQuoteRequestOption } from "@/lib/supplier-quotes"

type RequestRow = { id: string; title: string; status: string; project_id: string; owner_id: string; created_at: string }
type RequestProjectRow = { id: string; name: string; address: string | null }
type RequestComparisonRow = { id: string; request_id: string | null; status: string }

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value))
}

function QuoteRows({ quotes, unlinked = false }: { quotes: SupplierQuoteRecord[]; unlinked?: boolean }) {
  return <div className="divide-y divide-slate-200">{quotes.map((quote) => <Link key={quote.id} href={`/admin/supplier-quotes/${quote.id}`} className="group grid gap-3 px-4 py-4 transition hover:bg-slate-50 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-bold">{quote.supplier_name}</h3><span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-slate-600">{supplierQuoteStatusLabel(quote.status)}</span></div><p className="mt-1 truncate text-sm text-slate-600">{unlinked ? "No client link" : `For ${quote.client_name_snapshot || "Client"}`} · {quote.quote_number ? `Quote ${quote.quote_number} · ` : ""}{quote.file_name}</p><div className="mt-2 flex flex-wrap gap-x-3 text-xs font-medium text-slate-500"><span>{quote.department}</span><span>{formatDate(quote.updated_at)}</span></div></div><span className="inline-flex items-center gap-2 text-sm font-bold text-[#0071e3]">Open <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></span></Link>)}</div>
}

export default async function SupplierQuotesPage({ searchParams }: {
  searchParams: Promise<{ supplier?: string; client?: string; date?: string; request?: string }>
}) {
  const filters = await searchParams
  const supplierFilter = filters.supplier?.trim() || ""
  const clientFilter = filters.client?.trim() || ""
  const dateFilter = /^\d{4}-\d{2}-\d{2}$/.test(filters.date || "") ? filters.date || "" : ""
  const { supabase } = await requireStaffProfile("suppliers")
  const [quotesResult, suppliersResult, clientsResult, requestsResult, requestItemsResult, projectsResult, comparisonsResult, ocrStatus] = await Promise.all([
    supabase.from("supplier_quotes").select("*").neq("status", "archived").order("updated_at", { ascending: false }).limit(200).returns<SupplierQuoteRecord[]>(),
    supabase.rpc("staff_load_catalog_suppliers"),
    supabase.from("profiles").select("id,full_name,email").eq("role", "client").eq("is_active", true).order("full_name").limit(500),
    supabase.from("quote_requests").select("id,title,status,project_id,owner_id,created_at").order("created_at", { ascending: false }).limit(1000).returns<RequestRow[]>(),
    supabase.from("quote_request_items").select("request_id,name,department,item_type,quantity,unit,answers,metadata").order("created_at").limit(5000).returns<RequestMaterialChartSource[]>(),
    supabase.from("projects").select("id,name,address").limit(1000).returns<RequestProjectRow[]>(),
    supabase.from("quote_comparisons").select("id,request_id,status").order("updated_at", { ascending: false }).limit(1000).returns<RequestComparisonRow[]>(),
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
  const openRequests = requests.filter((request) => !["draft", "closed"].includes(request.status))
  const requestItemSourcesByRequestId = new Map<string, RequestMaterialChartSource[]>()
  for (const item of requestItemsResult.data ?? []) {
    requestItemSourcesByRequestId.set(item.request_id, [...(requestItemSourcesByRequestId.get(item.request_id) ?? []), item])
  }
  const requestItemsByRequestId = new Map([...requestItemSourcesByRequestId].map(([requestId, sources]) => [requestId, preferredRequestMaterialSources(sources).map(toRequestMaterialChartRow)]))
  const requestedRequestId = filters.request?.trim() || ""
  const initialRequestId = openRequests.some((request) => request.id === requestedRequestId) ? requestedRequestId : ""
  const clientById = new Map(clients.map((client) => [client.id, client]))
  const comparisonByRequestId = new Map<string, RequestComparisonRow>()
  for (const comparison of comparisonsResult.data ?? []) {
    if (comparison.request_id && !comparisonByRequestId.has(comparison.request_id) && !["awarded", "archived"].includes(comparison.status)) comparisonByRequestId.set(comparison.request_id, comparison)
  }
  const quoteCountByComparisonId = new Map<string, number>()
  for (const quote of quotes) {
    if (quote.comparison_id) quoteCountByComparisonId.set(quote.comparison_id, (quoteCountByComparisonId.get(quote.comparison_id) ?? 0) + 1)
  }
  const enabled = !quotesResult.error && !suppliersResult.error && !clientsResult.error && !requestsResult.error && !requestItemsResult.error && !projectsResult.error && !comparisonsResult.error
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
  const linkedQuotes = filteredQuotes.filter((quote) => Boolean(quote.client_id))
  const unlinkedQuotes = filteredQuotes.filter((quote) => !quote.client_id)

  return (
    <main className="min-h-screen bg-[#f5f5f7] px-4 pb-16 pt-6 text-slate-950 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 border-b border-slate-200 pb-6 xl:flex-row xl:items-end xl:justify-between">
          <div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#0071e3]">Manager Portal</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Supplier Quote Storage</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">One private place for supplier documents, extracted materials, current pricing, and the next action.</p></div>
          <SupplierQuoteUploadForm key={initialRequestId || "new-quote"} clients={clients} requests={openRequests} suppliers={suppliers.map((supplier) => ({ id: supplier.id, name: supplier.name, catalogDepartments: supplier.catalogDepartments }))} departments={materialCatalogDepartmentOptions()} enabled={enabled} aiEnabled={Boolean(ocrStatus.data?.ok && ocrStatus.data.configured)} initialRequestId={initialRequestId} />
        </header>

        {!enabled ? <div className="mt-5 border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">Supplier Quote Storage is waiting for its database update.</div> : null}

        <section className="mt-5 grid grid-cols-3 gap-3" aria-label="Supplier quote summary">
          {[{ label: "Stored", value: quotes.length, icon: FolderArchive }, { label: "Needs review", value: reviewCount, icon: FileClock }, { label: "Routed", value: routedCount, icon: FileCheck2 }].map((metric) => <div key={metric.label} className="border border-slate-200 bg-white p-3 shadow-sm sm:p-4"><metric.icon className="h-4 w-4 text-[#0071e3]" /><p className="mt-3 text-2xl font-bold tabular-nums">{metric.value}</p><p className="mt-1 text-[11px] font-semibold text-slate-500 sm:text-xs">{metric.label}</p></div>)}
        </section>

        <section className="mt-5 border border-slate-200 bg-white shadow-sm" aria-labelledby="client-requests-heading">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 sm:px-6">
            <div><h2 id="client-requests-heading" className="text-lg font-bold">Open client requests</h2><p className="mt-1 text-xs text-slate-500">Start with the client list, then add each supplier response to the same comparison.</p></div>
            <ClipboardList className="h-5 w-5 text-[#0071e3]" />
          </div>
          {openRequests.length ? <div className="divide-y divide-slate-200">{openRequests.map((request) => {
            const client = clientById.get(request.clientId)
            const comparison = comparisonByRequestId.get(request.id)
            const quoteCount = comparison ? quoteCountByComparisonId.get(comparison.id) ?? 0 : 0
            const requestItems = requestItemsByRequestId.get(request.id) ?? []
            return <details key={request.id} className="group px-4 py-4 sm:px-6"><summary className="grid cursor-pointer list-none gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-bold">{request.title}</h3><span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">{request.status.replaceAll("_", " ")}</span></div><p className="mt-1 truncate text-sm text-slate-600">{client?.name || "Client"}{request.projectName ? ` · ${request.projectName}` : ""}</p><div className="mt-2 flex flex-wrap gap-x-3 text-xs font-medium text-slate-500"><span>{request.caseNumber}</span><span>{requestItems.length} {requestItems.length === 1 ? "item" : "items"}</span><span>{quoteCount} supplier {quoteCount === 1 ? "quote" : "quotes"}</span><span>{formatDate(request.createdAt)}</span></div></div><span className="text-sm font-bold text-[#0071e3]"><span className="group-open:hidden">View chart</span><span className="hidden group-open:inline">Close chart</span></span></summary><div className="mt-4 border-t border-slate-200 pt-4"><div className="overflow-x-auto rounded-lg border border-slate-200"><table className="w-full min-w-[38rem] border-collapse text-left text-sm"><thead className="bg-slate-950 text-white"><tr><th className="w-28 px-3 py-2.5 text-xs font-bold">Quantity</th><th className="w-1/3 px-3 py-2.5 text-xs font-bold">Item</th><th className="px-3 py-2.5 text-xs font-bold">Details</th></tr></thead><tbody className="divide-y divide-slate-200">{requestItems.length ? requestItems.map((item, index) => <tr key={`${request.id}-${index}`} className="align-top"><td className="bg-slate-50 px-3 py-3 font-bold tabular-nums">{item.quantity}</td><td className="px-3 py-3 font-semibold">{item.item}</td><td className="px-3 py-3 leading-5 text-slate-600">{item.details || "No additional details"}</td></tr>) : <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-500">No material rows were saved with this request.</td></tr>}</tbody></table></div><div className="mt-3 flex flex-wrap gap-2"><a href={`/admin/supplier-quotes/requests/${request.id}/chart`} download className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-800"><Download className="h-4 w-4 text-[#0071e3]" /> Download chart</a><Link href={`/owner/materials/requests/${request.id}`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-800"><ClipboardList className="h-4 w-4 text-[#0071e3]" /> Full request</Link><Link href={`/admin/supplier-quotes?request=${request.id}#supplier-quote-upload`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#0071e3] px-3 text-sm font-bold text-white"><Upload className="h-4 w-4" /> Use chart for supplier quote</Link>{comparison ? <Link href={`/admin/quote-comparison/${comparison.id}`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-800"><Columns3 className="h-4 w-4 text-[#0071e3]" /> Compare</Link> : null}</div></div></details>
          })}</div> : <div className="px-5 py-10 text-center"><ClipboardList className="mx-auto h-8 w-8 text-slate-300" /><h3 className="mt-3 font-bold">No open client requests</h3><p className="mt-1 text-sm text-slate-500">New submitted requests will appear here automatically.</p></div>}
        </section>

        <section className="mt-5 border border-slate-200 bg-white shadow-sm" aria-labelledby="stored-quotes-heading">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 sm:px-6"><div><h2 id="stored-quotes-heading" className="text-lg font-bold">Client-linked supplier quotes</h2><p className="mt-1 text-xs text-slate-500">{filtersActive ? `Showing ${linkedQuotes.length} linked quotes` : "Supplier responses attached to client requests"}</p></div><ReceiptText className="h-5 w-5 text-slate-400" /></div>
          <form method="get" action="/admin/supplier-quotes" className="grid gap-3 border-b border-slate-200 bg-slate-50 px-4 py-4 sm:grid-cols-3 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_11rem_auto] lg:items-end" aria-label="Filter supplier quotes">
            <label className="grid min-w-0 gap-1 text-xs font-bold text-slate-600">Supplier<select name="supplier" defaultValue={supplierFilter} className="min-h-10 min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-950"><option value="">All suppliers</option>{supplierOptions.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
            <label className="grid min-w-0 gap-1 text-xs font-bold text-slate-600">Client<select name="client" defaultValue={clientFilter} className="min-h-10 min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-950"><option value="">All clients</option>{clientOptions.map((name) => <option key={name} value={name}>{name}</option>)}{quotes.some((quote) => !quote.client_name_snapshot) ? <option value="__legacy__">Not linked to a client</option> : null}</select></label>
            <label className="grid min-w-0 gap-1 text-xs font-bold text-slate-600">Date<input name="date" type="date" defaultValue={dateFilter} className="min-h-10 min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-950" /></label>
            <div className="flex gap-2 sm:col-span-3 lg:col-span-1"><button type="submit" className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-bold text-white"><Filter className="h-4 w-4" />Apply</button>{filtersActive ? <Link href="/admin/supplier-quotes" aria-label="Clear filters" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600"><X className="h-4 w-4" /></Link> : null}</div>
          </form>
          {linkedQuotes.length ? <QuoteRows quotes={linkedQuotes} /> : <div className="px-5 py-10 text-center"><ReceiptText className="mx-auto h-8 w-8 text-slate-300" /><h3 className="mt-3 font-bold">{filtersActive ? "No linked quotes match these filters" : "No client-linked quotes yet"}</h3><p className="mt-1 text-sm text-slate-500">Use a client request above when uploading a supplier response.</p></div>}
        </section>

        <details className="group mt-5 border border-slate-200 bg-white shadow-sm">
          <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 sm:px-6"><div><h2 className="text-lg font-bold">Quotes without a client</h2><p className="mt-1 text-xs text-slate-500">{unlinkedQuotes.length} stored {unlinkedQuotes.length === 1 ? "quote" : "quotes"} not attached to a client request</p></div><span className="text-sm font-bold text-[#0071e3]"><span className="group-open:hidden">Open</span><span className="hidden group-open:inline">Close</span></span></summary>
          <div className="border-t border-slate-200">{unlinkedQuotes.length ? <QuoteRows quotes={unlinkedQuotes} unlinked /> : <p className="px-5 py-10 text-center text-sm text-slate-500">No unlinked quotes match the current filters.</p>}</div>
        </details>
      </div>
    </main>
  )
}
