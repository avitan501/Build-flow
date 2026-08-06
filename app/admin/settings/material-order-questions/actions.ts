"use server"

import { revalidatePath } from "next/cache"

import { requireAdminProfile } from "@/lib/auth"
import { MATERIAL_QUESTION_TYPES, slugifyMaterialCategory, type MaterialConditionalOperator, type MaterialQuestionType } from "@/lib/material-questionnaires"

type AdminResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string }

function refreshSettings() {
  revalidatePath("/admin/settings")
  revalidatePath("/admin/settings/material-order-questions")
}

function cleanText(value: string | null | undefined, max = 500) {
  return (value ?? "").trim().slice(0, max)
}

export async function createMaterialCategoryAction(input: { name: string; departmentKey: string }): Promise<AdminResult<{ id: string }>> {
  const { supabase } = await requireAdminProfile()
  const name = cleanText(input.name, 120)
  const departmentKey = cleanText(input.departmentKey, 120)
  if (!name || !departmentKey) return { ok: false, error: "Category name and department are required." }

  const { data, error } = await supabase
    .from("material_questionnaire_categories")
    .insert({ name, slug: `${slugifyMaterialCategory(name)}-${crypto.randomUUID().slice(0, 6)}`, department_key: departmentKey, sort_order: 999 })
    .select("id")
    .single<{ id: string }>()
  if (error || !data) return { ok: false, error: error?.message.includes("department_key") ? "That department already has a questionnaire." : "Could not create the category." }
  refreshSettings()
  return { ok: true, data }
}

export async function updateMaterialCategoryAction(input: {
  id: string
  name: string
  departmentKey: string
  description: string
  isActive: boolean
}): Promise<AdminResult> {
  const { supabase } = await requireAdminProfile()
  const { data: category } = await supabase.from("material_questionnaire_categories").select("current_version").eq("id", input.id).maybeSingle<{ current_version: number }>()
  if (!category) return { ok: false, error: "Category not found." }
  const name = cleanText(input.name, 120)
  if (!name) return { ok: false, error: "Category name is required." }
  const { error } = await supabase.from("material_questionnaire_categories").update({
    name,
    department_key: cleanText(input.departmentKey, 120),
    description: cleanText(input.description, 1000),
    is_active: input.isActive,
    current_version: category.current_version + 1,
  }).eq("id", input.id)
  if (error) return { ok: false, error: error.message.includes("department_key") ? "That department already has a questionnaire." : "Could not save the category." }
  refreshSettings()
  return { ok: true, data: undefined }
}

export async function createMaterialQuestionAction(categoryId: string): Promise<AdminResult<{ id: string }>> {
  const { supabase } = await requireAdminProfile()
  const { data: last } = await supabase.from("material_questions").select("sort_order").eq("category_id", categoryId).order("sort_order", { ascending: false }).limit(1).maybeSingle<{ sort_order: number }>()
  const id = crypto.randomUUID()
  const { error } = await supabase.from("material_questions").insert({
    id,
    category_id: categoryId,
    question_key: `question-${id.slice(0, 8)}`,
    label: "New question",
    question_type: "single_select",
    sort_order: (last?.sort_order ?? 0) + 10,
  })
  if (error) return { ok: false, error: "Could not add the question." }
  refreshSettings()
  return { ok: true, data: { id } }
}

export async function updateMaterialQuestionAction(input: {
  id: string
  label: string
  helpText: string
  placeholder: string
  questionType: MaterialQuestionType
  unit: string
  isRequired: boolean
  isActive: boolean
  allowOther: boolean
  parentQuestionId: string
  conditionalOperator: MaterialConditionalOperator | ""
  conditionalValue: string
  quantityUnits: string
  allowNotes: boolean
}): Promise<AdminResult> {
  const { supabase } = await requireAdminProfile()
  const label = cleanText(input.label, 500)
  if (!label) return { ok: false, error: "Question label is required." }
  if (!MATERIAL_QUESTION_TYPES.includes(input.questionType)) return { ok: false, error: "Choose a valid question type." }
  const parentId = input.parentQuestionId || null
  if (parentId === input.id) return { ok: false, error: "A question cannot depend on itself." }
  const configuration = {
    ...(input.questionType === "quantity" ? { units: input.quantityUnits.split(",").map((unit) => unit.trim()).filter(Boolean).slice(0, 12) } : {}),
    ...(input.allowNotes ? { allowNotes: true } : {}),
  }
  const { error } = await supabase.from("material_questions").update({
    label,
    help_text: cleanText(input.helpText, 1000),
    placeholder: cleanText(input.placeholder, 500),
    question_type: input.questionType,
    unit: cleanText(input.unit, 40) || null,
    is_required: input.isRequired,
    is_active: input.isActive,
    allow_other: input.allowOther,
    conditional_parent_question_id: parentId,
    conditional_operator: parentId ? input.conditionalOperator || "equals" : null,
    conditional_value: parentId ? input.conditionalValue.trim() : null,
    configuration,
  }).eq("id", input.id)
  if (error) return { ok: false, error: "Could not save this question." }
  refreshSettings()
  return { ok: true, data: undefined }
}

export async function deleteMaterialQuestionAction(id: string): Promise<AdminResult> {
  const { supabase } = await requireAdminProfile()
  const { error } = await supabase.from("material_questions").delete().eq("id", id)
  if (error) return { ok: false, error: "Could not delete the question." }
  refreshSettings()
  return { ok: true, data: undefined }
}

export async function moveMaterialQuestionAction(input: { id: string; categoryId: string; direction: "up" | "down" }): Promise<AdminResult> {
  const { supabase } = await requireAdminProfile()
  const { data } = await supabase.from("material_questions").select("id, sort_order").eq("category_id", input.categoryId).order("sort_order").returns<Array<{ id: string; sort_order: number }>>()
  const rows = data ?? []
  const index = rows.findIndex((row) => row.id === input.id)
  const swapIndex = input.direction === "up" ? index - 1 : index + 1
  if (index < 0 || swapIndex < 0 || swapIndex >= rows.length) return { ok: true, data: undefined }
  const [current, swap] = [rows[index], rows[swapIndex]]
  const first = await supabase.from("material_questions").update({ sort_order: swap.sort_order }).eq("id", current.id)
  const second = await supabase.from("material_questions").update({ sort_order: current.sort_order }).eq("id", swap.id)
  if (first.error || second.error) return { ok: false, error: "Could not reorder the questions." }
  refreshSettings()
  return { ok: true, data: undefined }
}

export async function createMaterialOptionAction(questionId: string): Promise<AdminResult<{ id: string }>> {
  const { supabase } = await requireAdminProfile()
  const { data: last } = await supabase.from("material_question_options").select("sort_order").eq("question_id", questionId).order("sort_order", { ascending: false }).limit(1).maybeSingle<{ sort_order: number }>()
  const id = crypto.randomUUID()
  const { error } = await supabase.from("material_question_options").insert({ id, question_id: questionId, label: "New option", value: `option-${id.slice(0, 8)}`, sort_order: (last?.sort_order ?? 0) + 10 })
  if (error) return { ok: false, error: "Could not add the option." }
  refreshSettings()
  return { ok: true, data: { id } }
}

export async function updateMaterialOptionAction(input: { id: string; label: string; value: string; isActive: boolean }): Promise<AdminResult> {
  const { supabase } = await requireAdminProfile()
  const label = cleanText(input.label, 200)
  const value = slugifyMaterialCategory(input.value || label)
  if (!label || !value) return { ok: false, error: "Option label and value are required." }
  const { error } = await supabase.from("material_question_options").update({ label, value, is_active: input.isActive }).eq("id", input.id)
  if (error) return { ok: false, error: error.message.includes("unique") ? "Option values must be unique." : "Could not save the option." }
  refreshSettings()
  return { ok: true, data: undefined }
}

export async function deleteMaterialOptionAction(id: string): Promise<AdminResult> {
  const { supabase } = await requireAdminProfile()
  const { error } = await supabase.from("material_question_options").delete().eq("id", id)
  if (error) return { ok: false, error: "Could not delete the option." }
  refreshSettings()
  return { ok: true, data: undefined }
}

export async function moveMaterialOptionAction(input: { id: string; questionId: string; direction: "up" | "down" }): Promise<AdminResult> {
  const { supabase } = await requireAdminProfile()
  const { data } = await supabase.from("material_question_options").select("id, sort_order").eq("question_id", input.questionId).order("sort_order").returns<Array<{ id: string; sort_order: number }>>()
  const rows = data ?? []
  const index = rows.findIndex((row) => row.id === input.id)
  const swapIndex = input.direction === "up" ? index - 1 : index + 1
  if (index < 0 || swapIndex < 0 || swapIndex >= rows.length) return { ok: true, data: undefined }
  const [current, swap] = [rows[index], rows[swapIndex]]
  const first = await supabase.from("material_question_options").update({ sort_order: swap.sort_order }).eq("id", current.id)
  const second = await supabase.from("material_question_options").update({ sort_order: current.sort_order }).eq("id", swap.id)
  if (first.error || second.error) return { ok: false, error: "Could not reorder the options." }
  refreshSettings()
  return { ok: true, data: undefined }
}
