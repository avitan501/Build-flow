"use server"

import { randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"

import { sendManagerClientReplyEmail } from "@/lib/cart-submission-email"
import { requireStaffProfile } from "@/lib/auth"
import { scheduleClientMaterialListOrganization } from "@/lib/material-request-organization"
import { buildProjectUploadStoragePath, PROJECT_UPLOAD_ALLOWED_MIME_TYPES, PROJECT_UPLOAD_MAX_FILE_SIZE_BYTES } from "@/lib/projects"
import { generateRequestClientQuotePdf, type RequestClientDocumentType, type RequestClientQuoteLine } from "@/lib/request-client-quote-pdf"
import { AVANTIA_PAYMENT_LINK } from "@/lib/payment-link"
import { hasPersistedReceiptProof } from "@/lib/request-workflow-state"
import { PRODUCTION_SITE_ORIGIN } from "@/lib/site-url"
import type { SupplierRoutingOption } from "@/lib/shop-qualification"
import { canonicalSupplierId, canonicalSupplierKey, findCanonicalSupplier, uniqueCanonicalSupplierNames } from "@/lib/supplier-canonical"
import { createAdminClient } from "@/lib/supabase/admin"

type ReplyResult = { ok: true; providerId: string | null } | { ok: false; error: string }
type QuoteResult = { ok: true; providerId: string | null; pdfBase64?: string; fileName?: string; shareUrl?: string } | { ok: false; error: string }
type DeliveryScheduleResult = { ok: true } | { ok: false; error: string }
export type MaterialRequestStatus = "submitted" | "in_review" | "quoted" | "closed"
export type MaterialRequestAssignee = "carlos" | "david"
export type ExistingRequestUploadInput = { storagePath: string; filename: string; type: string; size: number }

export type RequestSupplierPlanInput = {
  requestId: string
  suppliers: Array<{ supplierId: string; isRecommended: boolean; shouldContact: boolean }>
}

const MATERIAL_REQUEST_STATUSES = new Set<MaterialRequestStatus>(["submitted", "in_review", "quoted", "closed"])
const MATERIAL_REQUEST_ASSIGNEES = new Set<MaterialRequestAssignee>(["carlos", "david"])

export async function addRequestAttachmentsAction(input: { requestId: string; attachments: ExistingRequestUploadInput[] }) {
  const requestId = String(input.requestId || "").trim()
  const attachments = Array.isArray(input.attachments) ? input.attachments : []
  if (!/^[0-9a-f-]{36}$/i.test(requestId)) return { ok: false as const, error: "Request not found." }
  if (!attachments.length || attachments.length > 10) return { ok: false as const, error: "Choose between 1 and 10 files." }
  const allowedTypes = new Set<string>(PROJECT_UPLOAD_ALLOWED_MIME_TYPES)
  const invalid = attachments.find((attachment) => !attachment.storagePath.startsWith("public-intake/") || attachment.storagePath.includes("..") || !attachment.filename.trim() || !allowedTypes.has(attachment.type) || !Number.isFinite(attachment.size) || attachment.size <= 0 || attachment.size > PROJECT_UPLOAD_MAX_FILE_SIZE_BYTES)
  if (invalid) return { ok: false as const, error: "One of the selected files is invalid. Remove it and try again." }

  const { supabase } = await requireStaffProfile("customers")
  const { data: request } = await supabase.from("quote_requests").select("id,project_id,owner_id").eq("id", requestId).maybeSingle<{ id: string; project_id: string; owner_id: string }>()
  if (!request?.project_id || !request.owner_id) return { ok: false as const, error: "Request not found." }
  const admin = createAdminClient()
  const storedPaths: string[] = []
  try {
    for (const attachment of attachments) {
      const { data: fileInfo, error: infoError } = await admin.storage.from("project-uploads").info(attachment.storagePath)
      if (infoError || !fileInfo || fileInfo.size !== attachment.size || fileInfo.contentType !== attachment.type) throw new Error("attachment_verification_failed")
      const finalPath = buildProjectUploadStoragePath({ ownerId: request.owner_id, projectId: request.project_id, uploadId: randomUUID(), fileName: attachment.filename })
      const { error: moveError } = await admin.storage.from("project-uploads").move(attachment.storagePath, finalPath)
      if (moveError) throw new Error("attachment_move_failed")
      storedPaths.push(finalPath)
      const { error: recordError } = await admin.from("quote_request_attachments").insert({ request_id: request.id, project_id: request.project_id, owner_id: request.owner_id, file_name: attachment.filename.trim().slice(0, 180), file_path: finalPath, file_type: attachment.type, file_size: attachment.size })
      if (recordError) throw new Error("attachment_record_failed")
    }
  } catch (cause) {
    if (storedPaths.length) {
      await admin.from("quote_request_attachments").delete().eq("request_id", requestId).in("file_path", storedPaths)
      await admin.storage.from("project-uploads").remove(storedPaths)
    }
    console.error("Existing request attachment storage failed", cause)
    return { ok: false as const, error: "The files could not be attached. Please try again." }
  }
  await scheduleClientMaterialListOrganization({ requestId, force: true })
  revalidatePath(`/owner/materials/requests/${requestId}`)
  return { ok: true as const, organizationStatus: "scheduled" as const }
}

export async function saveRequestSupplierPlanAction(input: RequestSupplierPlanInput) {
  const requestId = String(input.requestId || "").trim()
  if (!/^[0-9a-f-]{36}$/i.test(requestId)) return { ok: false as const, error: "Request not found." }
  if (!Array.isArray(input.suppliers) || input.suppliers.length > 250) return { ok: false as const, error: "Choose fewer suppliers." }

  const { supabase, user } = await requireStaffProfile("customers")
  const [{ data: request }, { data: supplierData }] = await Promise.all([
    supabase.from("quote_requests").select("id").eq("id", requestId).maybeSingle<{ id: string }>(),
    supabase.rpc("staff_load_catalog_suppliers"),
  ])
  if (!request) return { ok: false as const, error: "Request not found." }
  const directory = Array.isArray(supplierData) ? supplierData as Array<{ id?: string; name?: string }> : []
  const supplierById = new Map(directory.filter((entry) => entry?.id && entry?.name).map((entry) => [String(entry.id), String(entry.name)]))
  const rows = input.suppliers
    .map((entry) => ({ supplierId: String(entry.supplierId || "").trim(), isRecommended: Boolean(entry.isRecommended), shouldContact: Boolean(entry.shouldContact) }))
    .filter((entry, index, all) => supplierById.has(entry.supplierId) && all.findIndex((candidate) => candidate.supplierId === entry.supplierId) === index)

  const selectedIds = rows.map((row) => row.supplierId)
  let removeQuery = supabase.from("quote_request_supplier_recommendations").delete().eq("request_id", requestId)
  if (selectedIds.length) removeQuery = removeQuery.not("supplier_id", "in", `(${selectedIds.map((id) => `"${id.replaceAll('"', '')}"`).join(",")})`)
  const removeResult = await removeQuery
  if (removeResult.error) return { ok: false as const, error: "The supplier plan could not be updated." }
  if (rows.length) {
    const result = await supabase.from("quote_request_supplier_recommendations").upsert(rows.map((row) => ({
      request_id: requestId,
      supplier_id: row.supplierId,
      supplier_name_snapshot: supplierById.get(row.supplierId)!,
      is_recommended: row.isRecommended || row.shouldContact,
      should_contact: row.shouldContact,
      updated_by: user.id,
      created_by: user.id,
      updated_at: new Date().toISOString(),
    })), { onConflict: "request_id,supplier_id" })
    if (result.error) return { ok: false as const, error: "The supplier choices could not be saved." }
  }
  revalidatePath(`/owner/materials/requests/${requestId}`)
  return { ok: true as const }
}

export async function saveRequestManagerNotesAction(input: { requestId: string; managerNotes: string; version?: number }) {
  const requestId = String(input.requestId || "").trim()
  const managerNotes = String(input.managerNotes || "").trim().slice(0, 5000)
  const version = Number.isSafeInteger(input.version) && Number(input.version) >= 0 ? Number(input.version) : 0
  if (!/^[0-9a-f-]{36}$/i.test(requestId)) return { ok: false as const, error: "Request not found.", version }
  const { supabase } = await requireStaffProfile("customers")
  const { data, error } = await supabase.from("quote_requests").update({ manager_notes: managerNotes, updated_at: new Date().toISOString() }).eq("id", requestId).select("id").maybeSingle<{ id: string }>()
  if (error || !data) return { ok: false as const, error: "The request notes could not be saved.", version }
  revalidatePath(`/owner/materials/requests/${requestId}`)
  return { ok: true as const, version }
}

export async function updateSmsRequestDraftAction(formData: FormData) {
  const id = String(formData.get("draftId") || "").trim()
  const intent = String(formData.get("intent") || "save")
  const customerName = String(formData.get("customerName") || "").trim().replace(/\s+/g, " ").slice(0, 160)
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Text request draft not found.")
  const { supabase } = await requireStaffProfile("customers")
  if (intent === "dismiss") {
    const { error } = await supabase.from("aura_sms_request_drafts").update({ status: "dismissed" }).eq("id", id).eq("status", "new")
    if (error) throw new Error("The text request could not be dismissed.")
  } else {
    if (!customerName) throw new Error("Enter a customer name or keep the phone number.")
    const { error } = await supabase.from("aura_sms_request_drafts").update({ customer_name: customerName }).eq("id", id).eq("status", "new")
    if (error) throw new Error("The customer name could not be saved.")
  }
  revalidatePath("/owner/materials/requests")
}

export async function convertSmsRequestDraftAction(formData: FormData) {
  const id = String(formData.get("draftId") || "").trim()
  const customerId = String(formData.get("customerId") || "").trim()
  if (!/^[0-9a-f-]{36}$/i.test(id) || !/^[0-9a-f-]{36}$/i.test(customerId)) throw new Error("Choose a customer for this text request.")
  await requireStaffProfile("customers")
  throw new Error("Send the latest summary to the customer and wait for their YES. The confirmed SMS flow creates the request safely.")
}

export type RequestClientQuoteInput = {
  documentType?: RequestClientDocumentType
  requestId: string
  quoteNumber: string
  issueDate: string
  expiresOn: string
  clientAddress: string
  shipTo: string
  message: string
  lines: RequestClientQuoteLine[]
  deliveryCharge: number
  salesTaxRate: number
  taxableDelivery?: boolean
  terms: string
  ach?: { bankName: string; accountOwner: string; routingNumber: string; accountNumber: string }
}

const ALLOWED_ATTACHMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
])

export async function updateMaterialRequestStatusAction(input: { requestId: string; status: MaterialRequestStatus }) {
  const requestId = String(input.requestId || "").trim()
  const status = String(input.status || "") as MaterialRequestStatus
  if (!/^[0-9a-f-]{36}$/i.test(requestId) || !MATERIAL_REQUEST_STATUSES.has(status)) return { ok: false as const, error: "Choose a valid request status." }

  const { supabase } = await requireStaffProfile("customers")
  const { data: request } = await supabase
    .from("quote_requests")
    .select("id,owner_id,project_id,status")
    .eq("id", requestId)
    .maybeSingle<{ id: string; owner_id: string; project_id: string; status: string }>()
  if (!request) return { ok: false as const, error: "Request not found." }
  if (request.status === status) return { ok: true as const }

  const { data: updated, error: updateError } = await supabase.from("quote_requests").update({ status }).eq("id", requestId).select("id").maybeSingle<{ id: string }>()
  if (updateError || !updated) return { ok: false as const, error: "The request status could not be changed." }

  const labels: Record<MaterialRequestStatus, string> = { submitted: "New", in_review: "In progress", quoted: "Payment received", closed: "Archived" }
  const { error: eventError } = await supabase.from("project_events").insert({
    project_id: request.project_id,
    owner_id: request.owner_id,
    event_type: "status_changed",
    source: "admin",
    title: `Material request marked ${labels[status]}`,
    description: `Manager changed the request from ${request.status.replaceAll("_", " ")} to ${labels[status].toLowerCase()}.`,
    metadata: { quote_request_id: request.id, manager_action: "request_status", previous_status: request.status, request_status: status },
  })
  if (eventError) {
    await supabase.from("quote_requests").update({ status: request.status }).eq("id", requestId)
    return { ok: false as const, error: "The status was not changed because its history could not be saved." }
  }

  revalidatePath("/owner/materials/requests")
  revalidatePath(`/owner/materials/requests/${requestId}`)
  revalidatePath("/admin/build-map")
  revalidatePath("/admin/users")
  revalidatePath("/admin/supplier-quotes")
  return { ok: true as const }
}

export async function updateMaterialRequestAssigneeAction(input: { requestId: string; assignee: MaterialRequestAssignee }) {
  const requestId = String(input.requestId || "").trim()
  const assignee = String(input.assignee || "").toLowerCase() as MaterialRequestAssignee
  if (!/^[0-9a-f-]{36}$/i.test(requestId) || !MATERIAL_REQUEST_ASSIGNEES.has(assignee)) return { ok: false as const, error: "Choose Carlos or David." }

  const { supabase } = await requireStaffProfile("customers")
  const { data: request } = await supabase.from("quote_requests").select("id,owner_id,project_id,manager_assignee").eq("id", requestId).maybeSingle<{ id: string; owner_id: string; project_id: string; manager_assignee: string }>()
  if (!request) return { ok: false as const, error: "Request not found." }
  if (request.manager_assignee === assignee) return { ok: true as const }

  const { data: updated, error: updateError } = await supabase.from("quote_requests").update({ manager_assignee: assignee }).eq("id", requestId).select("id").maybeSingle<{ id: string }>()
  if (updateError || !updated) return { ok: false as const, error: "The assignment could not be changed." }

  const name = assignee === "david" ? "David" : "Carlos"
  const { error: eventError } = await supabase.from("project_events").insert({
    project_id: request.project_id,
    owner_id: request.owner_id,
    event_type: "status_changed",
    source: "admin",
    title: `Material request assigned to ${name}`,
    description: `Manager assigned this material request to ${name}.`,
    metadata: { quote_request_id: request.id, manager_action: "request_assignee", previous_assignee: request.manager_assignee, request_assignee: assignee },
  })
  if (eventError) {
    await supabase.from("quote_requests").update({ manager_assignee: request.manager_assignee }).eq("id", requestId)
    return { ok: false as const, error: "The assignment was not changed because its history could not be saved." }
  }

  revalidatePath("/owner/materials/requests")
  revalidatePath(`/owner/materials/requests/${requestId}`)
  revalidatePath("/admin/build-map")
  return { ok: true as const }
}

export async function organizeClientMaterialRequestAction(formData: FormData) {
  const requestId = String(formData.get("requestId") || "").trim()
  const force = formData.get("force") === "true"
  if (!/^[0-9a-f-]{36}$/i.test(requestId)) return { ok: false as const, error: "This request could not be identified." }
  const { supabase } = await requireStaffProfile("customers")
  const { data: request } = await supabase.from("quote_requests").select("id").eq("id", requestId).maybeSingle<{ id: string }>()
  if (!request) return { ok: false as const, error: "This request was not found." }
  const queued = await scheduleClientMaterialListOrganization({ requestId, force })
  if (queued.status === "invalid") return { ok: false as const, error: "This request could not be identified." }
  revalidatePath(`/owner/materials/requests/${requestId}`)
  revalidatePath("/admin/supplier-quotes")
  return { ok: true as const, status: queued.status, itemCount: 0, reviewCount: 0 }
}

export async function updateOrganizedMaterialItemAction(formData: FormData) {
  const requestId = String(formData.get("requestId") || "").trim()
  const itemId = String(formData.get("itemId") || "").trim()
  const name = String(formData.get("name") || "").trim().replace(/\s+/g, " ").slice(0, 300)
  const quantity = Number(formData.get("quantity"))
  const unit = String(formData.get("unit") || "").trim().replace(/\s+/g, " ").slice(0, 60)
  const dimensions = String(formData.get("dimensions") || "").trim().replace(/\s+/g, " ").slice(0, 300)
  const thickness = String(formData.get("thickness") || "").trim().replace(/\s+/g, " ").slice(0, 160)
  const productType = String(formData.get("productType") || "").trim().replace(/\s+/g, " ").slice(0, 160)
  const screwLength = String(formData.get("screwLength") || "").trim().replace(/\s+/g, " ").slice(0, 80)
  const details = String(formData.get("details") || "").trim().replace(/\s+/g, " ").slice(0, 1200)
  const markReady = formData.get("markReady") === "true"
  if (!/^[0-9a-f-]{36}$/i.test(requestId) || !/^[0-9a-f-]{36}$/i.test(itemId)) return { ok: false as const, error: "This item could not be identified." }
  if (!name || !Number.isFinite(quantity) || quantity <= 0 || !unit) return { ok: false as const, error: "Enter the item, quantity, and unit." }

  const { supabase, user } = await requireStaffProfile("customers")
  const { data: item } = await supabase
    .from("quote_request_items")
    .select("id,metadata")
    .eq("id", itemId)
    .eq("request_id", requestId)
    .maybeSingle<{ id: string; metadata: Record<string, unknown> | null }>()
  if (!item || item.metadata?.ai_organized !== true) return { ok: false as const, error: "Only the organized material copy can be changed here." }

  const metadata = {
    ...(item.metadata ?? {}),
    dimensions,
    thickness,
    product_type: productType,
    screw_length: screwLength,
    request_details: details,
    manually_reviewed_at: new Date().toISOString(),
    manually_reviewed_by: user.id,
    ...(markReady ? { review_status: "ready", review_reasons: [], needs_review: false } : {}),
  }
  const { error } = await supabase
    .from("quote_request_items")
    .update({ name, quantity, unit, metadata, qualification_status: markReady ? "not_required" : "pending" })
    .eq("id", itemId)
    .eq("request_id", requestId)
  if (error) return { ok: false as const, error: "The item could not be saved. Please try again." }
  revalidatePath(`/owner/materials/requests/${requestId}`)
  return { ok: true as const }
}

export async function saveOriginalMaterialItemAction(input: {
  requestId: string
  itemId?: string
  name: string
  quantity: number
  unit: string
  details?: string
  version?: number
}) {
  const requestId = String(input.requestId || "").trim()
  const itemId = String(input.itemId || "").trim()
  const name = String(input.name || "").trim().replace(/\s+/g, " ").slice(0, 300)
  const quantity = Number(input.quantity)
  const unit = String(input.unit || "").trim().replace(/\s+/g, " ").slice(0, 60)
  const details = String(input.details || "").trim().replace(/\s+/g, " ").slice(0, 1200)
  const version = Number.isSafeInteger(input.version) && Number(input.version) >= 0 ? Number(input.version) : 0
  if (!/^[0-9a-f-]{36}$/i.test(requestId) || (itemId && !/^[0-9a-f-]{36}$/i.test(itemId))) return { ok: false as const, error: "This request item could not be identified.", version }
  if (!name || !Number.isFinite(quantity) || quantity <= 0 || !unit) return { ok: false as const, error: "Enter the item, quantity, and unit.", version }

  const { supabase, user } = await requireStaffProfile("customers")
  const { data: request } = await supabase.from("quote_requests").select("id,project_id,owner_id").eq("id", requestId).maybeSingle<{ id: string; project_id: string; owner_id: string }>()
  if (!request) return { ok: false as const, error: "Request not found.", version }

  if (itemId) {
    const { data: current } = await supabase.from("quote_request_items").select("id,metadata").eq("id", itemId).eq("request_id", requestId).maybeSingle<{ id: string; metadata: Record<string, unknown> | null }>()
    if (!current || current.metadata?.ai_organized === true) return { ok: false as const, error: "Only the original request can be edited here.", version }
    const { error } = await supabase.from("quote_request_items").update({ name, quantity, unit, metadata: { ...(current.metadata ?? {}), request_details: details, manually_edited_at: new Date().toISOString(), manually_edited_by: user.id } }).eq("id", itemId).eq("request_id", requestId)
    if (error) return { ok: false as const, error: "The original item could not be saved.", version }
  } else {
    const { error } = await supabase.from("quote_request_items").insert({
      request_id: request.id,
      project_id: request.project_id,
      owner_id: request.owner_id,
      name,
      department: "Others",
      item_type: "custom_priced",
      quantity,
      unit,
      qualification_status: "not_required",
      metadata: { request_details: details, manually_added_at: new Date().toISOString(), manually_added_by: user.id },
    })
    if (error) return { ok: false as const, error: "The new item could not be added.", version }
  }
  revalidatePath(`/owner/materials/requests/${requestId}`)
  return { ok: true as const, version }
}

export async function saveRequestItemSupplierRouteAction(input: {
  requestId: string
  itemIds: string[]
  supplierNames: string[]
  supplierNotes?: Record<string, string>
  version?: number
}) {
  const requestId = String(input.requestId || "").trim()
  const itemIds = Array.isArray(input.itemIds) ? [...new Set(input.itemIds.map((id) => String(id).trim()))].slice(0, 100) : []
  const requestedSupplierNames = Array.isArray(input.supplierNames) ? uniqueCanonicalSupplierNames(input.supplierNames) : []
  const version = Number.isSafeInteger(input.version) && Number(input.version) >= 0 ? Number(input.version) : 0
  if (JSON.stringify(requestedSupplierNames).length > 50_000) return { ok: false as const, error: "The supplier route is too large to save at once.", version }
  const rawNotes = input.supplierNotes && typeof input.supplierNotes === "object" && !Array.isArray(input.supplierNotes) ? input.supplierNotes : {}
  const notesByCanonicalKey = new Map<string, string>(Object.entries(rawNotes).map(([name, note]) => [canonicalSupplierKey(name), String(note || "").trim().slice(0, 800)] as const).filter(([key, note]) => Boolean(key && note)))
  if (!/^[0-9a-f-]{36}$/i.test(requestId) || !itemIds.length || itemIds.some((id) => !/^[0-9a-f-]{36}$/i.test(id))) return { ok: false as const, error: "Choose at least one valid request item.", version }
  const { supabase, user } = await requireStaffProfile("customers")
  const [{ data: items }, { data: supplierData }] = await Promise.all([
    supabase.from("quote_request_items").select("id,metadata").eq("request_id", requestId).in("id", itemIds).returns<Array<{ id: string; metadata: Record<string, unknown> | null }>>(),
    supabase.rpc("staff_load_catalog_suppliers"),
  ])
  if (!items || items.length !== itemIds.length) return { ok: false as const, error: "One of the selected items is no longer available.", version }
  const directory = Array.isArray(supplierData) ? supplierData as SupplierRoutingOption[] : []
  const routeSuppliers: SupplierRoutingOption[] = []
  for (const requestedName of requestedSupplierNames) {
    let supplier = findCanonicalSupplier(directory, { name: requestedName })
    if (!supplier) {
      const draft: SupplierRoutingOption = {
        id: canonicalSupplierId(requestedName),
        name: requestedName,
        contactLabel: "Supplier contact",
        contactName: "",
        email: "",
        phone: "",
        whatsapp: "",
        portalUrl: "",
        preferredDeliveryMethod: "manual",
        contactMethods: ["manual"],
        additionalContacts: [],
        relationshipUpdates: [],
        deliveryNotes: "Added from a material request supplier route. Confirm contact and delivery details before sending.",
        deliveryCharge: null,
        deliveryChargeNote: "",
        notes: "",
        programChannels: [],
        trustLevel: "first-time",
        catalogDepartments: [],
        catalogEnabledDepartments: [],
        address: "",
        materials: "",
      }
      const { data: persisted, error: supplierError } = await supabase.rpc("staff_upsert_supplier_directory_entry", {
        p_supplier: draft,
        p_create: true,
      })
      if (supplierError || !persisted) {
        return { ok: false as const, error: `Could not add ${requestedName} to the Supplier Directory. Open the directory and confirm this supplier first.`, version }
      }
      supplier = persisted as SupplierRoutingOption
      directory.push(supplier)
    }
    routeSuppliers.push(supplier)
  }
  const supplierNames = routeSuppliers.map((supplier) => supplier.name)
  const supplierNotes = Object.fromEntries(routeSuppliers.map((supplier) => [supplier.name, notesByCanonicalKey.get(canonicalSupplierKey(supplier.name)) || ""]).filter(([, note]) => Boolean(note)))
  const supplierRouteEntries = routeSuppliers.map((supplier) => ({ supplier_id: supplier.id, name: supplier.name }))
  const { error } = await supabase.rpc("staff_save_request_item_supplier_routes", {
    p_request_id: requestId,
    p_item_ids: itemIds,
    p_supplier_names: supplierNames,
    p_supplier_route_entries: supplierRouteEntries,
    p_supplier_notes: supplierNotes,
    p_updated_by: user.id,
  })
  if (error) return { ok: false as const, error: "The supplier route could not be saved for every selected item.", version }
  revalidatePath(`/owner/materials/requests/${requestId}`)
  revalidatePath("/admin/vendors")
  revalidatePath("/admin/supplier-network")
  return { ok: true as const, version }
}

export async function sendClientReplyAction(formData: FormData): Promise<ReplyResult> {
  const requestId = String(formData.get("requestId") || "").trim()
  const message = String(formData.get("message") || "").trim()
  if (!message) return { ok: false, error: "Write a message before sending." }
  if (message.length > 10_000) return { ok: false, error: "The message is too long." }

  const attachmentValue = formData.get("attachment")
  const attachment = attachmentValue instanceof File && attachmentValue.size > 0 ? attachmentValue : null
  if (attachment && attachment.size > 10 * 1024 * 1024) return { ok: false, error: "Keep the attachment under 10 MB." }
  if (attachment && !ALLOWED_ATTACHMENT_TYPES.has(attachment.type)) return { ok: false, error: "Attach a PDF, image, Word document, or Excel file." }

  const { supabase } = await requireStaffProfile("customers")
  const { data: request } = await supabase
    .from("quote_requests")
    .select("id,title,owner_id,project_id")
    .eq("id", requestId)
    .maybeSingle<{ id: string; title: string; owner_id: string; project_id: string }>()
  if (!request) return { ok: false, error: "Request not found." }

  const { data: client } = await supabase
    .from("profiles")
    .select("full_name,email")
    .eq("id", request.owner_id)
    .maybeSingle<{ full_name: string | null; email: string | null }>()
  if (!client?.email) return { ok: false, error: "This client does not have an email address." }

  const [{ data: requestItems }, { data: questionnaireResponses }] = await Promise.all([
    supabase
      .from("quote_request_items")
      .select("name,quantity,unit,answers,metadata")
      .eq("request_id", request.id)
      .order("created_at", { ascending: true })
      .returns<Array<{
        name: string
        quantity: number
        unit: string | null
        answers: Array<{ label: string; value: string }> | null
        metadata: Record<string, unknown> | null
      }>>(),
    supabase
      .from("material_questionnaire_responses")
      .select("id")
      .eq("request_id", request.id)
      .returns<Array<{ id: string }>>(),
  ])

  const responseIds = (questionnaireResponses ?? []).map((response) => response.id)
  const { data: questionnaireAnswers } = responseIds.length
    ? await supabase
        .from("material_request_answers")
        .select("response_id,question_label_snapshot,answer_display_snapshot")
        .in("response_id", responseIds)
        .order("created_at", { ascending: true })
        .returns<Array<{ response_id: string; question_label_snapshot: string; answer_display_snapshot: string }>>()
    : { data: [] as Array<{ response_id: string; question_label_snapshot: string; answer_display_snapshot: string }> }

  const questionnaireDetails = (questionnaireAnswers ?? [])
    .filter((answer) => answer.answer_display_snapshot.trim())
    .map((answer) => `${answer.question_label_snapshot}: ${answer.answer_display_snapshot}`)
  const emailItems = (requestItems ?? []).map((item, index) => {
    const requestDetails = typeof item.metadata?.request_details === "string" ? item.metadata.request_details.trim() : ""
    return {
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      details: [
        ...(index === 0 ? questionnaireDetails : []),
        ...(item.answers ?? []).filter((answer) => answer.value.trim()).map((answer) => `${answer.label}: ${answer.value}`),
        ...(requestDetails ? [requestDetails] : []),
      ],
    }
  })

  const attachmentPayload = attachment ? {
    filename: attachment.name.replace(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 180) || "attachment",
    content: Buffer.from(await attachment.arrayBuffer()).toString("base64"),
  } : undefined
  const emailInput = {
    requestId: request.id,
    requestTitle: request.title,
    recipientName: client.full_name || "Client",
    recipientEmail: client.email,
    message,
    items: emailItems,
    attachment: attachmentPayload,
  }
  const directResult = await sendManagerClientReplyEmail(emailInput)
  let sent = directResult.status === "sent"
  let providerId = directResult.status === "sent" ? directResult.providerId : null
  let deliveryError = directResult.status === "failed" ? directResult.error : "Website email is not configured."

  if (!sent && directResult.status !== "skipped") {
    const { data: fallback, error: fallbackError } = await supabase.functions.invoke<{ ok?: boolean; providerId?: string | null; error?: string }>("send-supplier-quote", {
      body: { action: "send_client_reply", requestId: request.id, message, items: emailItems, attachment: attachmentPayload },
    })
    sent = !fallbackError && Boolean(fallback?.ok)
    providerId = fallback?.providerId || null
    deliveryError = fallback?.error || fallbackError?.message || deliveryError
  }

  if (sent) {
    await supabase.from("project_events").insert({
      project_id: request.project_id,
      owner_id: request.owner_id,
      event_type: "status_changed",
      source: "admin",
      title: "Reply emailed to client",
      description: message.slice(0, 2000),
      metadata: { quote_request_id: request.id, client_action: "email_reply", attachment_name: attachment?.name || null },
    })
    return { ok: true, providerId }
  }
  if (directResult.status === "skipped") return { ok: false, error: "Email was not sent." }
  return { ok: false, error: deliveryError }
}

export async function scheduleRequestDeliveryAction(input: { requestId: string; date: string; startTime: string; durationHours: number; address: string }): Promise<DeliveryScheduleResult> {
  const requestId = String(input.requestId || "").trim()
  const date = String(input.date || "").trim()
  const startTime = String(input.startTime || "").trim()
  const durationHours = Number(input.durationHours)
  const address = String(input.address || "").trim().slice(0, 500)
  if (!/^[0-9a-f-]{36}$/i.test(requestId)) return { ok: false, error: "This request could not be identified." }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T12:00:00`))) return { ok: false, error: "Choose a delivery date." }
  const [deliveryHour, deliveryMinute] = startTime.split(":").map(Number)
  if (!/^\d{2}:\d{2}$/.test(startTime) || !Number.isInteger(deliveryHour) || deliveryHour < 0 || deliveryHour > 23 || !Number.isInteger(deliveryMinute) || deliveryMinute < 0 || deliveryMinute > 59) return { ok: false, error: "Choose when the delivery window starts." }
  if (!Number.isFinite(durationHours) || durationHours < 0.5 || durationHours > 12 || !Number.isInteger(durationHours * 2)) return { ok: false, error: "Choose a delivery window from 30 minutes to 12 hours, in half-hour increments." }
  const windowEndMinutes = deliveryHour * 60 + deliveryMinute + durationHours * 60
  if (windowEndMinutes >= 24 * 60) return { ok: false, error: "Choose a delivery window that ends before midnight." }
  const endTime = `${String(Math.floor(windowEndMinutes / 60)).padStart(2, "0")}:${String(windowEndMinutes % 60).padStart(2, "0")}`
  if (!address) return { ok: false, error: "Enter the delivery address." }

  const { supabase } = await requireStaffProfile("customers")
  const { data: request } = await supabase
    .from("quote_requests")
    .select("id,title,owner_id,project_id")
    .eq("id", requestId)
    .maybeSingle<{ id: string; title: string; owner_id: string; project_id: string }>()
  if (!request) return { ok: false, error: "Request not found." }

  const { error } = await supabase.from("project_events").insert({
    project_id: request.project_id,
    owner_id: request.owner_id,
    event_type: "status_changed",
    source: "admin",
    title: "Delivery scheduled",
    description: `${date} between ${startTime} and ${endTime} (${durationHours} hour${durationHours === 1 ? "" : "s"}) · ${address}`,
    metadata: {
      quote_request_id: request.id,
      client_action: "delivery_scheduled",
      delivery_date: date,
      delivery_time: startTime,
      delivery_window_start: startTime,
      delivery_window_end: endTime,
      delivery_window_hours: durationHours,
      delivery_address: address,
    },
  })
  if (error) return { ok: false, error: "The delivery schedule could not be saved. Please try again." }
  revalidatePath(`/owner/materials/requests/${requestId}`)
  return { ok: true }
}

export async function updateRequestWorkflowStepAction(input: { requestId: string; step: number; completed: boolean }) {
  const requestId = String(input.requestId || "").trim()
  const step = Number(input.step)
  if (!/^[0-9a-f-]{36}$/i.test(requestId) || !Number.isInteger(step) || step < 1 || step > 4 || typeof input.completed !== "boolean") {
    return { ok: false as const, error: "This workflow step could not be updated." }
  }

  const { supabase } = await requireStaffProfile("customers")
  const { data: request } = await supabase
    .from("quote_requests")
    .select("id,owner_id,project_id,status")
    .eq("id", requestId)
    .maybeSingle<{ id: string; owner_id: string; project_id: string; status: string }>()
  if (!request) return { ok: false as const, error: "Request not found." }

  if (step === 3 && input.completed) {
    const [{ data: clientEvents, error: clientEventsError }, { data: receiptDocument, error: receiptDocumentError }] = await Promise.all([
      supabase.from("project_events").select("metadata").contains("metadata", { quote_request_id: requestId }),
      supabase.from("request_client_documents").select("document_number,public_token,version").eq("request_id", requestId).eq("document_type", "receipt").maybeSingle<{ document_number: string; public_token: string; version: number }>(),
    ])
    if (clientEventsError || receiptDocumentError) return { ok: false as const, error: "Payment, receipt, and delivery proof could not be checked." }
    const actions = new Set((clientEvents ?? []).map((event) => String((event.metadata as Record<string, unknown> | null)?.client_action || "")))
    const paymentReceived = ["quoted", "closed"].includes(request.status) || actions.has("payment_received")
    const receiptSent = hasPersistedReceiptProof(
      (clientEvents ?? []).map((event) => event.metadata as Record<string, unknown> | null),
      receiptDocument ? { documentNumber: receiptDocument.document_number, publicToken: receiptDocument.public_token, version: receiptDocument.version } : null,
    )
    if (!paymentReceived || !receiptSent || !actions.has("delivery_scheduled")) {
      return { ok: false as const, error: "Finish payment, send the receipt, and schedule delivery before completing Step 3." }
    }
  }

  const { error } = await supabase.from("project_events").insert({
    project_id: request.project_id,
    owner_id: request.owner_id,
    event_type: "status_changed",
    source: "admin",
    title: input.completed ? `Step ${step} completed` : `Step ${step} reopened`,
    description: input.completed ? "Marked done by the Manager." : "Reopened by the Manager for additional work.",
    metadata: {
      quote_request_id: request.id,
      manager_action: "workflow_step_status",
      workflow_step: step,
      workflow_completed: input.completed,
    },
  })
  if (error) return { ok: false as const, error: "The workflow step could not be updated." }
  revalidatePath(`/owner/materials/requests/${requestId}`)
  return { ok: true as const }
}

async function prepareRequestClientQuote(input: RequestClientQuoteInput) {
  const { supabase, user } = await requireStaffProfile("customers")
  const requestId = String(input.requestId || "").trim()
  const quoteNumber = String(input.quoteNumber || "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 40)
  if (!requestId || quoteNumber.length < 3) return { ok: false as const, error: "Enter a valid estimate code." }
  const lines = (input.lines ?? []).map((line) => ({
    description: String(line.description || "").trim().slice(0, 500),
    quantity: Number(line.quantity),
    unit: String(line.unit || "each").trim().slice(0, 40) || "each",
    unitPrice: Number(line.unitPrice),
  })).filter((line) => line.description)
  if (!lines.length || lines.length > 100) return { ok: false as const, error: "Add between 1 and 100 estimate items." }
  if (lines.some((line) => !Number.isFinite(line.quantity) || line.quantity <= 0 || !Number.isFinite(line.unitPrice) || line.unitPrice < 0)) return { ok: false as const, error: "Check every quantity and unit price." }
  const deliveryCharge = Number(input.deliveryCharge)
  const salesTaxRate = Number(input.salesTaxRate)
  const documentType: RequestClientDocumentType = ["estimate", "invoice", "receipt"].includes(String(input.documentType)) ? input.documentType! : "estimate"
  if (!Number.isFinite(deliveryCharge) || deliveryCharge < 0 || !Number.isFinite(salesTaxRate) || salesTaxRate < 0 || salesTaxRate > 20) return { ok: false as const, error: "Check delivery and sales tax amounts." }

  const { data: request, error: requestError } = await supabase.from("quote_requests").select("id,title,owner_id,project_id,projects(address)").eq("id", requestId).maybeSingle<{ id: string; title: string; owner_id: string; project_id: string; projects: { address: string | null } | null }>()
  if (requestError || !request) return { ok: false as const, error: "Request not found." }
  const { data: client } = await supabase.from("profiles").select("full_name,email").eq("id", request.owner_id).maybeSingle<{ full_name: string | null; email: string | null }>()

  const pdfInput = {
    documentType,
    quoteNumber,
    issueDate: String(input.issueDate || "").slice(0, 30),
    expiresOn: String(input.expiresOn || "").slice(0, 30),
    clientName: client?.full_name || client?.email || "Client",
    clientAddress: String(input.clientAddress || "").trim().slice(0, 500),
    shipTo: String(input.shipTo || request.projects?.address || "").trim().slice(0, 500),
    requestTitle: request.title,
    lines,
    deliveryCharge: Math.round(deliveryCharge * 100) / 100,
    salesTaxRate: Math.round(salesTaxRate * 1000) / 1000,
    taxableDelivery: input.taxableDelivery !== false,
    terms: String(input.terms || "").trim().slice(0, 4000),
    paymentLink: documentType === "invoice" ? AVANTIA_PAYMENT_LINK : undefined,
    ach: input.ach ? {
      bankName: String(input.ach.bankName || "").trim().slice(0, 120),
      accountOwner: String(input.ach.accountOwner || "").trim().slice(0, 160),
      routingNumber: String(input.ach.routingNumber || "").replace(/\D/g, "").slice(0, 9),
      accountNumber: String(input.ach.accountNumber || "").replace(/[^0-9A-Za-z-]/g, "").slice(0, 34),
    } : undefined,
  }
  const pdf = await generateRequestClientQuotePdf(pdfInput)
  return { ok: true as const, supabase, user, request, client, pdf, quoteNumber, lines, pdfInput }
}

async function savePreparedRequestClientDocument(prepared: Awaited<ReturnType<typeof prepareRequestClientQuote>>, markSent = false) {
  if (!prepared.ok) return prepared
  const { ach: sensitiveAch, ...publicDocumentData } = prepared.pdfInput
  void sensitiveAch
  const { data, error } = await prepared.supabase.from("request_client_documents").upsert({
    request_id: prepared.request.id,
    project_id: prepared.request.project_id,
    owner_id: prepared.request.owner_id,
    document_type: prepared.pdfInput.documentType,
    document_number: prepared.quoteNumber,
    document_data: publicDocumentData,
    updated_by: prepared.user.id,
    created_by: prepared.user.id,
    updated_at: new Date().toISOString(),
    ...(markSent ? { sent_at: new Date().toISOString() } : {}),
  }, { onConflict: "request_id,document_type" }).select("public_token,document_number,version").single<{ public_token: string; document_number: string; version: number }>()
  if (error || !data?.public_token) return { ok: false as const, error: "The client document could not be saved." }
  return { ok: true as const, shareUrl: `${PRODUCTION_SITE_ORIGIN}/client-document/${data.public_token}`, publicToken: data.public_token, documentNumber: data.document_number, version: data.version }
}

export async function saveRequestClientDocumentAction(input: RequestClientQuoteInput): Promise<QuoteResult> {
  const prepared = await prepareRequestClientQuote(input)
  if (!prepared.ok) return prepared
  const saved = await savePreparedRequestClientDocument(prepared)
  if (!saved.ok) return saved
  revalidatePath(`/owner/materials/requests/${prepared.request.id}`)
  return { ok: true, providerId: null, shareUrl: saved.shareUrl }
}

export async function previewRequestClientQuoteAction(input: RequestClientQuoteInput): Promise<QuoteResult> {
  const prepared = await prepareRequestClientQuote(input)
  if (!prepared.ok) return prepared
  const label = prepared.pdfInput.documentType === "invoice" ? "Invoice" : prepared.pdfInput.documentType === "receipt" ? "Receipt" : "Estimate"
  return { ok: true, providerId: null, pdfBase64: prepared.pdf.toString("base64"), fileName: `Avantia-Build-${label}-${prepared.quoteNumber}.pdf` }
}

export async function sendRequestClientQuoteAction(input: RequestClientQuoteInput): Promise<QuoteResult> {
  const prepared = await prepareRequestClientQuote(input)
  if (!prepared.ok) return prepared
  if (!prepared.client?.email) return { ok: false, error: "This client does not have an email address." }
  const documentType = prepared.pdfInput.documentType
  const label = documentType === "invoice" ? "Invoice" : documentType === "receipt" ? "Receipt" : "Estimate"
  const fileName = `Avantia-Build-${label}-${prepared.quoteNumber}.pdf`
  const saved = await savePreparedRequestClientDocument(prepared)
  if (!saved.ok) return saved
  const baseMessage = String(input.message || `Please review the Avantia Build ${label.toLowerCase()}.`).trim().slice(0, 4600)
  const message = `${baseMessage}\n\nOpen or download the latest version: ${saved.shareUrl}`
  const emailInput = {
    requestId: prepared.request.id,
    requestTitle: `${label} ${prepared.quoteNumber}: ${prepared.request.title}`,
    recipientName: prepared.client.full_name || "Client",
    recipientEmail: prepared.client.email,
    message,
    items: prepared.lines.map((line) => ({ name: line.description, quantity: line.quantity, unit: line.unit, details: [`Unit price: $${line.unitPrice.toFixed(2)}`] })),
  }
  const direct = await sendManagerClientReplyEmail(emailInput)
  let sent = direct.status === "sent"
  let providerId = direct.status === "sent" ? direct.providerId : null
  let deliveryError = direct.status === "failed" ? direct.error : "Website email is not configured."
  if (!sent && direct.status !== "skipped") {
    const { data: fallback, error } = await prepared.supabase.functions.invoke<{ ok?: boolean; providerId?: string | null; error?: string }>("send-supplier-quote", { body: { action: "send_client_reply", requestId: prepared.request.id, message, items: emailInput.items } })
    sent = !error && Boolean(fallback?.ok)
    providerId = fallback?.providerId || null
    deliveryError = fallback?.error || error?.message || deliveryError
  }
  if (!sent) return { ok: false, error: direct.status === "skipped" ? "Email was not sent." : deliveryError }

  const { data: sentDocument, error: sentDocumentError } = await prepared.supabase
    .from("request_client_documents")
    .update({ sent_at: new Date().toISOString() })
    .eq("request_id", prepared.request.id)
    .eq("document_type", documentType)
    .select("public_token,document_number,version")
    .maybeSingle<{ public_token: string; document_number: string; version: number }>()
  if (sentDocumentError || !sentDocument) return { ok: false, error: `${label} was emailed, but its persisted sent status could not be saved.` }

  const { error: eventError } = await prepared.supabase.from("project_events").insert({
    project_id: prepared.request.project_id,
    owner_id: prepared.request.owner_id,
    event_type: "status_changed",
    source: "admin",
    title: `${label} ${prepared.quoteNumber} emailed to client`,
    description: message,
    metadata: { quote_request_id: prepared.request.id, client_action: `${documentType}_sent`, document_type: documentType, document_number: sentDocument.document_number, document_public_token: sentDocument.public_token, document_version: sentDocument.version, share_url: saved.shareUrl, delivery_channel: "email" },
  })
  if (eventError) return { ok: false, error: `${label} was emailed, but its activity history could not be saved.` }
  return { ok: true, providerId, fileName, shareUrl: saved.shareUrl }
}

export async function recordRequestClientDocumentSentAction(input: { requestId: string; documentType: RequestClientDocumentType; documentNumber: string; channel: "sms" | "whatsapp" }) {
  const requestId = String(input.requestId || "").trim()
  const documentType = String(input.documentType || "") as RequestClientDocumentType
  const documentNumber = String(input.documentNumber || "").trim().slice(0, 40)
  if (!/^[0-9a-f-]{36}$/i.test(requestId) || !["estimate", "invoice", "receipt"].includes(documentType) || !["sms", "whatsapp"].includes(input.channel) || !documentNumber) return { ok: false as const, error: "The document activity could not be saved." }
  const { supabase } = await requireStaffProfile("customers")
  const { data: request } = await supabase.from("quote_requests").select("id,owner_id,project_id").eq("id", requestId).maybeSingle<{ id: string; owner_id: string; project_id: string }>()
  if (!request) return { ok: false as const, error: "Request not found." }
  const label = documentType === "invoice" ? "Invoice" : documentType === "receipt" ? "Receipt" : "Estimate"
  let receiptProof: { document_number: string; public_token: string; version: number } | null = null
  if (documentType === "receipt") {
    const { data: savedReceipt, error: savedReceiptError } = await supabase
      .from("request_client_documents")
      .select("document_number,public_token,version")
      .eq("request_id", requestId)
      .eq("document_type", "receipt")
      .maybeSingle<{ document_number: string; public_token: string; version: number }>()
    if (savedReceiptError || !savedReceipt || savedReceipt.document_number.trim().toUpperCase() !== documentNumber.toUpperCase()) {
      return { ok: false as const, error: "Save this receipt before recording that it was sent." }
    }
    const { data: markedReceipt, error: markedReceiptError } = await supabase
      .from("request_client_documents")
      .update({ sent_at: new Date().toISOString() })
      .eq("request_id", requestId)
      .eq("document_type", "receipt")
      .select("document_number,public_token,version")
      .maybeSingle<{ document_number: string; public_token: string; version: number }>()
    if (markedReceiptError || !markedReceipt) return { ok: false as const, error: "The receipt sent status could not be saved." }
    receiptProof = markedReceipt
  }
  const { error } = await supabase.from("project_events").insert({
    project_id: request.project_id,
    owner_id: request.owner_id,
    event_type: "status_changed",
    source: "admin",
    title: `${label} ${documentNumber} sent by ${input.channel === "sms" ? "text" : "WhatsApp"}`,
    description: "The client received the live document link. Future saved edits remain available at the same link.",
    metadata: { quote_request_id: request.id, client_action: `${documentType}_sent`, document_type: documentType, document_number: receiptProof?.document_number ?? documentNumber, ...(receiptProof ? { document_public_token: receiptProof.public_token, document_version: receiptProof.version } : {}), delivery_channel: input.channel },
  })
  if (error) return { ok: false as const, error: "The document was sent, but its history could not be saved." }
  revalidatePath(`/owner/materials/requests/${requestId}`)
  return { ok: true as const }
}

export async function recordRequestClientApprovalAction(input: { requestId: string }) {
  const requestId = String(input.requestId || "").trim()
  if (!/^[0-9a-f-]{36}$/i.test(requestId)) return { ok: false as const, error: "The client approval could not be saved." }

  const { supabase } = await requireStaffProfile("customers")
  const { data: request } = await supabase.from("quote_requests").select("id,owner_id,project_id").eq("id", requestId).maybeSingle<{ id: string; owner_id: string; project_id: string }>()
  if (!request) return { ok: false as const, error: "Request not found." }

  const { data: existing, error: existingError } = await supabase
    .from("project_events")
    .select("id")
    .contains("metadata", { quote_request_id: requestId, client_action: "client_approved" })
    .limit(1)
  if (existingError) return { ok: false as const, error: "Client approval history could not be checked." }
  if (existing?.length) return { ok: true as const }

  const { error } = await supabase.from("project_events").insert({
    project_id: request.project_id,
    owner_id: request.owner_id,
    event_type: "status_changed",
    source: "admin",
    title: "Client approval recorded",
    description: "The manager confirmed that the client approved the estimate.",
    metadata: { quote_request_id: request.id, client_action: "client_approved", manager_action: "client_approval" },
  })
  if (error) return { ok: false as const, error: "Client approval could not be saved." }
  revalidatePath(`/owner/materials/requests/${requestId}`)
  return { ok: true as const }
}

export async function recordRequestPaymentLinkSentAction(input: { requestId: string; channel: "email" | "sms" | "whatsapp" }) {
  const requestId = String(input.requestId || "").trim()
  const channel = String(input.channel || "")
  if (!/^[0-9a-f-]{36}$/i.test(requestId) || !["email", "sms", "whatsapp"].includes(channel)) return { ok: false as const, error: "The payment-link activity could not be saved." }
  const { supabase } = await requireStaffProfile("customers")
  const { data: request } = await supabase.from("quote_requests").select("id,owner_id,project_id").eq("id", requestId).maybeSingle<{ id: string; owner_id: string; project_id: string }>()
  if (!request) return { ok: false as const, error: "Request not found." }
  const { error } = await supabase.from("project_events").insert({
    project_id: request.project_id,
    owner_id: request.owner_id,
    event_type: "status_changed",
    source: "admin",
    title: `Payment link sent by ${channel === "sms" ? "text" : channel}`,
    description: "The secure Avantia Build payment link was sent to the client.",
    metadata: { quote_request_id: request.id, client_action: "payment_link_sent", payment_channel: channel },
  })
  if (error) return { ok: false as const, error: "The payment link was sent, but its history could not be saved." }
  revalidatePath(`/owner/materials/requests/${requestId}`)
  return { ok: true as const }
}

export async function recordRequestPaymentReceivedAction(input: { requestId: string }) {
  const requestId = String(input.requestId || "").trim()
  if (!/^[0-9a-f-]{36}$/i.test(requestId)) return { ok: false as const, error: "The payment activity could not be saved." }

  const { supabase } = await requireStaffProfile("customers")
  const { data: request } = await supabase
    .from("quote_requests")
    .select("id,owner_id,project_id,status")
    .eq("id", requestId)
    .maybeSingle<{ id: string; owner_id: string; project_id: string; status: string }>()
  if (!request) return { ok: false as const, error: "Request not found." }

  const { data: existing, error: existingError } = await supabase
    .from("project_events")
    .select("id")
    .contains("metadata", { quote_request_id: requestId, client_action: "payment_received" })
    .limit(1)
  if (existingError) return { ok: false as const, error: "Payment history could not be checked. Try again." }

  if (!existing?.length) {
    const { error: eventError } = await supabase.from("project_events").insert({
      project_id: request.project_id,
      owner_id: request.owner_id,
      event_type: "status_changed",
      source: "admin",
      title: "Client payment received",
      description: "The manager confirmed that payment was received for this material request.",
      metadata: { quote_request_id: request.id, client_action: "payment_received", manager_action: "payment_received" },
    })
    if (eventError) return { ok: false as const, error: "Payment was not marked received because its history could not be saved." }
  }

  if (!["quoted", "closed"].includes(request.status)) {
    const { data: statusUpdated, error: statusError } = await supabase.from("quote_requests").update({ status: "quoted" }).eq("id", requestId).select("id").maybeSingle<{ id: string }>()
    if (statusError || !statusUpdated) console.error("Payment proof was saved, but the request status could not be synchronized", { requestId, statusError })
  }

  revalidatePath(`/owner/materials/requests/${requestId}`)
  revalidatePath("/owner/materials/requests")
  revalidatePath("/admin/build-map")
  return { ok: true as const }
}
