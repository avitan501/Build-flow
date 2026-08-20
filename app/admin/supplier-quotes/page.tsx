import { ArrowRight, FileCheck2, FileClock, FolderArchive, ReceiptText } from "lucide-react"
import Link from "next/link"

import { SupplierQuoteUploadForm } from "@/components/buildflow/supplier-quote-upload-form"
import { requireStaffProfile } from "@/lib/auth"
import { materialCatalogDepartmentOptions, type CatalogSupplier } from "@/lib/material-catalog"
import { supplierQuoteStatusLabel, type SupplierQuoteRecord } from "@/lib/supplier-quotes"

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value))
}

export default async function SupplierQuotesPage() {
  const { supabase } = await requireStaffProfile("suppliers")
  const [quotesResult, suppliersResult] = await Promise.all([
    supabase.from("supplier_quotes").select("*").neq("status", "archived").order("updated_at", { ascending: false }).limit(200).returns<SupplierQuoteRecord[]>(),
    supabase.rpc("staff_load_catalog_suppliers"),
  ])
  const quotes = quotesResult.data ?? []
  const suppliers = Array.isArray(suppliersResult.data) ? suppliersResult.data as CatalogSupplier[] : []
  const enabled = !quotesResult.error && !suppliersResult.error
  const reviewCount = quotes.filter((quote) => quote.status === "needs_review").length
  const routedCount = quotes.filter((quote) => ["cataloged", "comparison", "client_quote"].includes(quote.status)).length

  return (
    <main className="min-h-screen bg-[#f5f5f7] px-4 pb-16 pt-6 text-slate-950 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 border-b border-slate-200 pb-6 xl:flex-row xl:items-end xl:justify-between">
          <div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#0071e3]">Manager Portal</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Supplier Quote Storage</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">One private place for supplier documents, extracted materials, current pricing, and the next action.</p></div>
          <SupplierQuoteUploadForm suppliers={suppliers.map((supplier) => ({ id: supplier.id, name: supplier.name, catalogDepartments: supplier.catalogDepartments }))} departments={materialCatalogDepartmentOptions()} enabled={enabled} aiEnabled={Boolean(process.env.OPENAI_API_KEY)} />
        </header>

        {!enabled ? <div className="mt-5 border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">Supplier Quote Storage is waiting for its database update.</div> : null}

        <section className="mt-5 grid grid-cols-3 gap-3" aria-label="Supplier quote summary">
          {[{ label: "Stored", value: quotes.length, icon: FolderArchive }, { label: "Needs review", value: reviewCount, icon: FileClock }, { label: "Routed", value: routedCount, icon: FileCheck2 }].map((metric) => <div key={metric.label} className="border border-slate-200 bg-white p-3 shadow-sm sm:p-4"><metric.icon className="h-4 w-4 text-[#0071e3]" /><p className="mt-3 text-2xl font-bold tabular-nums">{metric.value}</p><p className="mt-1 text-[11px] font-semibold text-slate-500 sm:text-xs">{metric.label}</p></div>)}
        </section>

        <section className="mt-5 border border-slate-200 bg-white shadow-sm" aria-labelledby="stored-quotes-heading">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 sm:px-6"><div><h2 id="stored-quotes-heading" className="text-lg font-bold">Stored quotes</h2><p className="mt-1 text-xs text-slate-500">Newest activity first</p></div><ReceiptText className="h-5 w-5 text-slate-400" /></div>
          {quotes.length ? <div className="divide-y divide-slate-200">{quotes.map((quote) => <Link key={quote.id} href={`/admin/supplier-quotes/${quote.id}`} className="group grid gap-3 px-4 py-4 transition hover:bg-slate-50 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-bold">{quote.supplier_name}</h3><span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-slate-600">{supplierQuoteStatusLabel(quote.status)}</span></div><p className="mt-1 truncate text-sm text-slate-600">{quote.quote_number ? `Quote ${quote.quote_number} · ` : ""}{quote.file_name}</p><div className="mt-2 flex flex-wrap gap-x-3 text-xs font-medium text-slate-500"><span>{quote.department}</span><span>{formatDate(quote.updated_at)}</span></div></div><span className="inline-flex items-center gap-2 text-sm font-bold text-[#0071e3]">Open <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></span></Link>)}</div> : <div className="px-5 py-14 text-center"><ReceiptText className="mx-auto h-9 w-9 text-slate-300" /><h3 className="mt-4 text-lg font-bold">No supplier quotes stored</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Upload the first supplier document. The original stays private while you review the extracted items.</p></div>}
        </section>
      </div>
    </main>
  )
}
