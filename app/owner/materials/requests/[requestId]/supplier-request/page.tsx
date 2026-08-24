import { notFound, redirect } from "next/navigation"

import { SupplierRequestDraft } from "@/components/buildflow/supplier-request-draft"
import { requireStaffProfile } from "@/lib/auth"
import { normalizeMaterialCatalogDepartment, supplierCanReceiveDepartmentRequest } from "@/lib/material-catalog"
import { preferredRequestMaterialSources, type RequestMaterialChartSource } from "@/lib/request-material-chart"
import type { SupplierRoutingOption } from "@/lib/shop-qualification"

type RequestRow = { id: string; title: string; projects: { address: string | null } | null }
type RequestItem = RequestMaterialChartSource

function itemDetails(item: RequestItem) {
  const answers = Array.isArray(item.answers)
    ? item.answers.flatMap((answer) => {
        if (!answer || typeof answer !== "object") return []
        const entry = answer as { label?: unknown; value?: unknown; question?: unknown; answer?: unknown }
        const label = String(entry.label || entry.question || "").trim()
        const value = String(entry.value || entry.answer || "").trim()
        return label && value ? [`  ${label}: ${value}`] : []
      })
    : []
  const requestDetails = typeof item.metadata?.request_details === "string" ? item.metadata.request_details.trim() : ""
  const specifications = [
    typeof item.metadata?.product_type === "string" && item.metadata.product_type ? `Type: ${item.metadata.product_type}` : "",
    typeof item.metadata?.dimensions === "string" && item.metadata.dimensions ? `Size: ${item.metadata.dimensions}` : "",
    typeof item.metadata?.thickness === "string" && item.metadata.thickness ? `Thickness: ${item.metadata.thickness}` : "",
    typeof item.metadata?.screw_length === "string" && item.metadata.screw_length ? `Length: ${item.metadata.screw_length}` : "",
  ].filter(Boolean).map((detail) => `  ${detail}`)
  return [`${item.quantity} ${item.unit || "each"} - ${item.name}`, ...specifications, ...answers, ...(requestDetails ? requestDetails.split(/\r?\n/).map((line) => `  ${line}`) : [])]
}

export default async function SupplierRequestDraftPage({
  params,
  searchParams,
}: {
  params: Promise<{ requestId: string }>
  searchParams: Promise<{ department?: string | string[]; supplier?: string | string[] }>
}) {
  const [{ requestId }, query] = await Promise.all([params, searchParams])
  const supplierIds = [...new Set((Array.isArray(query.supplier) ? query.supplier : [query.supplier]).filter((value): value is string => Boolean(value)).map((value) => value.trim()).filter(Boolean))]
  if (!supplierIds.length) redirect(`/owner/materials/requests/${requestId}`)

  const { supabase } = await requireStaffProfile("suppliers")
  const [{ data: request }, { data: items }, { data: managerSettings }] = await Promise.all([
    supabase.from("quote_requests").select("id,title,projects(address)").eq("id", requestId).maybeSingle<RequestRow>(),
    supabase.from("quote_request_items").select("request_id,name,department,item_type,quantity,unit,answers,metadata").eq("request_id", requestId).order("created_at").returns<RequestItem[]>(),
    supabase.from("workflow_manager_settings").select("state").eq("id", "singleton").maybeSingle<{ state: { qualificationSettings?: { suppliers?: SupplierRoutingOption[] } } }>(),
  ])
  if (!request) notFound()

  const preferredItems = preferredRequestMaterialSources(items ?? [])
  const departmentValue = Array.isArray(query.department) ? query.department[0] : query.department
  const department = normalizeMaterialCatalogDepartment(departmentValue)
  const requestDepartments = new Set(preferredItems.map((item) => normalizeMaterialCatalogDepartment(item.department)))
  if (!departmentValue?.trim() || !requestDepartments.has(department)) redirect(`/owner/materials/requests/${requestId}`)
  const matchingItems = preferredItems.filter((item) => normalizeMaterialCatalogDepartment(item.department) === department)
  const selectedSuppliers = (managerSettings?.state?.qualificationSettings?.suppliers ?? [])
    .filter((supplier) => supplierIds.includes(supplier.id) && supplierCanReceiveDepartmentRequest(supplier, department))
    .map((supplier) => ({
      id: supplier.id,
      name: supplier.name,
      email: supplier.email?.trim() || "",
      phone: supplier.phone?.trim() || "",
      whatsapp: supplier.whatsapp?.trim() || "",
      preferredDeliveryMethod: supplier.preferredDeliveryMethod || "manual",
    }))
  if (!selectedSuppliers.length) redirect(`/owner/materials/requests/${requestId}`)

  const materialList = matchingItems.flatMap(itemDetails).join("\n") || `Request: ${request.title}`
  return <SupplierRequestDraft requestId={request.id} requestTitle={request.title} department={department} suppliers={selectedSuppliers} initialAddress={request.projects?.address || "280 Lawrence Ave, Lawrence, NY 11559"} initialMaterialList={materialList} />
}
