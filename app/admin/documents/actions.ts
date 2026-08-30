"use server"

import { createHash } from "node:crypto"

import { revalidatePath } from "next/cache"

import { requireStaffProfile } from "@/lib/auth"
import {
  catalogLineFailureMessage,
  reviewedDocumentCatalogDepartment,
  reviewedDocumentPriceRow,
  type CatalogSourceLine,
} from "@/lib/manager-document-catalog"
import { extractManagerDocument, type ManagerDocumentAiInvoker } from "@/lib/manager-document-intelligence"
import { MANAGER_DOCUMENT_BUCKET, type ManagerDocumentItemRecord, type ManagerDocumentRecord } from "@/lib/manager-documents"
import { normalizeMaterialCatalogDepartment, type CatalogSupplier } from "@/lib/material-catalog"
import { detectSupplierMatch, inferSupplierName } from "@/lib/supplier-quote-supplier"
import { SUPPLIER_QUOTE_BUCKET } from "@/lib/supplier-quotes"

type Result<T> = { ok: true; data: T; message: string } | { ok: false; error: string }
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ALLOWED_TYPES = new Set(["application/pdf", "text/csv", "text/plain", "image/jpeg", "image/png", "image/webp"])
const MAX_FILE_SIZE = 25 * 1024 * 1024
const INTAKE_DEPARTMENT = "Test"

type StaffSupabase = Awaited<ReturnType<typeof requireStaffProfile>>["supabase"]

function managerDocumentAiInvoker(supabase: StaffSupabase): ManagerDocumentAiInvoker {
  return async (input) => {
    const { data, error } = await supabase.functions.invoke("manager-document-ocr", { body: input })
    if (error) throw error
    return data
  }
}

async function runDocumentExtraction(supabase: StaffSupabase, file: File, rawText: string) {
  try {
    const edgeResult = await extractManagerDocument(file, rawText, managerDocumentAiInvoker(supabase))
    if (edgeResult) return edgeResult
  } catch (error) {
    console.error("Protected document AI service unavailable", error)
  }
  try { return await extractManagerDocument(file, rawText) } catch (error) {
    console.error("Document AI server fallback unavailable", error)
    return null
  }
}

function clean(value: unknown, max: number) { return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max) }
function cleanFileName(value: string) { return value.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(-180) || "document" }
function importedSupplierId(name: string) { const slug = name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120); return `document-${slug || "supplier"}-${crypto.randomUUID().slice(0, 8)}` }
function catalogItemKey(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() }

async function readableText(file: File, browserOcrText: string) {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    try {
      const { extractText, getDocumentProxy } = await import("unpdf")
      const pdf = await getDocumentProxy(new Uint8Array(await file.arrayBuffer()))
      try { return (await extractText(pdf, { mergePages: true })).text.slice(0, 250_000) } finally { await pdf.loadingTask?.destroy() }
    } catch (error) { console.error("Document text layer extraction failed", error) }
  }
  if (file.type === "text/csv" || file.type === "text/plain" || /\.(csv|txt)$/i.test(file.name)) return (await file.text()).slice(0, 250_000)
  return browserOcrText.slice(0, 250_000)
}

export async function uploadManagerDocumentAction(formData: FormData): Promise<Result<{ documentId: string }>> {
  const { supabase, user } = await requireStaffProfile("suppliers")
  const file = formData.get("documentFile")
  if (!(file instanceof File) || !file.size) return { ok: false, error: "Choose a document." }
  if (file.size > MAX_FILE_SIZE) return { ok: false, error: "The document must be 25 MB or smaller." }
  if (!ALLOWED_TYPES.has(file.type)) return { ok: false, error: "Use a PDF, CSV, TXT, JPG, PNG, or WEBP file." }

  const bytes = Buffer.from(await file.arrayBuffer())
  const sourceSha256 = createHash("sha256").update(bytes).digest("hex")
  const duplicate = await supabase.from("manager_documents").select("id,status").eq("source_sha256", sourceSha256).neq("status", "archived").order("created_at", { ascending: false }).limit(1).maybeSingle<{ id: string; status: string }>()
  if (duplicate.data) {
    if (duplicate.data.status === "error") {
      const retry = await retryManagerDocumentExtractionAction(duplicate.data.id, true)
      return { ok: true, data: { documentId: duplicate.data.id }, message: retry.ok ? "The saved original was re-read with AI. Opened the refreshed review." : "The original is safe in Documents. Open it and use Re-read with AI." }
    }
    return { ok: true, data: { documentId: duplicate.data.id }, message: "This exact document is already in Documents. Opened the saved copy instead of creating a duplicate." }
  }

  const documentId = crypto.randomUUID()
  const filePath = `${user.id}/${documentId}/${cleanFileName(file.name)}`
  const { error: storageError } = await supabase.storage.from(MANAGER_DOCUMENT_BUCKET).upload(filePath, bytes, { contentType: file.type, upsert: false })
  if (storageError) { console.error("Manager document upload failed", storageError); return { ok: false, error: "The original document could not be stored. Try again." } }

  const intent = clean(formData.get("intent"), 40)
  const allowedSources = new Set(["website_upload", "email", "whatsapp", "sms", "camera", "project", "other"])
  const requestedSource = clean(formData.get("sourceChannel"), 40)
  const sourceChannel = allowedSources.has(requestedSource) ? requestedSource : "website_upload"
  const sourceLabel = clean(formData.get("sourceLabel"), 200) || "Website upload"
  const sourceReference = clean(formData.get("sourceReference"), 500)
  const sourceGroupId = clean(formData.get("sourceGroupId"), 200)
  const department = INTAKE_DEPARTMENT
  const { error: insertError } = await supabase.from("manager_documents").insert({
    id: documentId, status: "processing", title: file.name.replace(/\.[^.]+$/, "").slice(0, 240), department,
    storage_bucket: MANAGER_DOCUMENT_BUCKET, file_name: file.name.slice(0, 255), file_path: filePath, mime_type: file.type,
    file_size: file.size, source_sha256: sourceSha256, extraction_note: "Original document saved privately. AI classification is in progress.",
    suggested_actions: intent ? [intent] : [], source_channel: sourceChannel, source_label: sourceLabel,
    source_reference: sourceReference, source_group_id: sourceGroupId, created_by: user.id, updated_by: user.id,
  })
  if (insertError) {
    await supabase.storage.from(MANAGER_DOCUMENT_BUCKET).remove([filePath])
    console.error("Manager document record creation failed", insertError)
    return { ok: false, error: "The file uploaded, but its document record could not be created." }
  }
  await supabase.from("manager_document_events").insert({ document_id: documentId, event_type: "uploaded", summary: "Original document saved privately.", created_by: user.id })

  let extraction = null
  let rawText = ""
  try {
    rawText = await readableText(file, String(formData.get("browserOcrText") ?? ""))
    extraction = await runDocumentExtraction(supabase, file, rawText)
  } catch (error) { console.error("Manager document AI extraction failed", error) }

  if (!extraction) {
    const note = "The original document is safe. AI could not classify it yet; use Re-read with AI. Nothing was sent to another part of Avantia."
    await supabase.from("manager_documents").update({ status: "error", raw_text: rawText, extraction_note: note, warnings: ["Automatic reading did not finish."], updated_by: user.id }).eq("id", documentId)
    await supabase.from("manager_document_events").insert({ document_id: documentId, event_type: "error", summary: "AI reading did not finish; original retained.", created_by: user.id })
    revalidatePath("/admin/documents")
    return { ok: true, data: { documentId }, message: note }
  }

  const lowConfidence = extraction.classificationConfidence < 0.85 || extraction.items.some((item) => item.validationStatus !== "valid") || extraction.warnings.length > 0
  const extractionNote = `${extraction.items.length} line item${extraction.items.length === 1 ? "" : "s"} found. Review the highlighted evidence and totals before choosing a destination.`
  const { error: updateError } = await supabase.from("manager_documents").update({
    document_type: extraction.documentType, status: "needs_review", title: extraction.title || file.name.replace(/\.[^.]+$/, "").slice(0, 240),
    party_name: extraction.partyName, document_number: extraction.documentNumber, document_date: extraction.documentDate || null,
    due_date: extraction.dueDate || null, expires_on: extraction.expiresOn || null, department,
    suggested_department: normalizeMaterialCatalogDepartment(extraction.department),
    currency: extraction.currency, subtotal: extraction.subtotal, discount: extraction.discount, delivery_charge: extraction.deliveryCharge,
    tax_amount: extraction.taxAmount, tax_percent: extraction.taxPercent, total: extraction.total, raw_text: rawText,
    classification_confidence: extraction.classificationConfidence, extraction_note: extractionNote,
    evidence: extraction.evidence, warnings: extraction.warnings, suggested_actions: extraction.suggestedActions,
    updated_by: user.id,
  }).eq("id", documentId)
  if (updateError) console.error("Manager document extraction update failed", updateError)
  if (extraction.items.length) {
    const { error: itemError } = await supabase.from("manager_document_items").insert(extraction.items.map((item, index) => ({
      document_id: documentId, line_number: index + 1, item_code: item.itemCode, description: item.description,
      specification: item.specification, quantity: item.quantity, unit: item.unit, unit_price: item.unitPrice,
      line_total: item.lineTotal, source_page: item.page, source_text: item.sourceText, confidence: item.confidence,
      validation_status: item.validationStatus, selected: true,
    })))
    if (itemError) console.error("Manager document item creation failed", itemError)
  }
  await supabase.from("manager_document_events").insert({ document_id: documentId, event_type: "extracted", summary: lowConfidence ? "AI extraction completed with review flags." : "AI extraction completed; human approval still required.", details: { item_count: extraction.items.length, warning_count: extraction.warnings.length }, created_by: user.id })
  revalidatePath("/admin/documents")
  return { ok: true, data: { documentId }, message: extractionNote }
}

export async function approveManagerDocumentAction(documentId: string): Promise<Result<{ approved: true }>> {
  const { supabase, user } = await requireStaffProfile("suppliers")
  if (!UUID_PATTERN.test(documentId)) return { ok: false, error: "Invalid document." }
  const { data: document } = await supabase.from("manager_documents").select("id,status,warnings,department,document_type").eq("id", documentId).maybeSingle<{ id: string; status: string; warnings: string[]; department: string; document_type: ManagerDocumentRecord["document_type"] }>()
  if (!document) return { ok: false, error: "Document not found." }
  if (document.department === INTAKE_DEPARTMENT) return { ok: false, error: "Choose and save the correct department before approving this document." }
  const { data: items } = await supabase.from("manager_document_items").select("validation_status").eq("document_id", documentId).eq("selected", true).returns<Array<{ validation_status: string }>>()
  const requiresItem = ["supplier_quote", "supplier_invoice", "receipt", "catalog_price_list", "purchase_order"].includes(document.document_type)
  if (requiresItem && !(items ?? []).length) return { ok: false, error: "Select at least one dependable supplier item before approving this document." }
  if ((document.warnings ?? []).length || (items ?? []).some((item) => item.validation_status !== "valid")) return { ok: false, error: "Clear the warning and review flags before approving this document." }
  const now = new Date().toISOString()
  const { error } = await supabase.from("manager_documents").update({ status: "ready", approved_by: user.id, approved_at: now, updated_by: user.id }).eq("id", documentId)
  if (error) return { ok: false, error: "The document could not be approved." }
  await supabase.from("manager_document_events").insert({ document_id: documentId, event_type: "reviewed", summary: "Document approved after human review.", created_by: user.id })
  revalidatePath(`/admin/documents/${documentId}`); revalidatePath("/admin/documents")
  return { ok: true, data: { approved: true }, message: "Document approved. It is ready for a destination." }
}

type ReviewItemInput = {
  id: string
  description: string
  itemCode: string
  specification: string
  quantity: number | null
  unit: string
  unitPrice: number | null
  lineTotal: number | null
  selected: boolean
}

export async function saveManagerDocumentReviewAction(input: {
  documentId: string
  documentType: ManagerDocumentRecord["document_type"]
  title: string
  partyName: string
  documentNumber: string
  documentDate: string
  dueDate: string
  expiresOn: string
  department: string
  subtotal: number | null
  discount: number
  deliveryCharge: number
  taxAmount: number | null
  taxPercent: number | null
  total: number | null
  acknowledgeWarnings: boolean
  evidence: ManagerDocumentRecord["evidence"]
  items: ReviewItemInput[]
}): Promise<Result<{ warningCount: number }>> {
  const { supabase, user } = await requireStaffProfile("suppliers")
  if (!UUID_PATTERN.test(input.documentId)) return { ok: false, error: "Invalid document." }
  if (!Array.isArray(input.items) || input.items.length > 500) return { ok: false, error: "Review no more than 500 lines at once." }
  const nonNegative = (value: number | null | undefined, decimals: number) => value === null || value === undefined ? null : Number.isFinite(Number(value)) && Number(value) >= 0 ? Math.round(Number(value) * 10 ** decimals) / 10 ** decimals : null
  const money = (value: number | null | undefined) => nonNegative(value, 2)
  const subtotal = money(input.subtotal)
  const discount = money(input.discount) ?? 0
  const deliveryCharge = money(input.deliveryCharge) ?? 0
  const taxAmount = money(input.taxAmount)
  const taxPercent = nonNegative(input.taxPercent, 4)
  const total = money(input.total)
  const requiresPricing = ["supplier_quote", "supplier_invoice", "receipt", "catalog_price_list", "client_estimate", "purchase_order"].includes(input.documentType)
  const reviewedItems = input.items.map((item) => {
    const quantity = nonNegative(item.quantity, 3)
    const unitPrice = nonNegative(item.unitPrice, 4)
    const lineTotal = money(item.lineTotal)
    const expected = quantity !== null && unitPrice !== null ? Math.round(quantity * unitPrice * 100) / 100 : null
    const mismatch = expected !== null && lineTotal !== null && Math.abs(expected - lineTotal) > 0.03
    const incomplete = item.selected && (!clean(item.description, 500) || quantity === null || !clean(item.unit, 40) || (requiresPricing && (unitPrice === null || lineTotal === null)))
    return { ...item, description: clean(item.description, 500), itemCode: clean(item.itemCode, 120), specification: clean(item.specification, 1000), quantity, unit: clean(item.unit, 40), unitPrice, lineTotal, validationStatus: mismatch ? "mismatch" : incomplete ? "needs_review" : "valid" }
  })
  if (reviewedItems.some((item) => item.selected && !item.description)) return { ok: false, error: "Every selected line needs a description." }
  const warnings: string[] = []
  const selectedLineTotal = reviewedItems.reduce<number | null>((sum, item) => !item.selected || item.lineTotal === null ? sum : (sum ?? 0) + item.lineTotal, null)
  if (selectedLineTotal !== null && subtotal !== null && Math.abs(selectedLineTotal - subtotal) > 0.03) warnings.push(`Selected lines add to $${selectedLineTotal.toFixed(2)}, but subtotal is $${subtotal.toFixed(2)}.`)
  const expectedTotal = subtotal !== null && taxAmount !== null ? Math.round((subtotal - discount + deliveryCharge + taxAmount) * 100) / 100 : null
  if (expectedTotal !== null && total !== null && Math.abs(expectedTotal - total) > 0.03) warnings.push(`The reviewed amounts calculate to $${expectedTotal.toFixed(2)}, but total is $${total.toFixed(2)}.`)
  if (reviewedItems.some((item) => item.selected && item.validationStatus === "mismatch")) warnings.push("One or more line totals do not equal quantity × unit price.")
  if (reviewedItems.some((item) => item.selected && item.validationStatus === "needs_review")) warnings.push(requiresPricing ? "One or more selected lines still need quantity, unit, unit price, or line total." : "One or more selected lines still need a description, quantity, or unit.")
  if (!input.acknowledgeWarnings) {
    const { data: document } = await supabase.from("manager_documents").select("warnings").eq("id", input.documentId).maybeSingle<{ warnings: string[] }>()
    warnings.unshift(...(document?.warnings ?? []))
  }
  const uniqueWarnings = [...new Set(warnings)]
  const { error: documentError } = await supabase.from("manager_documents").update({
    document_type: input.documentType, title: clean(input.title, 240), party_name: clean(input.partyName, 200),
    document_number: clean(input.documentNumber, 100), document_date: /^\d{4}-\d{2}-\d{2}$/.test(input.documentDate) ? input.documentDate : null,
    due_date: /^\d{4}-\d{2}-\d{2}$/.test(input.dueDate) ? input.dueDate : null, expires_on: /^\d{4}-\d{2}-\d{2}$/.test(input.expiresOn) ? input.expiresOn : null,
    department: normalizeMaterialCatalogDepartment(input.department), subtotal, discount, delivery_charge: deliveryCharge,
    tax_amount: taxAmount, tax_percent: taxPercent === null ? null : Math.min(100, taxPercent), total,
    status: "needs_review", warnings: uniqueWarnings,
    evidence: input.evidence.slice(0, 200).map((entry) => ({ field: clean(entry.field, 100), value: clean(entry.value, 500), page: entry.page && entry.page > 0 ? Math.floor(entry.page) : null, sourceText: clean(entry.sourceText, 1000), confidence: Math.max(0, Math.min(1, Number(entry.confidence) || 0)), selected: entry.selected !== false })),
    extraction_note: "Human review saved. Approve only after all highlighted values and totals are correct.",
    approved_by: null, approved_at: null, updated_by: user.id,
  }).eq("id", input.documentId)
  if (documentError) return { ok: false, error: "The document review could not be saved." }
  for (const item of reviewedItems) {
    if (!UUID_PATTERN.test(item.id)) continue
    const { error } = await supabase.from("manager_document_items").update({ item_code: item.itemCode, description: item.description, specification: item.specification, quantity: item.quantity, unit: item.unit, unit_price: item.unitPrice, line_total: item.lineTotal, selected: item.selected, validation_status: item.validationStatus }).eq("id", item.id).eq("document_id", input.documentId)
    if (error) return { ok: false, error: "The document header was saved, but one line could not be updated." }
  }
  await supabase.from("manager_document_events").insert({ document_id: input.documentId, event_type: "reviewed", summary: uniqueWarnings.length ? `Human review saved with ${uniqueWarnings.length} warning${uniqueWarnings.length === 1 ? "" : "s"}.` : "Human review saved with no remaining calculation warnings.", created_by: user.id })
  revalidatePath(`/admin/documents/${input.documentId}`); revalidatePath("/admin/documents")
  return { ok: true, data: { warningCount: uniqueWarnings.length }, message: uniqueWarnings.length ? "Review saved. Resolve the remaining warning before approval." : "Review saved. The document is ready for approval." }
}

export async function retryManagerDocumentExtractionAction(documentId: string, replaceExisting = false): Promise<Result<{ itemCount: number }>> {
  const { supabase, user } = await requireStaffProfile("suppliers")
  if (!UUID_PATTERN.test(documentId)) return { ok: false, error: "Invalid document." }
  const { data: document } = await supabase.from("manager_documents").select("*").eq("id", documentId).maybeSingle<ManagerDocumentRecord>()
  if (!document) return { ok: false, error: "Document not found." }
  const { data: previousItems } = await supabase.from("manager_document_items").select("*").eq("document_id", documentId).order("line_number").returns<ManagerDocumentItemRecord[]>()
  if (previousItems?.length && !replaceExisting) return { ok: false, error: "This document already has reviewed lines. Confirm replacement before re-reading with AI." }
  const { data: blob, error: downloadError } = await supabase.storage.from(document.storage_bucket).download(document.file_path)
  if (downloadError || !blob) return { ok: false, error: "The saved original could not be opened." }
  const file = new File([blob], document.file_name, { type: document.mime_type })
  let extraction
  try { extraction = await runDocumentExtraction(supabase, file, document.raw_text) } catch (error) { console.error("Document retry failed", error); extraction = null }
  if (!extraction) return { ok: false, error: "AI could not finish reading it yet. The original is still safe." }
  const { error: deleteError } = await supabase.from("manager_document_items").delete().eq("document_id", documentId)
  if (deleteError) return { ok: false, error: "The current review could not be preserved for replacement." }
  if (extraction.items.length) {
    const { error: replacementError } = await supabase.from("manager_document_items").insert(extraction.items.map((item, index) => ({ document_id: documentId, line_number: index + 1, item_code: item.itemCode, description: item.description, specification: item.specification, quantity: item.quantity, unit: item.unit, unit_price: item.unitPrice, line_total: item.lineTotal, source_page: item.page, source_text: item.sourceText, confidence: item.confidence, validation_status: item.validationStatus, selected: true })))
    if (replacementError) {
      console.error("Document AI line replacement failed", replacementError)
      if (previousItems?.length) await supabase.from("manager_document_items").insert(previousItems.map((item) => ({ document_id: documentId, line_number: item.line_number, item_code: item.item_code, description: item.description, specification: item.specification, quantity: item.quantity, unit: item.unit, unit_price: item.unit_price, line_total: item.line_total, source_page: item.source_page, source_text: item.source_text, confidence: item.confidence, validation_status: item.validation_status, selected: item.selected })))
      return { ok: false, error: "The new AI reading could not replace the lines. The previous review was restored." }
    }
  }
  const { error: updateError } = await supabase.from("manager_documents").update({ document_type: extraction.documentType, status: "needs_review", title: extraction.title || document.title, party_name: extraction.partyName, document_number: extraction.documentNumber, document_date: extraction.documentDate || null, due_date: extraction.dueDate || null, expires_on: extraction.expiresOn || null, department: document.department || INTAKE_DEPARTMENT, suggested_department: normalizeMaterialCatalogDepartment(extraction.department), currency: extraction.currency, subtotal: extraction.subtotal, discount: extraction.discount, delivery_charge: extraction.deliveryCharge, tax_amount: extraction.taxAmount, tax_percent: extraction.taxPercent, total: extraction.total, classification_confidence: extraction.classificationConfidence, extraction_note: `${extraction.items.length} lines found on the latest AI read. Review before approval.`, evidence: extraction.evidence, warnings: extraction.warnings, suggested_actions: extraction.suggestedActions, approved_by: null, approved_at: null, updated_by: user.id }).eq("id", documentId)
  if (updateError) {
    await supabase.from("manager_document_items").delete().eq("document_id", documentId)
    if (previousItems?.length) await supabase.from("manager_document_items").insert(previousItems.map((item) => ({ document_id: documentId, line_number: item.line_number, item_code: item.item_code, description: item.description, specification: item.specification, quantity: item.quantity, unit: item.unit, unit_price: item.unit_price, line_total: item.line_total, source_page: item.source_page, source_text: item.source_text, confidence: item.confidence, validation_status: item.validation_status, selected: item.selected })))
    return { ok: false, error: "The new AI summary could not be saved. The previous review was restored." }
  }
  await supabase.from("manager_document_events").insert({ document_id: documentId, event_type: "extracted", summary: "Document re-read with AI.", details: { item_count: extraction.items.length }, created_by: user.id })
  revalidatePath(`/admin/documents/${documentId}`); revalidatePath("/admin/documents")
  return { ok: true, data: { itemCount: extraction.items.length }, message: "Latest AI reading is ready for review." }
}

export async function routeManagerDocumentToSupplierPricingAction(documentId: string): Promise<Result<{ quoteId: string }>> {
  const { supabase, user } = await requireStaffProfile("suppliers")
  if (!UUID_PATTERN.test(documentId)) return { ok: false, error: "Invalid document." }
  const { data: document } = await supabase.from("manager_documents").select("*").eq("id", documentId).maybeSingle<ManagerDocumentRecord>()
  if (!document) return { ok: false, error: "Document not found." }
  if (document.status !== "ready") return { ok: false, error: "Approve the reviewed document before sending it to supplier pricing." }
  if (document.legacy_supplier_quote_id) return { ok: true, data: { quoteId: document.legacy_supplier_quote_id }, message: "Supplier pricing is already linked." }
  const { data: items } = await supabase.from("manager_document_items").select("*").eq("document_id", documentId).eq("selected", true).order("line_number").returns<ManagerDocumentItemRecord[]>()
  if (!items?.length) return { ok: false, error: "Select at least one dependable product row before routing." }

  const { data: source, error: downloadError } = await supabase.storage.from(document.storage_bucket).download(document.file_path)
  if (downloadError || !source) return { ok: false, error: "The saved original could not be opened." }
  const quoteId = crypto.randomUUID()
  const quotePath = `${user.id}/${quoteId}/${cleanFileName(document.file_name)}`
  const { error: copyError } = await supabase.storage.from(SUPPLIER_QUOTE_BUCKET).upload(quotePath, source, { contentType: document.mime_type, upsert: false })
  if (copyError) return { ok: false, error: "The reviewed document could not be prepared for supplier pricing." }
  const { data: supplierRows } = await supabase.rpc("staff_load_catalog_suppliers")
  const match = detectSupplierMatch(Array.isArray(supplierRows) ? supplierRows as CatalogSupplier[] : [], document.party_name, document.raw_text)
  const supplierName = match?.name || document.party_name || inferSupplierName(document.raw_text) || "Supplier needs review"
  const { error: quoteError } = await supabase.from("supplier_quotes").insert({
    id: quoteId, supplier_id: match?.id ?? null, supplier_name: supplierName, quote_number: document.document_number,
    department: normalizeMaterialCatalogDepartment(document.department), quote_date: document.document_date, expires_on: document.expires_on,
    file_name: document.file_name, file_path: quotePath, mime_type: document.mime_type, file_size: document.file_size,
    raw_text: document.raw_text, extraction_note: "Reviewed in Documents before supplier pricing.", delivery_charge: document.delivery_charge,
    tax_percent: document.tax_percent ?? 0, notes: match ? "" : "Confirm the Supplier Directory match before catalog routing.", created_by: user.id, updated_by: user.id,
  })
  if (quoteError) { await supabase.storage.from(SUPPLIER_QUOTE_BUCKET).remove([quotePath]); return { ok: false, error: "The supplier pricing record could not be created." } }
  const { error: itemsError } = await supabase.from("supplier_quote_items").insert(items.map((item, index) => ({
    quote_id: quoteId, line_number: index + 1, item_code: item.item_code, description: item.description, specification: item.specification,
    quantity: item.quantity || 1, unit: item.unit || "each", unit_price: item.unit_price, line_total: item.line_total,
    selected: true, review_status: "ready",
  })))
  if (itemsError) { console.error("Routed supplier quote item creation failed", itemsError); return { ok: false, error: "The supplier record was created, but its rows need attention." } }
  await supabase.from("manager_documents").update({ status: "routed", legacy_supplier_quote_id: quoteId, updated_by: user.id }).eq("id", documentId)
  await supabase.from("manager_document_events").insert({ document_id: documentId, event_type: "routed", summary: "Approved rows sent to supplier pricing.", details: { supplier_quote_id: quoteId }, created_by: user.id })
  revalidatePath("/admin/documents"); revalidatePath("/admin/supplier-quotes")
  return { ok: true, data: { quoteId }, message: "Reviewed rows are ready in supplier pricing." }
}

export async function addManagerDocumentItemsToCatalogAction(documentId: string): Promise<Result<{ itemCount: number; priceCount: number; supplierName: string }>> {
  const { supabase, user } = await requireStaffProfile("suppliers")
  if (!UUID_PATTERN.test(documentId)) return { ok: false, error: "Invalid document." }
  const [{ data: document }, { data: selectedItems }, { data: supplierRows }] = await Promise.all([
    supabase.from("manager_documents").select("*").eq("id", documentId).maybeSingle<ManagerDocumentRecord>(),
    supabase.from("manager_document_items").select("*").eq("document_id", documentId).eq("selected", true).order("line_number").returns<ManagerDocumentItemRecord[]>(),
    supabase.rpc("staff_load_catalog_suppliers"),
  ])
  if (!document) return { ok: false, error: "Document not found." }
  if (!["ready", "routed"].includes(document.status)) return { ok: false, error: "Save and approve the reviewed document first." }
  const items = (selectedItems ?? []).filter((item) => item.validation_status === "valid" && item.description.trim())
  if (!items.length) return { ok: false, error: "Select at least one reviewed product row." }
  const pricedItems = items.filter((item) => item.unit_price !== null)
  if (!pricedItems.length) return { ok: false, error: "The selected rows do not have reviewed unit prices." }
  const department = reviewedDocumentCatalogDepartment(document)
  const suppliers = Array.isArray(supplierRows) ? supplierRows as CatalogSupplier[] : []
  const detectedName = document.party_name || inferSupplierName(document.raw_text)
  if (!detectedName) return { ok: false, error: "Confirm the vendor name before adding these prices." }
  const matchedSupplier = detectSupplierMatch(suppliers, detectedName, document.raw_text || detectedName)
  let supplier: CatalogSupplier | null = matchedSupplier ? suppliers.find((entry) => entry.id === matchedSupplier.id) ?? null : null
  if (!supplier) {
    const candidate: CatalogSupplier & Record<string, unknown> = {
      id: importedSupplierId(detectedName), name: clean(detectedName, 160), email: "", phone: "", whatsapp: "", portalUrl: "",
      materials: department, trustLevel: "first-time", catalogDepartments: [department], catalogEnabledDepartments: [department],
      contactLabel: "Imported document", contactName: "", preferredDeliveryMethod: "manual", deliveryNotes: "",
      notes: `Created from reviewed document ${clean(document.file_name, 180)}. Confirm contact details before outreach.`, address: "",
    }
    const { data, error } = await supabase.rpc("staff_upsert_supplier_directory_entry", { p_supplier: candidate, p_create: true })
    if (error || !data) return { ok: false, error: "The vendor could not be added to Supplier Directory." }
    supplier = data as CatalogSupplier
  } else {
    const catalogDepartments = [...new Set([...(supplier.catalogDepartments ?? []), department])]
    const catalogEnabledDepartments = [...new Set([...(supplier.catalogEnabledDepartments ?? []), department])]
    const { data, error } = await supabase.rpc("staff_upsert_supplier_directory_entry", { p_supplier: { ...supplier, catalogDepartments, catalogEnabledDepartments }, p_create: false })
    if (error || !data) return { ok: false, error: "The vendor could not be enabled for this catalog department." }
    supplier = data as CatalogSupplier
  }

  const [{ data: existingRows, error: existingError }, { data: existingSupplierPrices, error: existingPriceError }] = await Promise.all([
    supabase.from("material_catalog_items").select("id,category,name,item_code,package_quantity,comparison_quantity").returns<Array<{ id: string; category: string; name: string; item_code: string; package_quantity: number; comparison_quantity: number }>>(),
    supabase.from("material_catalog_supplier_prices").select("item_id,supplier_sku").eq("supplier_id", supplier.id).returns<Array<{ item_id: string; supplier_sku: string }>>(),
  ])
  if (existingError) return { ok: false, error: "The existing catalog could not be checked." }
  if (existingPriceError) return { ok: false, error: "The vendor's existing catalog codes could not be checked safely." }
  const byName = new Map((existingRows ?? []).filter((row) => row.category === department).map((row) => [catalogItemKey(row.name), row]))
  const rowsById = new Map((existingRows ?? []).map((row) => [row.id, row]))
  const skuCandidates = new Map<string, typeof existingRows>()
  for (const price of existingSupplierPrices ?? []) {
    const key = catalogItemKey(price.supplier_sku)
    const row = rowsById.get(price.item_id)
    if (!key || !row || row.category !== department) continue
    skuCandidates.set(key, [...(skuCandidates.get(key) ?? []), row])
  }
  const bySupplierCode = new Map([...skuCandidates].flatMap(([key, rows]) => rows?.length === 1 ? [[key, rows[0]] as const] : []))
  const usedCodes = new Set((existingRows ?? []).map((row) => catalogItemKey(row.item_code)).filter(Boolean))
  const catalogRows = new Map<string, { id: string; package_quantity: number; comparison_quantity: number }>()
  const now = new Date().toISOString()
  let createdCount = 0
  for (const item of items) {
    const existing = (item.item_code ? bySupplierCode.get(catalogItemKey(item.item_code)) : null)
      ?? byName.get(catalogItemKey(item.description))
    if (existing) { catalogRows.set(item.id, existing); continue }
    const baseCode = `DOC-${document.id.slice(0, 8).toUpperCase()}-${item.line_number}`
    let code = baseCode
    let suffix = 1
    while (usedCodes.has(catalogItemKey(code))) { suffix += 1; code = `${baseCode}-${suffix}` }
    const { data, error } = await supabase.from("material_catalog_items").insert({
      category: department, item_code: code, name: clean(item.description, 240), description: clean(item.specification, 1000),
      package_quantity: 1, package_unit: clean(item.unit, 60) || "each", comparison_quantity: 1, comparison_unit: clean(item.unit, 60) || "each",
      review_status: "needs_review", quality_notes: `Imported from reviewed source ${clean(document.file_name, 180)}.`, default_quantity: 1,
      unit: clean(item.unit, 60) || "each", status: "active", source: `Manager document: ${clean(document.file_name, 180)}`, created_by: user.id, updated_by: user.id,
    }).select("id,package_quantity,comparison_quantity").single<{ id: string; package_quantity: number; comparison_quantity: number }>()
    if (error || !data) {
      // A previous or simultaneous attempt may already have created this row.
      // Recover that safe row and continue the price/source import instead of
      // leaving an approved document in a misleading half-failed state.
      const recovered = await supabase.from("material_catalog_items")
        .select("id,package_quantity,comparison_quantity")
        .eq("category", department)
        .eq("name", clean(item.description, 240))
        .maybeSingle<{ id: string; package_quantity: number; comparison_quantity: number }>()
      if (recovered.data) {
        byName.set(catalogItemKey(item.description), { ...recovered.data, category: department, name: item.description, item_code: code })
        catalogRows.set(item.id, recovered.data)
        continue
      }
      console.error("Reviewed document catalog item creation failed", { code: error?.code, message: error?.message, department, lineNumber: item.line_number })
      return { ok: false, error: catalogLineFailureMessage({ item, step: "item", code: error?.code }) }
    }
    usedCodes.add(catalogItemKey(code))
    byName.set(catalogItemKey(item.description), { ...data, category: department, name: item.description, item_code: code })
    catalogRows.set(item.id, data); createdCount += 1
  }
  const priceCandidates = pricedItems.flatMap((item) => {
    const catalogItem = catalogRows.get(item.id)
    if (!catalogItem || item.unit_price === null) return []
    const row = reviewedDocumentPriceRow({ document, item, catalogItem, supplier: supplier!, userId: user.id, now })
    return row ? [{ row, item }] : []
  })
  const candidateGroups = new Map<string, typeof priceCandidates>()
  for (const candidate of priceCandidates) {
    const key = `${candidate.row.item_id}:${candidate.row.supplier_id}`
    candidateGroups.set(key, [...(candidateGroups.get(key) ?? []), candidate])
  }
  const selectedPrices = [...candidateGroups.values()].map((group) => {
    const lowest = group.reduce((best, candidate) => candidate.row.unit_price < best.row.unit_price ? candidate : best)
    return group.length === 1 ? lowest : {
      ...lowest,
      row: {
        ...lowest.row,
        notes: clean(`${lowest.row.notes} Lowest of ${group.length} selected quote rows for the same product.`, 1000),
      },
    }
  })
  const prices = selectedPrices.map((candidate) => candidate.row)
  let { error: priceError } = await supabase.from("material_catalog_supplier_prices").upsert(prices, { onConflict: "item_id,supplier_id" })
  let usedCompatibilitySave = false
  if (priceError) {
    console.error("Reviewed document catalog price save failed", {
      code: priceError.code,
      message: priceError.message,
      documentId,
      supplierId: supplier.id,
      priceCount: prices.length,
    })
    // Older production schemas can accept catalog prices before the dedicated
    // document-source columns are available. The source, quote number, date,
    // quantity, unit, total, page, and evidence are retained in notes, so save
    // the dependable price fields instead
    // of leaving a reviewed import half-finished.
    const compatiblePrices = prices.map(({ source_document_id, source_file_name, source_quote_number, source_document_date, source_quantity, source_unit, source_line_total, source_page, source_text, ...price }) => {
      void source_document_id; void source_file_name; void source_quote_number; void source_document_date
      void source_quantity; void source_unit; void source_line_total; void source_page; void source_text
      return price
    })
    const fallback = await supabase.from("material_catalog_supplier_prices").upsert(compatiblePrices, { onConflict: "item_id,supplier_id" })
    priceError = fallback.error
    usedCompatibilitySave = !fallback.error
  }
  if (priceError) {
    console.error("Reviewed document compatible catalog price save failed", {
      code: priceError.code,
      message: priceError.message,
      documentId,
      supplierId: supplier.id,
      priceCount: prices.length,
    })
    const failingLines: string[] = []
    for (const candidate of selectedPrices) {
      const { source_document_id, source_file_name, source_quote_number, source_document_date, source_quantity, source_unit, source_line_total, source_page, source_text, ...compatiblePrice } = candidate.row
      void source_document_id; void source_file_name; void source_quote_number; void source_document_date
      void source_quantity; void source_unit; void source_line_total; void source_page; void source_text
      const attempt = await supabase.from("material_catalog_supplier_prices").upsert(compatiblePrice, { onConflict: "item_id,supplier_id" })
      if (attempt.error) failingLines.push(catalogLineFailureMessage({ item: candidate.item as CatalogSourceLine, step: "price", code: attempt.error.code }))
    }
    if (failingLines.length) return { ok: false, error: failingLines.slice(0, 5).join(" ") }
    usedCompatibilitySave = true
  }
  await supabase.from("manager_documents").update({ status: "routed", supplier_id: supplier.id, updated_by: user.id }).eq("id", documentId)
  await supabase.from("manager_document_events").insert({ document_id: documentId, event_type: "routed", summary: `${prices.length} selected price${prices.length === 1 ? "" : "s"} added to the catalog.`, details: { destination: "catalog", supplier_id: supplier.id, created_item_count: createdCount, price_count: prices.length }, created_by: user.id })
  revalidatePath(`/admin/documents/${documentId}`); revalidatePath("/admin/documents"); revalidatePath("/admin/catalog"); revalidatePath("/admin/vendors")
  return { ok: true, data: { itemCount: items.length, priceCount: prices.length, supplierName: supplier.name }, message: `${prices.length} supplier price${prices.length === 1 ? "" : "s"} saved from ${items.length} selected quote line${items.length === 1 ? "" : "s"} for ${supplier.name}. Source and date were saved${usedCompatibilitySave ? " in the price note" : ""}.` }
}
