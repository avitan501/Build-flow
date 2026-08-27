import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

import { ManagerDocumentReview } from "@/components/buildflow/manager-document-review"
import { requireManagerPortalProfile } from "@/lib/auth"
import { confidenceLabel, managerDocumentStatusLabel, managerDocumentTypeLabel, type ManagerDocumentItemRecord, type ManagerDocumentRecord } from "@/lib/manager-documents"
import { materialCatalogDepartmentOptions } from "@/lib/material-catalog"

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default async function ManagerDocumentPage({ params }: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await params
  if (!UUID_PATTERN.test(documentId)) notFound()
  const { supabase, access } = await requireManagerPortalProfile()
  const [{ data: document }, { data: items }] = await Promise.all([
    supabase.from("manager_documents").select("*").eq("id", documentId).maybeSingle<ManagerDocumentRecord>(),
    supabase.from("manager_document_items").select("*").eq("document_id", documentId).order("line_number").returns<ManagerDocumentItemRecord[]>(),
  ])
  if (!document) notFound()
  const { data: signed } = await supabase.storage.from(document.storage_bucket).createSignedUrl(document.file_path, 900)
  return <main className="min-h-screen bg-[#f5f5f7] px-4 pb-20 pt-6 text-slate-950 sm:px-8 lg:px-10"><div className="mx-auto max-w-7xl"><Link href="/admin/documents" className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-[#0071e3]"><ArrowLeft className="h-4 w-4" />Documents</Link><header className="mt-3 border-b border-slate-200 pb-5"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.06em] text-slate-600">{managerDocumentTypeLabel(document.document_type)}</span><span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.06em] text-slate-600">{managerDocumentStatusLabel(document.status)}</span><span className="text-xs font-semibold text-slate-500">Classification {confidenceLabel(document.classification_confidence)}</span></div><h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{document.title || document.file_name}</h1><p className="mt-2 text-sm text-slate-600">{document.extraction_note}</p></header><div className="mt-5"><ManagerDocumentReview key={document.updated_at} document={document} items={items ?? []} documentUrl={signed?.signedUrl ?? ""} departments={materialCatalogDepartmentOptions()} canApprove={access.owner || access.operationsManager} /></div></div></main>
}
