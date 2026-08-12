"use server"

import { revalidatePath } from "next/cache"

import { requireStaffProfile } from "@/lib/auth"
import type { ShopQualificationSettings, SupplierRoutingOption } from "@/lib/shop-qualification"

const JOB_ADDRESS = "280 Lawrence Ave, Lawrence, NY 11559"
const MAX_MATERIAL_LIST_LENGTH = 20_000

type SendSupplierQuoteResult =
  | { ok: true; requestId: string }
  | { ok: false; error: string }

type SaveSupplierResult =
  | { ok: true; supplier: SupplierRoutingOption }
  | { ok: false; error: string }

type DeleteSupplierResult =
  | { ok: true; settings: ShopQualificationSettings }
  | { ok: false; error: string }

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
    return { ok: false, error: "Could not save the supplier. Refresh the page and try again." }
  }

  revalidatePath("/admin/vendors")
  return { ok: true, supplier: persisted as SupplierRoutingOption }
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
  return { ok: true, settings: settings as ShopQualificationSettings }
}

export async function sendSupplierQuoteRequestAction(input: {
  supplierId: string
  materialList: string
}): Promise<SendSupplierQuoteResult> {
  const { supabase } = await requireStaffProfile("suppliers")
  const supplierId = input.supplierId.trim()
  const materialList = input.materialList.trim()

  if (!supplierId) return { ok: false, error: "Choose a supplier." }
  if (!materialList) return { ok: false, error: "Paste or enter the material list." }
  if (materialList.length > MAX_MATERIAL_LIST_LENGTH) return { ok: false, error: "The material list is too long." }

  const { data: requestId, error: insertError } = await supabase.rpc(
    "staff_create_supplier_quote_request",
    { p_supplier_id: supplierId, p_material_list: materialList, p_job_address: JOB_ADDRESS },
  )
  if (insertError || !requestId) {
    const message = insertError?.message || ""
    if (message.includes("supplier_not_found")) return { ok: false, error: "Refresh the supplier directory and try again." }
    if (message.includes("supplier_email_required")) return { ok: false, error: "Add a valid email to this supplier before sending a request." }
    return { ok: false, error: "Could not create the supplier request. Please try again." }
  }

  const { data: delivery, error: deliveryError } = await supabase.functions.invoke<{ ok?: boolean; error?: string }>("send-supplier-quote", {
    body: { requestId },
  })

  if (!deliveryError && delivery?.ok) {
    revalidatePath("/admin/supplier-requests")
    return { ok: true, requestId: requestId as string }
  }

  const error = delivery?.error || deliveryError?.message || "The supplier email could not be sent."
  await supabase
    .from("supplier_quote_requests")
    .update({ status: "failed", error_message: error })
    .eq("id", requestId)
  revalidatePath("/admin/supplier-requests")
  return { ok: false, error }
}
