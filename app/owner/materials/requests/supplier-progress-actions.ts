"use server"

import { revalidatePath } from "next/cache"

import { requireStaffProfile } from "@/lib/auth"

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function saveRequestSupplierProgressNoteAction(input: {
  requestId: string
  supplierId: string
  note: string
}) {
  const requestId = String(input.requestId || "").trim()
  const supplierId = String(input.supplierId || "").trim()
  const note = String(input.note || "").trim().slice(0, 2_000)
  if (!UUID_PATTERN.test(requestId) || !supplierId || supplierId.length > 180) {
    return { ok: false as const, error: "Choose a valid supplier." }
  }

  const { supabase, user } = await requireStaffProfile("customers")
  const [{ data: request }, { data: supplierData }, { data: existing }] = await Promise.all([
    supabase.from("quote_requests").select("id,project_id,owner_id").eq("id", requestId).maybeSingle<{ id: string; project_id: string; owner_id: string }>(),
    supabase.rpc("staff_load_catalog_suppliers"),
    supabase.from("quote_request_supplier_recommendations").select("supplier_id").eq("request_id", requestId).eq("supplier_id", supplierId).maybeSingle<{ supplier_id: string }>(),
  ])
  const supplier = (Array.isArray(supplierData) ? supplierData : []).find((entry) => String((entry as { id?: unknown }).id || "") === supplierId) as { id?: string; name?: string } | undefined
  if (!request || !supplier?.name) return { ok: false as const, error: "The supplier could not be found for this request." }

  const persistence = existing
    ? await supabase.from("quote_request_supplier_recommendations").update({ notes: note, updated_by: user.id, updated_at: new Date().toISOString() }).eq("request_id", requestId).eq("supplier_id", supplierId)
    : await supabase.from("quote_request_supplier_recommendations").insert({
      request_id: requestId,
      supplier_id: supplierId,
      supplier_name_snapshot: supplier.name,
      is_recommended: true,
      should_contact: true,
      notes: note,
      updated_by: user.id,
      created_by: user.id,
    })
  if (persistence.error) return { ok: false as const, error: "The supplier note could not be saved." }

  await supabase.from("project_events").insert({
    project_id: request.project_id,
    owner_id: request.owner_id,
    event_type: "note_added",
    source: "admin",
    title: `${supplier.name}: supplier note updated`,
    description: note || "Supplier note cleared.",
    metadata: { quote_request_id: requestId, supplier_id: supplierId, supplier_name: supplier.name, manager_action: "supplier_progress_note" },
  })
  revalidatePath(`/owner/materials/requests/${requestId}`)
  return { ok: true as const }
}
