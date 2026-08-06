import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import type { MaterialQuestion, MaterialQuestionnaireCategory, MaterialQuestionOption } from "@/lib/material-questionnaires"

type CategoryRow = Omit<MaterialQuestionnaireCategory, "questions"> & {
  material_questions?: Array<Omit<MaterialQuestion, "options"> & { material_question_options?: MaterialQuestionOption[] }>
}

const CATEGORY_SELECT = `
  id, name, slug, department_key, description, is_active, sort_order, current_version, settings,
  material_questions (
    id, category_id, question_key, label, help_text, placeholder, question_type, unit,
    is_required, is_active, sort_order, allow_other, conditional_parent_question_id,
    conditional_operator, conditional_value, configuration,
    material_question_options (id, question_id, label, value, is_active, sort_order)
  )
`

function normalizeCategory(row: CategoryRow): MaterialQuestionnaireCategory {
  return {
    ...row,
    questions: (row.material_questions ?? [])
      .map((question) => ({
        ...question,
        options: (question.material_question_options ?? []).sort((a, b) => a.sort_order - b.sort_order),
      }))
      .sort((a, b) => a.sort_order - b.sort_order),
  }
}

export async function loadMaterialQuestionnaireCategories(supabase: SupabaseClient, includeInactive = false) {
  let query = supabase.from("material_questionnaire_categories").select(CATEGORY_SELECT).order("sort_order")
  if (!includeInactive) query = query.eq("is_active", true)
  const { data, error } = await query.returns<CategoryRow[]>()
  if (error) throw new Error(`Could not load material order questions: ${error.message}`)
  return (data ?? []).map(normalizeCategory)
}

export async function loadMaterialQuestionnaireForDepartment(supabase: SupabaseClient, departmentKey: string) {
  const { data, error } = await supabase
    .from("material_questionnaire_categories")
    .select(CATEGORY_SELECT)
    .eq("department_key", departmentKey)
    .eq("is_active", true)
    .maybeSingle<CategoryRow>()
  if (error) throw new Error(`Could not load material questions: ${error.message}`)
  return data ? normalizeCategory(data) : null
}
