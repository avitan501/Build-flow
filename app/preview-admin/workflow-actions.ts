"use server"

import { revalidatePath } from "next/cache"

import { requireAdminProfile } from "@/lib/auth"
import type { ManagerCatalogAddOns } from "@/lib/manager-add-ons"
import type { ShopQualificationSettings } from "@/lib/shop-qualification"
import type { QuoteRequestStatus } from "@/lib/quote-requests"
import { createProjectEvent } from "@/lib/projects"
import { publicWorkflowState } from "@/lib/workflow-public"

type ManagerResult = { ok: true } | { ok: false; error: string }

function questionId(label: string) {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `question-${Date.now()}`
}

export async function saveProjectQuestionAction(input: {
  id?: string
  label: string
  questionType: "text" | "textarea" | "select" | "date" | "time"
  required: boolean
  active: boolean
  options: string[]
  sortOrder: number
}): Promise<ManagerResult> {
  const { supabase } = await requireAdminProfile()
  if (!input.label.trim()) return { ok: false, error: "Question label is required." }
  const { error } = await supabase.from("project_questions").upsert({
    id: input.id || questionId(input.label),
    label: input.label.trim(),
    question_type: input.questionType,
    required: input.required,
    active: input.active,
    options: input.options.map((option) => option.trim()).filter(Boolean),
    sort_order: input.sortOrder,
  })
  if (error) return { ok: false, error: "Could not save the project question." }
  revalidatePath("/admin/vendors")
  return { ok: true }
}

export async function deleteProjectQuestionAction(questionIdValue: string): Promise<ManagerResult> {
  const { supabase } = await requireAdminProfile()
  const { error } = await supabase.from("project_questions").delete().eq("id", questionIdValue)
  if (error) return { ok: false, error: "Could not remove the project question." }
  revalidatePath("/admin/vendors")
  return { ok: true }
}

export async function updateSupplierPackageAction(input: { packageId: string; status: "approved" | "cancelled" }): Promise<ManagerResult> {
  const { supabase, user } = await requireAdminProfile()
  const patch = input.status === "approved" ? { status: "approved", approved_by: user.id, approved_at: new Date().toISOString() } : { status: "cancelled" }
  const { error } = await supabase.from("supplier_packages").update(patch).eq("id", input.packageId).eq("status", "pending_approval")
  if (error) return { ok: false, error: "Could not update the supplier package." }
  revalidatePath("/admin/vendors")
  revalidatePath("/admin/supplier-approvals")
  revalidatePath(`/admin/supplier-approvals/${input.packageId}`)
  return { ok: true }
}

export async function assignSupplierPackageAction(input: { packageId: string; supplierId: string }): Promise<ManagerResult> {
  const { supabase } = await requireAdminProfile()
  const supplierId = input.supplierId.trim()
  if (!supplierId) return { ok: false, error: "Choose a supplier." }

  const { data: settings } = await supabase
    .from("workflow_manager_settings")
    .select("state")
    .eq("id", "singleton")
    .maybeSingle<{ state: { qualificationSettings?: { suppliers?: Array<{ id: string }> } } }>()
  const supplierExists = settings?.state?.qualificationSettings?.suppliers?.some((supplier) => supplier.id === supplierId)
  if (!supplierExists) return { ok: false, error: "That supplier is no longer available." }

  const { error } = await supabase
    .from("supplier_packages")
    .update({ supplier_id: supplierId, status: "pending_approval", approved_by: null, approved_at: null })
    .eq("id", input.packageId)
    .in("status", ["pending_approval", "approved"])
  if (error) return { ok: false, error: "Could not change the assigned supplier." }

  revalidatePath("/admin/supplier-approvals")
  revalidatePath(`/admin/supplier-approvals/${input.packageId}`)
  return { ok: true }
}

export async function returnSupplierPackageForInfoAction(input: { packageId: string; requestId: string }): Promise<ManagerResult> {
  const { supabase, user } = await requireAdminProfile()
  const { data: pkg, error: packageError } = await supabase
    .from("supplier_packages")
    .select("request_id,payload")
    .eq("id", input.packageId)
    .eq("request_id", input.requestId)
    .maybeSingle<{ request_id: string; payload: Record<string, unknown> }>()
  if (packageError || !pkg) return { ok: false, error: "Supplier package was not found." }

  const [{ error: requestError }, { error: updateError }] = await Promise.all([
    supabase.from("quote_requests").update({ status: "draft", submitted_at: null }).eq("id", input.requestId),
    supabase.from("supplier_packages").update({
      status: "pending_approval",
      approved_by: null,
      approved_at: null,
      payload: { ...pkg.payload, review_status: "returned_for_information", returned_at: new Date().toISOString(), returned_by: user.id },
    }).eq("id", input.packageId),
  ])
  if (requestError || updateError) return { ok: false, error: "Could not return the request for more information." }

  revalidatePath("/admin/supplier-approvals")
  revalidatePath(`/admin/supplier-approvals/${input.packageId}`)
  revalidatePath(`/projects`)
  return { ok: true }
}

export async function returnRequestToDraftAction(requestId: string): Promise<ManagerResult> {
  const { supabase } = await requireAdminProfile()
  const { error } = await supabase.from("quote_requests").update({ status: "draft", submitted_at: null }).eq("id", requestId).in("status", ["submitted", "in_review"])
  if (error) return { ok: false, error: "Could not return the request to Draft." }
  revalidatePath("/admin/vendors")
  return { ok: true }
}

export async function updateRequestStatusAction(input: { requestId: string; status: QuoteRequestStatus }): Promise<ManagerResult> {
  const { supabase } = await requireAdminProfile()
  const allowed: QuoteRequestStatus[] = ["draft", "submitted", "in_review", "quoted", "closed"]
  if (!allowed.includes(input.status)) return { ok: false, error: "Choose a valid request status." }

  const patch = {
    status: input.status,
    submitted_at: input.status === "draft" ? null : new Date().toISOString(),
  }
  const { data: request, error } = await supabase
    .from("quote_requests")
    .update(patch)
    .eq("id", input.requestId)
    .select("project_id, owner_id, title")
    .maybeSingle<{ project_id: string; owner_id: string; title: string }>()

  if (error || !request) return { ok: false, error: "Could not update the request status." }

  const statusDescriptions: Record<QuoteRequestStatus, string> = {
    draft: "Request created",
    submitted: "Request is under review",
    in_review: "Request is waiting for client approval",
    quoted: "Request completed",
    closed: "Request completed",
  }
  await createProjectEvent({
    supabase,
    projectId: request.project_id,
    ownerId: request.owner_id,
    eventType: "status_changed",
    source: "admin",
    title: `${request.title}: ${statusDescriptions[input.status]}`,
    metadata: { quote_request_id: input.requestId, request_status: input.status },
  })
  revalidatePath("/admin/vendors")
  revalidatePath("/admin/users")
  revalidatePath(`/owner/materials/requests/${input.requestId}`)
  revalidatePath(`/projects/${request.project_id}`)
  return { ok: true }
}

export async function saveWorkflowManagerSettingsAction(input: { qualificationSettings: ShopQualificationSettings; addOns: ManagerCatalogAddOns }): Promise<ManagerResult> {
  const { supabase, user } = await requireAdminProfile()
  const [{ error: managerError }, { error: publicError }] = await Promise.all([
    supabase.from("workflow_manager_settings").upsert({
      id: "singleton",
      state: input,
      updated_by: user.id,
    }),
    supabase.from("workflow_public_catalog").upsert({
      id: "singleton",
      state: publicWorkflowState(input),
      updated_by: user.id,
    }),
  ])
  if (managerError || publicError) return { ok: false, error: "Could not save the shared manager settings." }
  revalidatePath("/admin/vendors")
  revalidatePath("/shop")
  return { ok: true }
}

export async function managerUpdateProjectAction(input: { projectId: string; name?: string; status?: "draft" | "active" | "archived" }): Promise<ManagerResult> {
  const { supabase } = await requireAdminProfile()
  const patch: Record<string, string> = {}
  if (input.name !== undefined) {
    if (!input.name.trim()) return { ok: false, error: "Project name is required." }
    patch.name = input.name.trim()
  }
  if (input.status) patch.status = input.status
  const { error } = await supabase.from("projects").update(patch).eq("id", input.projectId)
  if (error) return { ok: false, error: "Could not update the client project." }
  revalidatePath("/admin/vendors")
  revalidatePath("/projects")
  return { ok: true }
}
