"use server"

import { revalidatePath } from "next/cache"

import { requireAdminProfile } from "@/lib/auth"
import type { ManagerCatalogAddOns } from "@/lib/manager-add-ons"
import type { ShopQualificationSettings } from "@/lib/shop-qualification"
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
  revalidatePath("/preview-admin/vendors")
  return { ok: true }
}

export async function deleteProjectQuestionAction(questionIdValue: string): Promise<ManagerResult> {
  const { supabase } = await requireAdminProfile()
  const { error } = await supabase.from("project_questions").delete().eq("id", questionIdValue)
  if (error) return { ok: false, error: "Could not remove the project question." }
  revalidatePath("/preview-admin/vendors")
  return { ok: true }
}

export async function updateSupplierPackageAction(input: { packageId: string; status: "approved" | "cancelled" }): Promise<ManagerResult> {
  const { supabase, user } = await requireAdminProfile()
  const patch = input.status === "approved" ? { status: "approved", approved_by: user.id, approved_at: new Date().toISOString() } : { status: "cancelled" }
  const { error } = await supabase.from("supplier_packages").update(patch).eq("id", input.packageId).eq("status", "pending_approval")
  if (error) return { ok: false, error: "Could not update the supplier package." }
  revalidatePath("/preview-admin/vendors")
  return { ok: true }
}

export async function returnRequestToDraftAction(requestId: string): Promise<ManagerResult> {
  const { supabase } = await requireAdminProfile()
  const { error } = await supabase.from("quote_requests").update({ status: "draft", submitted_at: null }).eq("id", requestId).in("status", ["submitted", "in_review"])
  if (error) return { ok: false, error: "Could not return the request to Draft." }
  revalidatePath("/preview-admin/vendors")
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
  revalidatePath("/preview-admin/vendors")
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
  revalidatePath("/preview-admin/vendors")
  revalidatePath("/projects")
  return { ok: true }
}
