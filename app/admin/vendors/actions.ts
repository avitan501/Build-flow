"use server"

import { revalidatePath } from "next/cache"

import { requireStaffProfile } from "@/lib/auth"
import type { SupplierRoutingOption } from "@/lib/shop-qualification"

const JOB_ADDRESS = "280 Lawrence Ave, Lawrence, NY 11559"
const MAX_MATERIAL_LIST_LENGTH = 20_000

type SendSupplierQuoteResult =
  | { ok: true; requestId: string }
  | { ok: false; error: string }

type SaveSupplierResult =
  | { ok: true; supplier: SupplierRoutingOption }
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

export async function sendSupplierQuoteRequestAction(input: {
  supplierId: string
  materialList: string
}): Promise<SendSupplierQuoteResult> {
  const { supabase, user } = await requireStaffProfile("suppliers")
  const supplierId = input.supplierId.trim()
  const materialList = input.materialList.trim()

  if (!supplierId) return { ok: false, error: "Choose a supplier." }
  if (!materialList) return { ok: false, error: "Paste or enter the material list." }
  if (materialList.length > MAX_MATERIAL_LIST_LENGTH) return { ok: false, error: "The material list is too long." }

  const { data: settings, error: settingsError } = await supabase
    .from("workflow_manager_settings")
    .select("state")
    .eq("id", "singleton")
    .maybeSingle<{ state: { qualificationSettings?: { suppliers?: SupplierRoutingOption[] } } }>()
  if (settingsError) return { ok: false, error: "Could not load the supplier directory." }
  const supplier = settings?.state?.qualificationSettings?.suppliers?.find((item) => item.id === supplierId)
  if (!supplier) return { ok: false, error: "This supplier is no longer in the directory." }

  const supplierEmail = supplier.email?.trim().toLowerCase() || ""
  if (!/^\S+@\S+\.\S+$/.test(supplierEmail)) {
    return { ok: false, error: "Add a valid email to this supplier before sending a request." }
  }

  const subject = `Quote Request - ${JOB_ADDRESS}`
  const { data: request, error: insertError } = await supabase
    .from("supplier_quote_requests")
    .insert({
      supplier_id: supplier.id,
      supplier_name: supplier.name,
      supplier_email: supplierEmail,
      job_address: JOB_ADDRESS,
      subject,
      material_list: materialList,
      status: "sending",
      sent_by: user.id,
    })
    .select("id")
    .single<{ id: string }>()
  if (insertError || !request) return { ok: false, error: "Could not create the supplier request." }

  const { data: delivery, error: deliveryError } = await supabase.functions.invoke<{ ok?: boolean; error?: string }>("send-supplier-quote", {
    body: { requestId: request.id },
  })

  if (!deliveryError && delivery?.ok) {
    revalidatePath("/admin/supplier-requests")
    return { ok: true, requestId: request.id }
  }

  const error = delivery?.error || deliveryError?.message || "The supplier email could not be sent."
  await supabase
    .from("supplier_quote_requests")
    .update({ status: "failed", error_message: error })
    .eq("id", request.id)
  revalidatePath("/admin/supplier-requests")
  return { ok: false, error }
}
