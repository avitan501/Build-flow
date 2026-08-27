import { AlertTriangle, Archive, ArrowRight, CheckCircle2, FileClock, Files, Route } from "lucide-react"
import Link from "next/link"

import { ManagerDocumentUpload } from "@/components/buildflow/manager-document-upload"
import { requireStaffProfile } from "@/lib/auth"
import { confidenceLabel, managerDocumentStatusLabel, managerDocumentTypeLabel, type ManagerDocumentRecord } from "@/lib/manager-documents"

function dateLabel(value: string) { return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value)) }

export default async function ManagerDocumentsPage({ searchParams }: { searchParams: Promise<{ intent?: string; upload?: string }> }) {
  const params = await searchParams
  const { supabase } = await requireStaffProfile("suppliers")
  const { data, error } = await supabase.from("manager_documents").select("*").neq("status", "archived").order("updated_at", { ascending: false }).limit(250).returns<ManagerDocumentRecord[]>()
  const documents = data ?? []
  const needsReview = documents.filter((document) => ["needs_review", "error"].includes(document.status)).length
  const ready = documents.filter((document) => document.status === "ready").length
  const routed = documents.filter((document) => document.status === "routed").length
  return <main className="min-h-screen bg-[#f5f5f7] px-4 pb-16 pt-6 text-slate-950 sm:px-8 lg:px-10"><div className="mx-auto max-w-7xl">
    <header className="flex flex-col gap-5 border-b border-slate-200 pb-6 xl:flex-row xl:items-end xl:justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#0071e3]">Manager documents</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Documents</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">One private inbox for quotes, invoices, receipts, price lists, estimates, material lists, purchase orders, and project files. AI suggests the department; every new upload remains in Test until you approve the correct destination.</p></div><ManagerDocumentUpload initialIntent={params.intent || ""} initiallyOpen={params.upload === "1" || Boolean(params.intent)} /></header>
    {error ? <div className="mt-5 border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">Documents is waiting for its database update.</div> : null}
    <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Document summary">{[
      { label: "Documents", value: documents.length, icon: Files }, { label: "Needs review", value: needsReview, icon: FileClock }, { label: "Approved", value: ready, icon: CheckCircle2 }, { label: "Routed", value: routed, icon: Route },
    ].map((metric) => <div key={metric.label} className="border border-slate-200 bg-white p-4 shadow-sm"><metric.icon className="h-4 w-4 text-[#0071e3]" /><p className="mt-3 text-2xl font-bold tabular-nums">{metric.value}</p><p className="mt-1 text-xs font-semibold text-slate-500">{metric.label}</p></div>)}</section>
    <section className="mt-5 border border-slate-200 bg-white shadow-sm" aria-labelledby="documents-inbox-heading"><div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 sm:px-6"><div><h2 id="documents-inbox-heading" className="text-lg font-bold">Inbox and history</h2><p className="mt-1 text-xs text-slate-500">The original remains here even after information is routed.</p></div><Archive className="h-5 w-5 text-slate-400" /></div>
      {documents.length ? <div className="divide-y divide-slate-200">{documents.map((document) => <Link key={document.id} href={`/admin/documents/${document.id}`} className="group grid gap-3 px-4 py-4 transition hover:bg-slate-50 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-bold">{document.title || document.file_name}</h3><span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[.05em] text-slate-600">{managerDocumentTypeLabel(document.document_type)}</span>{document.status === "error" ? <AlertTriangle className="h-4 w-4 text-amber-600" /> : null}</div><p className="mt-1 truncate text-sm text-slate-600">{document.party_name || "Party needs review"}{document.document_number ? ` · ${document.document_number}` : ""} · {document.file_name}</p><div className="mt-2 flex flex-wrap gap-x-3 text-xs font-semibold text-slate-500"><span>{managerDocumentStatusLabel(document.status)}</span><span>Department: {document.department}</span>{document.suggested_department ? <span>AI suggests: {document.suggested_department}</span> : null}<span>Source: {document.source_label}</span><span>AI class {confidenceLabel(document.classification_confidence)}</span><span>{dateLabel(document.updated_at)}</span></div></div><span className="inline-flex items-center gap-2 text-sm font-bold text-[#0071e3]">Review <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></span></Link>)}</div> : <div className="px-5 py-12 text-center"><Files className="mx-auto h-9 w-9 text-slate-300" /><h3 className="mt-3 font-bold">No documents yet</h3><p className="mt-1 text-sm text-slate-500">Upload one file. The original will be preserved before AI starts reading.</p></div>}
    </section>
  </div></main>
}
