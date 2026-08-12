"use server"

import { revalidatePath } from "next/cache"

import { requireStaffProfile } from "@/lib/auth"

type DeleteSupplierRequestResult =
  | { ok: true }
  | { ok: false; error: string }

export async function deleteSupplierQuoteRequestAction(requestId: string): Promise<DeleteSupplierRequestResult> {
  const { supabase } = await requireStaffProfile("suppliers")
  const normalizedId = requestId.trim()

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalizedId)) {
    return { ok: false, error: "This request could not be identified." }
  }

  const { data: deleted, error } = await supabase.rpc("staff_delete_supplier_quote_request", {
    p_request_id: normalizedId,
  })

  if (error) return { ok: false, error: "Could not delete the request. Please try again." }
  if (!deleted) return { ok: false, error: "This request was already deleted." }

  revalidatePath("/admin/supplier-requests")
  return { ok: true }
}
