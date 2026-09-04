import { notFound } from "next/navigation"

import { SupplierQuoteWorkspace } from "@/components/buildflow/supplier-quote-workspace"
import { requireStaffProfile } from "@/lib/auth"
import { materialCatalogDepartmentOptions } from "@/lib/material-catalog"
import { SUPPLIER_QUOTE_BUCKET, type SupplierQuoteItemRecord, type SupplierQuoteRecord } from "@/lib/supplier-quotes"

export default async function SupplierQuoteDetailPage({ params }: { params: Promise<{ quoteId: string }> }) {
  const { quoteId } = await params
  const { supabase } = await requireStaffProfile("suppliers")
  const [quoteResult, itemsResult, suppliersResult] = await Promise.all([
    supabase.from("supplier_quotes").select("*").eq("id", quoteId).maybeSingle<SupplierQuoteRecord>(),
    supabase.from("supplier_quote_items").select("*").eq("quote_id", quoteId).order("line_number").returns<SupplierQuoteItemRecord[]>(),
    supabase.rpc("staff_load_catalog_suppliers"),
  ])
  if (quoteResult.error || !quoteResult.data) notFound()
  const quote = quoteResult.data
  const signed = await supabase.storage.from(SUPPLIER_QUOTE_BUCKET).createSignedUrl(quote.file_path, 1800)
  const suppliers = Array.isArray(suppliersResult.data)
    ? (suppliersResult.data as Array<{ id: string; name: string }>).filter((entry) => entry.id && entry.name)
    : []
  return <SupplierQuoteWorkspace quote={quote} initialItems={itemsResult.data ?? []} documentUrl={signed.data?.signedUrl ?? null} departments={materialCatalogDepartmentOptions([quote.department])} suppliers={suppliers} />
}
