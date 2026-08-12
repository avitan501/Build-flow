"use server"

import { revalidatePath } from "next/cache"

import { sendSupplierQuoteRequestEmail } from "@/lib/cart-submission-email"
import { requireStaffProfile } from "@/lib/auth"
import type { SupplierRoutingOption } from "@/lib/shop-qualification"

const JOB_ADDRESS = "280 Lawrence Ave, Lawrence, NY 11559"
const MAX_MATERIAL_LIST_LENGTH = 20_000

type SendSupplierQuoteResult =
  | { ok: true; requestId: string }
  | { ok: false; error: string }

export async function sendSupplierQuoteRequestAction(input: {
  supplierId: string
  supplierEmail: string | null
  materialList: string
}): Promise<SendSupplierQuoteResult> {
  const { supabase, user } = await requireStaffProfile("suppliers")
  const supplierId = input.supplierId.trim()
  const requestedSupplierEmail = input.supplierEmail?.trim().toLowerCase() || ""
  const materialList = input.materialList.trim()

  if (!supplierId) return { ok: false, error: "Choose a supplier." }
  if (!materialList) return { ok: false, error: "Paste or enter the material list." }
  if (materialList.length > MAX_MATERIAL_LIST_LENGTH) return { ok: false, error: "The material list is too long." }

  let supplier: SupplierRoutingOption | undefined
  for (let attempt = 0; attempt < 4 && !supplier; attempt += 1) {
    if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 250))
    const { data: settings, error: settingsError } = await supabase
      .from("workflow_manager_settings")
      .select("state")
      .eq("id", "singleton")
      .maybeSingle<{ state: { qualificationSettings?: { suppliers?: SupplierRoutingOption[] } } }>()
    if (settingsError) return { ok: false, error: "Could not load the supplier directory." }

    const suppliers = settings?.state?.qualificationSettings?.suppliers ?? []
    const supplierById = suppliers.find((item) => item.id === supplierId)
    const supplierByEmail = requestedSupplierEmail
      ? suppliers.find((item) => item.email?.trim().toLowerCase() === requestedSupplierEmail)
      : undefined
    supplier = supplierById?.email?.trim().toLowerCase() === requestedSupplierEmail
      ? supplierById
      : supplierByEmail ?? (!requestedSupplierEmail ? supplierById : undefined)
  }
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

  const delivery = await sendSupplierQuoteRequestEmail({
    requestId: request.id,
    supplierName: supplier.name,
    contactName: supplier.contactName || null,
    recipientEmail: supplierEmail,
    jobAddress: JOB_ADDRESS,
    materialList,
  })

  if (delivery.status === "sent") {
    await supabase
      .from("supplier_quote_requests")
      .update({ status: "sent", provider_message_id: delivery.providerId, sent_at: new Date().toISOString(), error_message: null })
      .eq("id", request.id)
    revalidatePath("/admin/supplier-requests")
    return { ok: true, requestId: request.id }
  }

  const error = delivery.status === "not_configured"
    ? "Website email is not configured."
    : delivery.status === "skipped"
      ? "The email was not sent."
      : delivery.error
  await supabase
    .from("supplier_quote_requests")
    .update({ status: "failed", error_message: error })
    .eq("id", request.id)
  revalidatePath("/admin/supplier-requests")
  return { ok: false, error }
}
