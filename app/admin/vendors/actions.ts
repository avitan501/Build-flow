"use server"

import { revalidatePath } from "next/cache"

import { requireStaffProfile } from "@/lib/auth"
import type { ShopQualificationSettings, SupplierRoutingOption } from "@/lib/shop-qualification"

const JOB_ADDRESS = "280 Lawrence Ave, Lawrence, NY 11559"
const MAX_MATERIAL_LIST_LENGTH = 20_000

type SendSupplierQuoteResult =
  | { ok: true; requestId: string }
  | { ok: false; error: string }

export type SupplierQuoteDeliveryResult = {
  supplierId: string
  supplierName: string
  requestId: string | null
  ok: boolean
  error: string | null
}

type SendSupplierQuoteBatchResult =
  | { ok: true; sentCount: number; results: SupplierQuoteDeliveryResult[] }
  | { ok: false; error: string; results: SupplierQuoteDeliveryResult[] }

type SaveSupplierResult =
  | { ok: true; supplier: SupplierRoutingOption }
  | { ok: false; error: string }

type DeleteSupplierResult =
  | { ok: true; settings: ShopQualificationSettings; deletedSupplierIds: string[] }
  | { ok: false; error: string }

type LoadSupplierDirectoryResult =
  | { ok: true; settings: ShopQualificationSettings; deletedSupplierIds: string[] }
  | { ok: false; error: string }

export type SupplierDirectorySnapshot = {
  settings: ShopQualificationSettings
  deletedSupplierIds: string[]
}

function cleanDirectorySnapshot(value: unknown): SupplierDirectorySnapshot | null {
  if (!value || typeof value !== "object") return null
  const snapshot = value as Partial<SupplierDirectorySnapshot>
  if (!snapshot.settings || !Array.isArray(snapshot.settings.suppliers) || !snapshot.settings.products) return null
  return {
    settings: snapshot.settings,
    deletedSupplierIds: Array.isArray(snapshot.deletedSupplierIds)
      ? snapshot.deletedSupplierIds.filter((id): id is string => typeof id === "string")
      : [],
  }
}

function cleanSupplier(input: SupplierRoutingOption): SupplierRoutingOption | null {
  const name = input.name.trim().slice(0, 160)
  const email = input.email?.trim().toLowerCase().slice(0, 320) || ""
  if (!name || (email && !/^\S+@\S+\.\S+$/.test(email))) return null

  return {
    ...input,
    id: input.id.trim().slice(0, 160),
    name,
    contactLabel: input.contactLabel?.trim().slice(0, 160) || "Supplier contact",
    contactName: input.contactName?.trim().slice(0, 160) || "",
    email,
    phone: input.phone?.trim().slice(0, 80) || "",
    whatsapp: input.whatsapp?.trim().slice(0, 80) || "",
    portalUrl: input.portalUrl?.trim().slice(0, 500) || "",
    deliveryNotes: input.deliveryNotes?.trim().slice(0, 4_000) || "",
    notes: input.notes?.trim().slice(0, 4_000) || "",
    trustLevel: input.trustLevel || "not-reviewed",
    catalogDepartments: Array.isArray(input.catalogDepartments) ? input.catalogDepartments.map((department) => department.trim().slice(0, 100)).filter(Boolean).slice(0, 20) : [],
    catalogEnabledDepartments: Array.isArray(input.catalogEnabledDepartments) ? input.catalogEnabledDepartments.map((department) => department.trim().slice(0, 100)).filter(Boolean).slice(0, 20) : [],
    address: input.address?.trim().slice(0, 500) || "",
    materials: input.materials?.trim().slice(0, 2_000) || "",
  }
}

export async function saveSupplierDirectoryEntryAction(input: {
  supplier: SupplierRoutingOption
  create?: boolean
}): Promise<SaveSupplierResult> {
  const { supabase } = await requireStaffProfile("suppliers")
  const supplier = cleanSupplier(input.supplier)
  if (!supplier) return { ok: false, error: "Enter a supplier name and a valid email address." }

  const { data: persisted, error: saveError } = await supabase.rpc(
    "staff_upsert_supplier_directory_entry",
    { p_supplier: supplier, p_create: input.create ?? false },
  )
  if (saveError || !persisted) {
    console.error("Supplier directory save failed", saveError)
    if (saveError?.message.includes("supplier_not_found")) {
      return { ok: false, error: "This vendor was deleted and cannot be restored by an old page. Refresh the directory." }
    }
    return { ok: false, error: "Could not save the supplier. Refresh the page and try again." }
  }

  revalidatePath("/admin/vendors")
  revalidatePath("/admin/catalog")
  return { ok: true, supplier: persisted as SupplierRoutingOption }
}

export async function loadSupplierDirectoryAction(): Promise<LoadSupplierDirectoryResult> {
  const { supabase } = await requireStaffProfile("suppliers")
  const { data, error } = await supabase.rpc("staff_load_supplier_directory_snapshot")
  const snapshot = cleanDirectorySnapshot(data)
  if (error || !snapshot) return { ok: false, error: "Could not refresh the supplier directory." }
  return { ok: true, ...snapshot }
}

export async function saveSupplierRoutingProductsAction(
  products: ShopQualificationSettings["products"],
): Promise<LoadSupplierDirectoryResult> {
  const { supabase } = await requireStaffProfile("suppliers")
  const { data: settings, error } = await supabase.rpc("staff_update_supplier_routing_products", {
    p_products: products,
  })
  if (error || !settings) {
    const message = error?.message || ""
    if (message.includes("supplier_not_found")) return { ok: false, error: "That supplier was removed. Refresh the directory and choose another supplier." }
    return { ok: false, error: "Could not save department routing." }
  }
  revalidatePath("/admin/vendors")
  revalidatePath("/admin/supplier-approvals")
  const { data: snapshotData } = await supabase.rpc("staff_load_supplier_directory_snapshot")
  const snapshot = cleanDirectorySnapshot(snapshotData)
  return {
    ok: true,
    settings: settings as ShopQualificationSettings,
    deletedSupplierIds: snapshot?.deletedSupplierIds ?? [],
  }
}

export async function deleteSupplierDirectoryEntryAction(supplierId: string): Promise<DeleteSupplierResult> {
  const { supabase } = await requireStaffProfile("suppliers")
  const normalizedId = supplierId.trim()
  if (!normalizedId) return { ok: false, error: "Choose a supplier to delete." }

  const { data: settings, error } = await supabase.rpc("staff_delete_supplier_directory_entry", {
    p_supplier_id: normalizedId,
  })

  if (error || !settings) {
    const message = error?.message || ""
    if (message.includes("supplier_not_found")) return { ok: false, error: "This supplier was already deleted. Refreshing the directory will remove it from the screen." }
    return { ok: false, error: "Could not delete this supplier. Please try again." }
  }

  revalidatePath("/admin/vendors")
  revalidatePath("/admin/supplier-approvals")
  const { data: snapshotData } = await supabase.rpc("staff_load_supplier_directory_snapshot")
  const snapshot = cleanDirectorySnapshot(snapshotData)
  return {
    ok: true,
    settings: settings as ShopQualificationSettings,
    deletedSupplierIds: snapshot?.deletedSupplierIds ?? [normalizedId],
  }
}

export async function sendSupplierQuoteRequestAction(input: {
  supplierId: string
  materialList: string
}): Promise<SendSupplierQuoteResult> {
  const result = await sendSupplierQuoteRequestsAction({
    supplierIds: [input.supplierId],
    materialList: input.materialList,
    jobAddress: JOB_ADDRESS,
    subject: `Quote Request - ${JOB_ADDRESS}`,
  })
  const delivery = result.results[0]
  if (result.ok && delivery?.ok && delivery.requestId) return { ok: true, requestId: delivery.requestId }
  return { ok: false, error: delivery?.error || (result.ok ? "The supplier email could not be sent." : result.error) }
}

export async function sendSupplierQuoteRequestsAction(input: {
  supplierIds: string[]
  materialList: string
  jobAddress: string
  subject: string
}): Promise<SendSupplierQuoteBatchResult> {
  const { supabase } = await requireStaffProfile("suppliers")
  const supplierIds = [...new Set(input.supplierIds.map((supplierId) => supplierId.trim()).filter(Boolean))]
  const materialList = input.materialList.trim()
  const jobAddress = input.jobAddress.trim().slice(0, 500)
  const subject = input.subject.trim().slice(0, 300)

  if (!supplierIds.length) return { ok: false, error: "Choose at least one supplier.", results: [] }
  if (supplierIds.length > 20) return { ok: false, error: "Choose no more than 20 suppliers at one time.", results: [] }
  if (!materialList) return { ok: false, error: "Paste or enter the material list.", results: [] }
  if (materialList.length > MAX_MATERIAL_LIST_LENGTH) return { ok: false, error: "The material list is too long.", results: [] }
  if (!jobAddress) return { ok: false, error: "Enter the shipping or job address.", results: [] }
  if (!subject) return { ok: false, error: "Enter an email subject.", results: [] }

  const results: SupplierQuoteDeliveryResult[] = []
  for (const supplierId of supplierIds) {
    const { data: requestId, error: insertError } = await supabase.rpc(
      "staff_create_supplier_quote_request",
      { p_supplier_id: supplierId, p_material_list: materialList, p_job_address: jobAddress },
    )
    if (insertError || !requestId) {
      const message = insertError?.message || ""
      const error = message.includes("supplier_not_found")
        ? "Supplier is no longer in the directory."
        : message.includes("supplier_email_required")
          ? "Add a valid email to this supplier before sending."
          : "Could not create this supplier request."
      results.push({ supplierId, supplierName: supplierId, requestId: null, ok: false, error })
      continue
    }

    const { data: requestRow, error: subjectError } = await supabase
      .from("supplier_quote_requests")
      .update({ subject })
      .eq("id", requestId)
      .select("supplier_name")
      .maybeSingle<{ supplier_name: string }>()
    const supplierName = requestRow?.supplier_name || supplierId
    if (subjectError || !requestRow) {
      const error = "Could not save the email subject. Nothing was sent."
      await supabase.from("supplier_quote_requests").update({ status: "failed", error_message: error }).eq("id", requestId)
      results.push({ supplierId, supplierName, requestId: requestId as string, ok: false, error })
      continue
    }

    const { data: delivery, error: deliveryError } = await supabase.functions.invoke<{ ok?: boolean; error?: string }>("send-supplier-quote", {
      body: { requestId },
    })

    if (!deliveryError && delivery?.ok) {
      results.push({ supplierId, supplierName, requestId: requestId as string, ok: true, error: null })
      continue
    }

    const error = delivery?.error || deliveryError?.message || "The supplier email could not be sent."
    await supabase
      .from("supplier_quote_requests")
      .update({ status: "failed", error_message: error })
      .eq("id", requestId)
    results.push({ supplierId, supplierName, requestId: requestId as string, ok: false, error })
  }

  revalidatePath("/admin/supplier-requests")
  const sentCount = results.filter((result) => result.ok).length
  if (!sentCount) return { ok: false, error: "No supplier emails were sent. Review the results below.", results }
  return { ok: true, sentCount, results }
}
