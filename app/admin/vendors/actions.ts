"use server"

import { revalidatePath } from "next/cache"

import { requireStaffProfile } from "@/lib/auth"
import type { ShopQualificationSettings, SupplierContact, SupplierReferralSource, SupplierRelationshipUpdate, SupplierRoutingOption } from "@/lib/shop-qualification"
import { canonicalSupplierId, findCanonicalSupplier } from "@/lib/supplier-canonical"
import { confirmSupplierDirectoryPersistence, parseSupplierDirectorySnapshot } from "@/lib/supplier-directory-persistence"
import { SUPPLIER_PROGRAM_CHANNELS, type SupplierProgramChannel } from "@/lib/supplier-program-channels"

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

function cleanSupplier(input: SupplierRoutingOption): SupplierRoutingOption | null {
  const name = input.name.trim().slice(0, 160)
  const email = input.email?.trim().toLowerCase().slice(0, 320) || ""
  if (!name || (email && !/^\S+@\S+\.\S+$/.test(email))) return null

  const deliveryCharge = input.deliveryCharge == null ? null : Number(input.deliveryCharge)
  const allowedChannels = new Set<string>(SUPPLIER_PROGRAM_CHANNELS)
  const allowedContactMethods = new Set(["email", "phone", "whatsapp", "sms", "portal", "manual"])
  const allowedReferralSources = new Set<SupplierReferralSource>(["friend", "client", "contractor", "supplier", "other"])
  const additionalContacts = (Array.isArray(input.additionalContacts) ? input.additionalContacts : []).flatMap((contact): SupplierContact[] => {
    if (!contact || typeof contact !== "object") return []
    const additionalEmail = String(contact.email || "").trim().toLowerCase().slice(0, 320)
    if (additionalEmail && !/^\S+@\S+\.\S+$/.test(additionalEmail)) return []
    const contactName = String(contact.name || "").trim().slice(0, 160)
    const contactPhone = String(contact.phone || "").trim().slice(0, 80)
    if (!contactName && !additionalEmail && !contactPhone) return []
    return [{ id: String(contact.id || crypto.randomUUID()).slice(0, 160), name: contactName, role: String(contact.role || "").trim().slice(0, 120), email: additionalEmail, phone: contactPhone }]
  }).slice(0, 20)
  const relationshipUpdates = (Array.isArray(input.relationshipUpdates) ? input.relationshipUpdates : []).flatMap((update): SupplierRelationshipUpdate[] => {
    if (!update || typeof update !== "object") return []
    const summary = String(update.summary || "").trim().slice(0, 2000)
    if (!summary) return []
    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(update.date || "")) ? String(update.date) : new Date().toISOString().slice(0, 10)
    return [{ id: String(update.id || crypto.randomUUID()).slice(0, 160), date, summary }]
  }).slice(0, 100)
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
    preferredDeliveryMethod: input.preferredDeliveryMethod || "manual",
    contactMethods: Array.isArray(input.contactMethods) ? [...new Set(input.contactMethods.filter((method) => allowedContactMethods.has(method)))].slice(0, 6) as SupplierRoutingOption["contactMethods"] : [input.preferredDeliveryMethod || "manual"],
    additionalContacts,
    relationshipUpdates,
    deliveryNotes: input.deliveryNotes?.trim().slice(0, 4_000) || "",
    deliveryCharge: Number.isFinite(deliveryCharge) && Number(deliveryCharge) >= 0 ? Math.round(Number(deliveryCharge) * 100) / 100 : null,
    deliveryChargeNote: input.deliveryChargeNote?.trim().slice(0, 1_000) || "",
    notes: input.notes?.trim().slice(0, 4_000) || "",
    programChannels: Array.isArray(input.programChannels) ? input.programChannels.filter((channel): channel is SupplierProgramChannel => typeof channel === "string" && allowedChannels.has(channel)) : [],
    trustLevel: input.trustLevel || "not-reviewed",
    referredBySource: input.referredBySource && allowedReferralSources.has(input.referredBySource) ? input.referredBySource : "",
    referredByName: input.referredByName?.trim().slice(0, 160) || "",
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
  let supplier = cleanSupplier(input.supplier)
  if (!supplier) return { ok: false, error: "Enter a supplier name and a valid email address." }

  let create = input.create ?? false
  if (create) {
    const { data: snapshotData, error: snapshotError } = await supabase.rpc("staff_load_supplier_directory_snapshot")
    const snapshot = parseSupplierDirectorySnapshot(snapshotData)
    if (snapshotError || !snapshot) {
      return { ok: false, error: "Could not verify the Supplier Directory before saving." }
    }
    const email = supplier.email?.trim().toLowerCase() || ""
    const existing = findCanonicalSupplier(snapshot.settings.suppliers, {
      supplierId: supplier.id,
      name: supplier.name,
    }) ?? snapshot.settings.suppliers.find((entry) => (
      Boolean(email) && entry.email?.trim().toLowerCase() === email
    ))
    if (existing) {
      return { ok: true, supplier: existing }
    }
    supplier = { ...supplier, id: canonicalSupplierId(supplier.name) }
    create = true
  }

  const { data: persisted, error: saveError } = await supabase.rpc(
    "staff_upsert_supplier_directory_entry",
    { p_supplier: supplier, p_create: create },
  )
  if (saveError || !persisted) {
    console.error("Supplier directory save failed", saveError)
    if (saveError?.message.includes("supplier_not_found")) {
      return { ok: false, error: "This vendor was deleted and cannot be restored by an old page. Refresh the directory." }
    }
    return { ok: false, error: "Could not save the supplier. Refresh the page and try again." }
  }

  const { data: verifiedSnapshotData, error: verifyError } = await supabase.rpc("staff_load_supplier_directory_snapshot")
  const verifiedSupplier = confirmSupplierDirectoryPersistence(verifiedSnapshotData, supplier)
  if (verifyError || !verifiedSupplier) {
    console.error("Supplier directory persistence verification failed", verifyError)
    return { ok: false, error: "The supplier save could not be confirmed. Refresh the directory and try again." }
  }

  revalidatePath("/admin/vendors")
  revalidatePath("/admin/supplier-network")
  revalidatePath("/admin/catalog")
  revalidatePath("/owner/materials/requests/[requestId]", "page")
  return { ok: true, supplier: verifiedSupplier }
}

export async function loadSupplierDirectoryAction(): Promise<LoadSupplierDirectoryResult> {
  const { supabase } = await requireStaffProfile("suppliers")
  const { data, error } = await supabase.rpc("staff_load_supplier_directory_snapshot")
  const snapshot = parseSupplierDirectorySnapshot(data)
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
  revalidatePath("/admin/supplier-network")
  revalidatePath("/admin/supplier-approvals")
  revalidatePath("/owner/materials/requests/[requestId]", "page")
  const { data: snapshotData } = await supabase.rpc("staff_load_supplier_directory_snapshot")
  const snapshot = parseSupplierDirectorySnapshot(snapshotData)
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
  revalidatePath("/admin/supplier-network")
  revalidatePath("/admin/supplier-approvals")
  revalidatePath("/owner/materials/requests/[requestId]", "page")
  const { data: snapshotData } = await supabase.rpc("staff_load_supplier_directory_snapshot")
  const snapshot = parseSupplierDirectorySnapshot(snapshotData)
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
